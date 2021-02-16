import logging
import os
import sys

import bpy

sys.path.append(os.path.dirname(__file__))
import image
from blender_async import later
from dirs import dest
from selection import select_object
logging.basicConfig(stream=sys.stderr, level=logging.DEBUG)
log = logging.getLogger()


class Bake:
    def __init__(self, obj_name='gnd', map_size=1024, on_bake_done=lambda: None):
        self.obj_name = obj_name
        self.map_size = map_size
        self.on_bake_done = on_bake_done
        # 'screen' context is not immediately ready
        later(1, self._withScreen)

    def _withScreen(self):
        log.info(f'{self.obj_name} bake start')
        bpy.context.scene.cycles.use_denoising = True
        bpy.context.scene.cycles.samples = 30

        select_object(self.obj_name)

        obj = bpy.data.objects[self.obj_name]
        slots = obj.material_slots
        if not slots:
            log.warning(f'{self.obj_name} has no mat slots')
            self.on_bake_done()
            return
        mat = slots.values()[0].material

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

        self.runs = [
            # ('COMBINED', 'comb', 'sRGB'),
            ('DIFFUSE', 'dif', 'sRGB'),
            # ('AO', 'ao', 'Non-Color'),
            ('SHADOW', 'shad', 'Non-Color'),
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
        self.img.colorspace_settings == cs

        bpy.context.scene.cycles.bake_type = bake_type
        try:
            bpy.ops.object.bake(type=bake_type, use_clear=True)
        except Exception as err:
            log.warning(err)
        else:
            image.save(self.img, dest / f'bake_{self.obj_name}_{out_name}.jpg')

        self.runs.pop(0)
        # sometimes the next bake wouldn't start
        later(.1, self.nextBake)


def async_bake(objs, cb):
    def pump():
        if not objs:
            cb()
            return
        obj = objs.pop()
        log.info(f'{len(objs)} left')
        Bake(
            obj,
            map_size=
            256 if obj != 'gnd.023' else 2048,  # maybe let a custom attr raise this sometimes, or determine it from obj size?
            on_bake_done=pump)

    pump()


def all_mesh_objects(root):
    # Need linked dups that share a mesh to be separately returned
    expanded = []

    def rec(cur):
        if cur.type == 'MESH':
            expanded.append(cur.name)
        for child in cur.children:
            rec(child)

    rec(root)
    return expanded


def main():
    bpy.ops.wm.open_mainfile(filepath=str(dest / 'edit.blend'))

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

        async_bake(to_bake, cb)

    def done():
        bpy.ops.wm.quit_blender()

    later(2, run_bakes, done)


main()
