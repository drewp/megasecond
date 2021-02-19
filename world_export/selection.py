import bpy

def select_object(name):
    bpy.ops.object.select_all(action='DESELECT')
    bpy.data.objects[name].select_set(True)
    bpy.context.view_layer.objects.active = bpy.data.objects[name]

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
