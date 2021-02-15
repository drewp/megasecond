import logging
import os
import sys

import bpy
sys.path.append(os.path.dirname(__file__))
from dirs import src, dest
import export_geom
import image

logging.basicConfig(stream=sys.stderr, level=logging.DEBUG)
log = logging.getLogger()


def later(sec, func, *args, **kw):
    bpy.app.timers.register(lambda: func(*args, **kw), first_interval=sec)


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
        bpy.context.scene.cycles.samples = 10

        bpy.ops.object.select_all(action='DESELECT')
        bpy.data.objects[self.obj_name].select_set(True)
        bpy.context.view_layer.objects.active = bpy.data.objects[self.obj_name]

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
        tx.image = self.img

        tx.select = True  # bake writes to the selected node
        nodes.active = tx

        bpy.context.scene.render.engine = 'CYCLES'
        bpy.context.scene.cycles.device = 'GPU'

        self.runs = [
            ('COMBINED', 'comb', 'sRGB'),
            ('DIFFUSE', 'dif', 'sRGB'),
            ('AO', 'ao', 'Non-Color'),
            ('SHADOW', 'shad', 'Non-Color'),
            ('NORMAL', 'norm', 'Non-Color'),
            ('ROUGHNESS', 'ruff', 'Non-Color'),
            ('GLOSSY', 'glos', 'Non-Color'),
        ]

        self.nextBake()

    def nextBake(self):
        if not self.runs:
            log.info('bake jobs done')
            self.cb()
            return
        self.bakeAndSave()

    def bakeAndSave(self):
        bake_type, out_name, cs = self.runs[0]
        log.info(f'{self.obj_name} start {bake_type} bake')
        self.img.colorspace_settings == cs

        bpy.context.scene.cycles.bake_type = bake_type

        bpy.ops.object.bake(type=bake_type, use_clear=True)

        image.save(self.img, dest / f'bake_{self.obj_name}_{out_name}.png')
        self.runs.pop(0)
        # sometimes the next bake wouldn't start
        later(0, self.nextBake)


def main():
    bpy.ops.wm.open_mainfile(filepath=str(src / 'wrap/wrap.blend'))

    export_geom.write_glb()

    objs = ['rock_arch']

    def done():
        bpy.ops.wm.quit_blender()

    def pump():
        if not objs:
            done()
            return
        Bake(objs.pop(), map_size=512, cb=pump)

    pump()


main()
