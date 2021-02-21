import logging
import json
import os
import sys

import bpy
sys.path.append(os.path.dirname(__file__))

from dirs import dest
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

def write_glb():
    dest.mkdir(parents=True, exist_ok=True)
    glb_out = dest / "wrap.glb"


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
        export_materials='PLACEHOLDER', # someday, PLACEHOLDER, to save 15MB+ of glb
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
    # now run https://github.com/zeux/meshoptimizer/tree/master/gltf


def main():
    outData = {}
    try:
        with open(dest / 'world.json') as worldJsonPrev:
            outData = json.load(worldJsonPrev)
    except IOError:
        pass

    bpy.ops.wm.open_mainfile(filepath=str(dest / 'edit.blend'))
    switch_to_lightmap_uvs(outData)
    write_glb()
    bpy.ops.wm.quit_blender()

main()