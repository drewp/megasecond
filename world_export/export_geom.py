import logging
import os
import sys

import bpy

sys.path.append(os.path.dirname(__file__))

import world_json
from dirs import src, dest
from selection import all_mesh_objects, select_object

logging.basicConfig(stream=sys.stderr, level=logging.DEBUG)
log = logging.getLogger()


def switch_to_lightmap_uvs(outData):
    for obj_name in all_mesh_objects(bpy.data.objects['env']):
        obj = select_object(obj_name)

        obj_uv = outData.setdefault('objs', {}).setdefault(obj_name, {})
        if 'lightmap_uv' in obj_uv:
            for lyr in reversed(obj.data.uv_layers):
                if lyr.name != obj_uv['lightmap_uv']:
                    log.info(f'obj={obj_name} uv={lyr.name} is not for export')
                    obj.data.uv_layers.remove(lyr)


def write_glb(glb_out, select=None, with_materials=False):

    if select:
        # gltf exporter use_selection maybe has no effect
        log.info(f'objs {len(bpy.data.objects)}')
        select_object(select)
        bpy.ops.object.select_all(action='INVERT')
        bpy.ops.object.delete(use_global=False, confirm=False)
        log.info(f'objs reduced to {len(bpy.data.objects)}')
        select = None

    # workaround for gltf export bug, from https://blender.stackexchange.com/questions/200616/script-to-export-gltf-fails-with-context-object-has-no-attribute-active-objec
    ctx = bpy.context.copy()
    ctx['active_object'] = None

    bpy.ops.export_scene.gltf(
        ctx,
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
        export_image_format='JPEG',
        export_materials='EXPORT' if with_materials else 'PLACEHOLDER',
        export_morph_normal=True,
        export_morph_tangent=False,
        export_morph=True,
        export_nla_strips=True,
        export_normals=True,
        export_skins=True,
        export_tangents=False,
        export_texcoords=True,
        export_texture_dir="",
        export_yup=True,
        use_selection=bool(select),
    )
    log.info("glb size %.1fKb" % (os.path.getsize(glb_out) / 1024))
    # now run https://github.com/zeux/meshoptimizer/tree/master/gltf


def export_blend_scene(outData, blend_path, out_glb_path, bake_mats=False, select=None):
    bpy.ops.wm.open_mainfile(filepath=str(blend_path))
    if bake_mats:
        switch_to_lightmap_uvs(outData)
    dest.mkdir(parents=True, exist_ok=True)
    write_glb(out_glb_path, select=select, with_materials=not bake_mats)


def main():
    outData = world_json.load()

    export_blend_scene(outData, dest / 'edit.blend', dest / "wrap.glb")
    export_blend_scene(outData, src / 'wrap/card.blend', dest / "obj_card.glb", bake_mats=False, select='card')

    bpy.ops.wm.quit_blender()


main()
