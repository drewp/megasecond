import time
import logging
import json
import os
import sys

import numpy
import bpy
from mathutils import Vector
sys.path.append(os.path.dirname(__file__))
import image
from blender_async import later
from dirs import dest
from selection import select_object, all_mesh_objects
logging.basicConfig(stream=sys.stderr, level=logging.DEBUG)
log = logging.getLogger()


def objectBbox(obj):
    ptsObject = obj.bound_box
    ptsWorld = numpy.array([obj.matrix_world @ Vector(pt) for pt in ptsObject])
    centerWorld = numpy.average(ptsWorld, axis=0)
    centerToPts = ptsWorld - centerWorld
    radius = numpy.linalg.norm(centerToPts, axis=1).max()
    return {
        'center': [round(x, 3) for x in centerWorld],
        'radius': round(radius, 3)
    }


class Bake:
    def __init__(self,
                 obj_name,
                 outData,
                 map_size=1024,
                 on_bake_done=lambda: None):
        self.obj_name = obj_name
        self.outData = outData
        self.map_size = map_size
        self.on_bake_done = on_bake_done
        # 'screen' context is not immediately ready
        later(1, self._withScreen)

    def _withScreen(self):
        log.info(f'{self.obj_name} bake start')
        bpy.context.scene.cycles.use_denoising = True
        bpy.context.scene.cycles.samples = 30

        select_object(self.obj_name)

        self.objData = self.outData.setdefault('objs', {}).setdefault(
            self.obj_name, {})
        obj = bpy.data.objects[self.obj_name]

        self.objData['worldBbox'] = objectBbox(obj)

        slots = list(obj.material_slots)
        if len(slots) == 0:
            log.warning(f'{self.obj_name} has no mat slots')
            self.on_bake_done()
            return
        elif len(slots) == 1:
            self.objData['material'] = {'name': slots[0].material.name}
        else:
            raise NotImplementedError("separate_materials didn't work")

        mat = obj.material_slots.values()[0].material

        self.img = bpy.data.images.new('bake_out',
                                       self.map_size,
                                       self.map_size,
                                       alpha=False,
                                       is_data=True)

        nodes = mat.node_tree.nodes
        log.info(f'{self.obj_name} mat had {len(nodes)} nodes')

        tx = nodes.new('ShaderNodeTexImage')
        self.delete_node = lambda: nodes.remove(tx)
        tx.image = self.img

        tx.select = True  # bake writes to the selected node
        nodes.active = tx

        bpy.context.scene.render.engine = 'CYCLES'
        bpy.context.scene.cycles.device = 'GPU'
        bpy.context.scene.cycles.samples = 40
        bpy.context.scene.cycles.use_denoising = True

        self.runs = [
            # ('COMBINED', 'comb', 'sRGB'),
            ('DIFFUSE', 'dif', 'sRGB'),
            # ('AO', 'ao', 'Non-Color'),
            # ('SHADOW', 'shad', 'Non-Color'),
            # ('NORMAL', 'norm', 'Non-Color'),
            # ('ROUGHNESS', 'ruff', 'Non-Color'),
            # ('GLOSSY', 'glos', 'Non-Color'),
        ]

        self.nextBake()

    def nextBake(self):
        if not self.runs:
            log.info(f'{self.obj_name} bake jobs done')
            self.delete_node()

            self.on_bake_done()
            return
        self.bakeAndSave()

    def bakeAndSave(self):
        bake_type, out_name, cs = self.runs[0]
        log.info(f'{self.obj_name} start {bake_type} bake')
        self.img.colorspace_settings.name = cs

        bpy.context.scene.cycles.bake_type = bake_type
        bakeData = self.objData.setdefault('bake',
                                           {}).setdefault(bake_type, {})
        bakeData['res'] = self.img.generated_width
        bakeData['samples'] = bpy.context.scene.cycles.samples
        try:
            t1 = time.time()
            bpy.ops.object.bake(type=bake_type, use_clear=True)
            bakeData['bake_time'] = round(time.time() - t1, 2)
        except Exception as err:
            log.warning(err)
        else:
            # these should be named by content since some will be the same (dup object under 2 lights will have some of the same maps)
            t2 = time.time()
            image.save(self.img, dest / f'bake_{self.obj_name}_{out_name}.jpg')
            bakeData['save_time'] = round(time.time() - t2, 2)

        self.runs.pop(0)
        # sometimes the next bake wouldn't start
        later(.1, self.nextBake)


def async_bake(objs, outData, cb):
    def pump():
        if not objs:
            cb()
            return
        obj = objs.pop()
        log.info(f'{len(objs)+1} left')
        map_size = 256
        # maybe let a custom attr raise this sometimes, or determine it from obj size?
        if obj.startswith('gnd.'):
            map_size = 4096
        if obj in ['building_022.002']:
            map_size = 2048
        Bake(obj, outData, map_size=map_size, on_bake_done=pump)

    pump()


def main():
    bpy.ops.wm.open_mainfile(filepath=str(dest / 'edit.blend'))
    outData = {}
    try:
        with open(dest / 'world.json') as worldJsonPrev:
            outData = json.load(worldJsonPrev)
    except IOError:
        pass

    def run_bakes(cb):
        to_bake = []
        job = os.environ['EXPORT_JOB']
        for obj_name in all_mesh_objects(bpy.data.objects['env']):
            if job == 'gnd.023':
                if obj_name == 'gnd.023': to_bake.append(obj_name)
            elif job == 'other gnd':
                if obj_name != 'gnd.023': to_bake.append(obj_name)
            elif job == 'not gnd':
                if not obj_name.startswith('gnd'): to_bake.append(obj_name)
            elif job == 'debug':
                if obj_name.startswith('flag'):
                    to_bake.append(obj_name)

        async_bake(to_bake, outData, cb)

    def done():
        with open(dest / 'world.json', 'w') as worldJson:
            json.dump(outData, worldJson, indent=2, sort_keys=True)
        bpy.ops.wm.quit_blender()

    later(2, run_bakes, done)


main()