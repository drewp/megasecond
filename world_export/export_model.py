from pathlib import Path
import logging
import os
import re
import sys
from typing import Union

import bmesh
import bpy
import numpy
from mathutils import Vector

sys.path.append(os.path.dirname(__file__))
import world_json
from dirs import dest, src
from selection import all_mesh_objects, editmode, select_object, select_objects_in_collection
from blender_file import saveScene, writeGlb
logging.basicConfig(stream=sys.stderr, level=logging.DEBUG)
log = logging.getLogger()


def separate_rect(obj_name: str, xlo: float, xhi: float, ylo: float, yhi: float) -> Union[str, None]:
    names_before = set(o.name for o in bpy.data.objects)
    select_object(obj_name)
    with editmode():
        bpy.ops.mesh.select_mode(use_extend=False, use_expand=False, type='VERT')
        bpy.ops.mesh.select_all(action='DESELECT')
        mesh = bmesh.from_edit_mesh(bpy.data.objects[obj_name].data)
        sel_verts = set()
        for i, v in enumerate(mesh.verts):
            if xlo <= v.co.x < xhi and ylo <= v.co.y < yhi:
                sel_verts.add(i)
                v.select = True
        for e in mesh.edges:
            if all(i in sel_verts for i in e.verts):
                e.select = True
        for f in mesh.faces:
            if all(i in sel_verts for i in f.verts):
                f.select = True
        mesh.select_flush(True)
        bpy.ops.mesh.separate()

    names_after = set(o.name for o in bpy.data.objects)
    new_names = names_after.difference(names_before)

    if not new_names:
        return None
    new_name = new_names.pop()

    select_object(new_name)
    with editmode():
        bpy.ops.mesh.select_mode(use_extend=False, use_expand=False, type='FACE')
        bpy.ops.mesh.select_all(action='SELECT')
        bpy.ops.uv.cube_project(
            cube_size=1, scale_to_bounds=True)  # todo needs to go to a separate uv, to not break the big ground dif texture
    return new_name


def make_lightmap_uv_layer(obj, outData):
    uvs = obj.data.uv_layers
    lightmap_uv = uvs.new()
    lightmap_uv.name = 'lightmap'
    obj_uv = outData['objs'][obj.name]
    obj_uv['lightmap_uv'] = lightmap_uv.name
    return lightmap_uv


def objectBbox(obj):
    ptsObject = obj.bound_box
    ptsWorld = numpy.array([obj.matrix_world @ Vector(pt) for pt in ptsObject])
    centerWorld = numpy.average(ptsWorld, axis=0)
    centerToPts = ptsWorld - centerWorld
    radius = numpy.linalg.norm(centerToPts, axis=1).max()
    return {'center': [round(x, 3) for x in centerWorld], 'radius': round(radius, 3)}


def storeExistingUvLayer(outData, obj):
    obj_uv = outData['objs'][obj.name]
    try:
        render_uv_layer = obj.data.uv_layers.active.name
        obj_uv['render_uv'] = render_uv_layer
    except AttributeError:
        pass


def delete_extra_objs():
    try:
        key_collection, = [c for c in bpy.data.collections if c.name != 'Collection' and c.library is None]
    except ValueError:
        log.error(list(bpy.data.collections))
        raise
    select_objects_in_collection(key_collection)
    keep = len(bpy.context.selected_objects)
    bpy.ops.object.select_all(action='INVERT')
    dump = len(bpy.context.selected_objects)
    log.info(f'keeping {keep} objects, deleting {dump}')
    bpy.ops.object.delete(confirm=False)


def main():
    input_scene = Path(sys.argv[-1])
    output_export = dest / 'serve' / input_scene.relative_to(src).parent / input_scene.name.replace('.blend', '.glb')
    output_export.parent.mkdir(parents=True, exist_ok=True)
    outData = {}

    log.info(f'open collection {input_scene}')
    bpy.ops.wm.open_mainfile(filepath=str(input_scene))

    def dice_ground():
        log.info('dice_ground')
        for xsplit in range(-750, 750, 250):
            for ysplit in range(-750, 750, 250):
                separate_rect('gnd.001', -750, xsplit + 250, -750, ysplit + 250)

    def separate_materials():
        log.info('separate_materials')
        for obj_name in all_mesh_objects():
            if len(bpy.data.objects[obj_name].material_slots) > 1:
                select_object(obj_name)
                bpy.ops.mesh.separate(type='MATERIAL')

    def lightmaps():
        log.info('lightmaps')
        for obj_name in all_mesh_objects():
            # if not obj_name.startswith('sign_board'): continue
            try:
                obj = select_object(obj_name)
            except Exception as exc:
                log.warning(f'lightmap_pack failed on {obj_name}: {exc!r}')
                continue

            outData.setdefault('objs', {}).setdefault(obj_name, {})['worldBbox'] = objectBbox(obj)

            storeExistingUvLayer(outData, obj)
            lyr = make_lightmap_uv_layer(obj, outData)
            obj.data.uv_layers.active = lyr

            log.info(f'start lightmap_pack on {obj_name}; active uv is {obj.data.uv_layers.active.name}')
            try:
                bpy.ops.uv.lightmap_pack(
                    PREF_CONTEXT='ALL_FACES',
                    PREF_PACK_IN_ONE=True,
                    PREF_NEW_UVLAYER=False,
                )
            except Exception as exc:
                log.warning(f'lightmap_pack failed on {obj_name}: {exc!r}')

    def rel_paths():
        log.info('rel_paths')
        # bpy.ops.file.make_paths_relative() is not working; it makes like
        # '//../../../home/drewp/own/proj_shared/megasecond/client/asset/wrap/gnd_dif.png'
        for img in bpy.data.images.values():
            prev = img.filepath
            img.filepath = re.sub(r'.*/megasecond/client/asset/wrap/', '//', img.filepath)
            if img.filepath != prev:
                log.info(f'fix path from {prev} to {img.filepath}')
            log.info(f' * image at {img.filepath}')

    delete_extra_objs()

    if 'gnd.001' in bpy.data.objects:
        dice_ground()

    separate_materials()
    lightmaps()
    rel_paths()

    # write obj list so we can make deps?

    saveScene(dest / 'stage/bake' / input_scene.relative_to(src))

    writeGlb(output_export, select=None, with_materials=True)


main()
