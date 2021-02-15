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
    def __init__(self, obj_name='gnd', map_size=1024, cb=lambda: None):
        self.obj_name = obj_name
        self.map_size = map_size
        self.cb = cb
        # 'screen' context is not immediately ready
        later(1, self._withScreen)

    def _withScreen(self):
        log.info(f'{self.obj_name} bake start')
        bpy.context.scene.cycles.use_denoising = True
        bpy.context.scene.cycles.samples = 30

        select_object(self.obj_name)

        mat = bpy.data.objects[
            self.obj_name].material_slots.values()[0].material

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
            ('AO', 'ao', 'Non-Color'),
            ('SHADOW', 'shad', 'Non-Color'),
            # ('NORMAL', 'norm', 'Non-Color'),
            ('ROUGHNESS', 'ruff', 'Non-Color'),
            # ('GLOSSY', 'glos', 'Non-Color'),
        ]

        self.nextBake()

    def nextBake(self):
        if not self.runs:
            log.info(f'{self.obj_name} bake jobs done')
            self.delete_node()

            self.cb()
            return
        self.bakeAndSave()

    def bakeAndSave(self):
        bake_type, out_name, cs = self.runs[0]
        log.info(f'{self.obj_name} start {bake_type} bake')
        self.img.colorspace_settings == cs

        bpy.context.scene.cycles.bake_type = bake_type

        bpy.ops.object.bake(type=bake_type, use_clear=True)

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
        Bake(obj, map_size=1024 if obj == 'sign' else 256, cb=pump)

    pump()


def main():
    bpy.ops.wm.open_mainfile(filepath=str(dest / 'edit.blend'))

    def done():
        bpy.ops.wm.quit_blender()

    def eg(cb):
        obj_names = ['sign', 'signpost', 'rock_arch'] + gnd_names
        job = int(os.environ['EXPORT_JOB'])
        if job == 0:
            obj_names = obj_names[:3]
        elif job == 1:
            obj_names = obj_names[3:15]
        elif job == 2:
            obj_names = obj_names[15:]
        else:
            raise NotImplementedError()

        async_bake(obj_names, cb)

    gnd_names = ['gnd'] + ['gnd.%03d' % i for i in range(1, 38 - 1) if i == 24]

    later(2, eg, done)


main()
