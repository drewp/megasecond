import bpy
import bpy_types
import contextlib


def select_object(name):
    bpy.ops.object.select_all(action='DESELECT')
    obj = bpy.data.objects[name]
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    return obj


def all_mesh_objects(root):
    # Need linked dups that share a mesh to be separately returned
    expanded = []

    def rec(cur):
        if cur.type == 'MESH':
            expanded.append(cur.name)
        for child in cur.children:
            rec(child)

    rec(root)
    return expanded


def select_objects_in_collection(c: bpy_types.Collection):
    bpy.ops.object.select_all(action='DESELECT')
    for obj in c.objects:
        obj.select_set(True)

@contextlib.contextmanager
def editmode():
    if bpy.context.edit_object:
        bpy.ops.object.editmode_toggle()
    bpy.ops.object.editmode_toggle()
    yield
    bpy.ops.object.editmode_toggle()
