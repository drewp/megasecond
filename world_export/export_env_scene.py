import contextlib
import logging
import os
import sys

import bmesh
import bpy

sys.path.append(os.path.dirname(__file__))
from blender_async import later
from dirs import dest, src
from selection import select_object

logging.basicConfig(stream=sys.stderr, level=logging.DEBUG)
log = logging.getLogger()


@contextlib.contextmanager
def editmode():
    if bpy.context.edit_object:
        bpy.ops.object.editmode_toggle()
    bpy.ops.object.editmode_toggle()
    yield
    bpy.ops.object.editmode_toggle()


def separate_rect(obj_name, xlo, xhi, ylo, yhi) -> str:
    names_before = set(o.name for o in bpy.data.objects)
    select_object(obj_name)
    with editmode():
        bpy.ops.mesh.select_mode(use_extend=False,
                                 use_expand=False,
                                 type='VERT')
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
    new_name = names_after.difference(names_before).pop()

    select_object(new_name)
    with editmode():
        bpy.ops.mesh.select_mode(use_extend=False,
                                 use_expand=False,
                                 type='FACE')
        bpy.ops.mesh.select_all(action='SELECT')
        bpy.ops.uv.cube_project(
            cube_size=1, scale_to_bounds=True
        )  # todo needs to go to a separate uv, to not break the big ground dif texture
    return new_name


def main():
    bpy.ops.wm.open_mainfile(filepath=str(src / 'wrap/wrap.blend'))

    def done():
        bpy.ops.wm.save_as_mainfile(filepath=str(dest / 'edit.blend'))
        bpy.ops.wm.quit_blender()

    def dice_ground(cb):
        for xsplit in range(-750, 750, 250):
            for ysplit in range(-750, 750, 250):
                separate_rect('gnd.001', -750, xsplit + 250, -750,
                              ysplit + 250)
        cb()

    later(2, dice_ground, done)
    # also, delete player and other setup stuff, maybe save a non-env scene with props and chars

main()
