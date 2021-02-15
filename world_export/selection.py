import bpy

def select_object(name):
    bpy.ops.object.select_all(action='DESELECT')
    bpy.data.objects[name].select_set(True)
    bpy.context.view_layer.objects.active = bpy.data.objects[name]
