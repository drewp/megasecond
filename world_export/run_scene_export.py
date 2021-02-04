import logging
import os
import sys
import time
from pathlib import Path

import bpy
import numpy
from PIL import Image

logging.basicConfig(stream=sys.stderr, level=logging.DEBUG)
log = logging.getLogger()
build_out = Path("../build/client")


def later(sec, func, *args, **kw):
    bpy.app.timers.register(lambda: func(*args, **kw), first_interval=sec)


def write_glb():
    build_out.mkdir(parents=True, exist_ok=True)
    glb_out = build_out / "wrap.glb"
    bpy.ops.export_scene.gltf(
        filepath=str(glb_out),
        export_all_influences=False,
        export_animations=False,
        export_apply=True,
        export_lights=True,
        export_cameras=True,
        export_colors=True,
        export_current_frame=False,
        export_def_bones=False,
        export_displacement=False,
        export_draco_generic_quantization=12,
        export_draco_mesh_compression_enable=False,
        export_draco_mesh_compression_level=6,
        export_draco_normal_quantization=10,
        export_draco_position_quantization=14,
        export_draco_texcoord_quantization=12,
        export_extras=False,
        export_force_sampling=True,
        export_frame_range=False,
        export_frame_step=1,
        export_image_format='AUTO',
        export_materials='EXPORT',
        export_morph_normal=True,
        export_morph_tangent=False,
        export_morph=True,
        export_nla_strips=True,
        export_normals=True,
        export_selected=False,
        export_skins=True,
        export_tangents=False,
        export_texcoords=True,
        export_texture_dir="",
        export_yup=True,
        use_selection=False,
    )
    log.info("glb size %.1fKb" % (os.path.getsize(glb_out) / 1024))


class Bake:
    bake_timeout = 10
    def __init__(self, obj_name='gnd', cb=lambda: None):
        self.obj_name = obj_name
        self.cb = cb
        # 'screen' is not immediately ready
        later(1, self.cont2)

    def cont2(self):
        log.info('bake start')
        bpy.context.scene.cycles.use_denoising = True
        bpy.context.scene.cycles.samples = 10

        bpy.ops.object.select_all(action='DESELECT')
        bpy.data.objects[self.obj_name].select_set(True)
        bpy.context.view_layer.objects.active = bpy.data.objects[self.obj_name]

        mat = bpy.data.objects[
            self.obj_name].material_slots.values()[0].material

        self.img = bpy.data.images.new('bake_out',
                                       2048,
                                       2048,
                                       alpha=False,
                                       is_data=True)

        nodes = mat.node_tree.nodes
        log.info(f'mat had {len(nodes)} nodes')

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

    def markImage(self):
        self.img.pixels[0:3] = .1, .2, .3
        self.sentinel = self.img.pixels[0:3]

    def bakeAndSave(self):
        # alternately, https://blender.stackexchange.com/questions/39716/running-code-after-a-modal-operator-finished-its-job
        bake_type, out_name, cs = self.runs[0]
        log.info(f'start {bake_type} bake')
        self.img.colorspace_settings == cs
        self.markImage()

        bpy.context.scene.cycles.bake_type = bake_type
        bpy.ops.object.bake(
            'INVOKE_DEFAULT',
            type=bake_type,
            # pass_filter={
            #     'COLOR', 'INDIRECT', 'EMIT', 'DIRECT', 'TRANSMISSION', 'AO',
            #     'GLOSSY', 'DIFFUSE'
            # },
            margin=16,
            # use_selected_to_active=False,
            # # max_ray_distance=0,
            # # cage_extrusion=0,
            # # cage_object="",
            # # normal_space='TANGENT',
            # # normal_r='POS_X',
            # # normal_g='POS_Y',
            # # normal_b='POS_Z',
            target='IMAGE_TEXTURES',
            save_mode='INTERNAL',
            use_clear=True,
            # # use_cage=False,
            # # use_split_materials=False,
            # # use_automatic_name=False,
            # # uv_layer=""
        )

        def save():
            image_save(self.img,
                       build_out / f'bake_{self.obj_name}_{out_name}.png')
            self.runs.pop(0)
            # sometimes the next bake wouldn't start
            later(1, self.nextBake)

        log.info(f"waiting for bake image output for {bake_type}")
        self.startPoll = time.time()
        self.pollBakeDone(self.img, save)

    def pollBakeDone(self, img, onChanged):
        dt = time.time() - self.startPoll
        log.info(f'poll image change, {dt:.1f} sec')
        if dt > self.bake_timeout:
            log.info("too slow- retrying")
            self.bakeAndSave()
            return
        if img.pixels[0:3] != self.sentinel:
            later(3, onChanged)
            return
        later(.5, self.pollBakeDone, img, onChanged)


def image_save_builtin(img, path):
    # having blender save was turning the image back to black!
    img.filepath = str(path).replace('.png', '-builtinsave.png')
    img.file_format = "PNG"
    img.save()
    log.info(f'wrote {path}')

def image_save(img, path):
    ar = numpy.array(img.pixels).reshape((img.size[0], img.size[1], 4))
    ar = ar[::-1, :, :]
    if img.colorspace_settings.name == 'sRGB':
        ar = ar**(1 / 2.2)  # unverified
    img = Image.fromarray((ar * 255).astype(numpy.uint8))
    img.save(path)
    log.info(f'wrote {path}')
    # then use https://github.com/BinomialLLC/basis_universal
    # then bjs loads with https://doc.babylonjs.com/advanced_topics/mutliPlatTextures#basis-file-format


def main():
    bpy.ops.wm.open_mainfile(filepath='../client/asset/wrap/wrap.blend')


    objs = ['rock_arch']
    def pump():
        if not objs:
            return
        Bake(objs.pop(), pump)
    pump()
    #write_glb()
    # bpy.ops.wm.quit_blender()

    log.info("EOF")


main()
