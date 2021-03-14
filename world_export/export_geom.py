import logging
import os
import sys

import bpy

sys.path.append(os.path.dirname(__file__))

import world_json
from dirs import src, dest
from selection import all_mesh_objects, select_object
from blender_file import writeGlb
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


def export_blend_scene(outData, blend_path, out_glb_path, bake_mats=False, select=None):
    bpy.ops.wm.open_mainfile(filepath=str(blend_path))
    if bake_mats:
        switch_to_lightmap_uvs(outData)
    dest.mkdir(parents=True, exist_ok=True)
    writeGlb(out_glb_path, select=select, with_materials=not bake_mats)


def main():
    outData = world_json.load()

    export_blend_scene(outData, dest / 'stage/env_edit.blend', dest / "serve/model/env.glb")
    export_blend_scene(outData, src / 'model/prop/card.blend', dest / "serve/model/card.glb", bake_mats=False, select='card')

    bpy.ops.wm.quit_blender()

if __name__ == '__main__':
    main()
