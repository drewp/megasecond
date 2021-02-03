import logging
import os
import sys
from pathlib import Path

import bpy

logging.basicConfig(stream=sys.stderr, level=logging.DEBUG)
log = logging.getLogger()
build_out = Path("../build/client")


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


def bake(obj_name='gnd'):
    log.info('bake start')
    bpy.context.scene.cycles.use_denoising = True
    bpy.context.scene.cycles.samples = 5

    bpy.ops.object.select_all(action='DESELECT')
    bpy.data.objects[obj_name].select_set(True)
    bpy.context.view_layer.objects.active = bpy.data.objects[obj_name]

    mat = bpy.data.objects[obj_name].material_slots.values()[0].material

    img = bpy.data.images.new('bake_out', 512, 512, alpha=False, is_data=True)

    nodes = mat.node_tree.nodes
    log.info(f'mat had {len(nodes)} nodes')

    tx = nodes.new('ShaderNodeTexImage')
    tx.image = img

    tx.select = True  # bake writes to the selected node
    nodes.active = tx



    bpy.app.timers.register(lambda: bake2(obj_name, img), first_interval=1)
    # bake2(obj_name, img)


def bake2(obj_name, img):
    bpy.context.scene.render.engine = 'CYCLES'
    bpy.context.scene.cycles.device = 'GPU'
    # bpy.context.space_data.shading.type = 'RENDERED'
    # bpy.data.screens['Shading'].shading.type = 'RENDERED'
    # bpy.ops.wm.redraw_timer(type='DRAW_WIN_SWAP', iterations=1)
    bpy.ops.render.render()

    for bake_type, out_name in [
        #('COMBINED', 'combined'),
        ('DIFFUSE', 'dif'),
        ]:
        log.info(f'start {bake_type} bake')
        bpy.context.scene.cycles.bake_type = bake_type
        bpy.ops.object.bake(
            type=bake_type,
            # pass_filter={
            #     'COLOR', 'INDIRECT', 'EMIT', 'DIRECT', 'TRANSMISSION', 'AO',
            #     'GLOSSY', 'DIFFUSE'
            # },
            # # filepath="",
            # # width=512,
            # # height=512,
            # margin=16,
            # use_selected_to_active=False,
            # # max_ray_distance=0,
            # # cage_extrusion=0,
            # # cage_object="",
            # # normal_space='TANGENT',
            # # normal_r='POS_X',
            # # normal_g='POS_Y',
            # # normal_b='POS_Z',
            # target='IMAGE_TEXTURES',
            # # save_mode='INTERNAL',
            # use_clear=True,
            # # use_cage=False,
            # # use_split_materials=False,
            # # use_automatic_name=False,
            # # uv_layer=""
        )
        image_save(img, build_out / f'bake_{obj_name}_{out_name}.png')
        
    log.info('bakes done')


def image_save(img, path):
    img.filepath = str(path)
    img.file_format = "PNG"
    img.save()
    log.info(f'wrote {img.filepath}')
    # then use https://github.com/BinomialLLC/basis_universal
    # then bjs loads with https://doc.babylonjs.com/advanced_topics/mutliPlatTextures#basis-file-format

log.info("appendig")

bpy.ops.wm.open_mainfile(filepath='../client/asset/wrap/wrap.blend')

# bpy.app.timers.register(bake, first_interval=1)
bake()

#write_glb()
# bpy.ops.wm.quit_blender()

log.info("EOF")