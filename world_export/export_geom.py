import logging
import os

import bpy

from dirs import dest

log = logging.getLogger()


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
