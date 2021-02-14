import logging

import bpy
from twisted.internet.defer import Deferred

log = logging.getLogger()

currentRun = None


class BakeAndCallback(bpy.types.Macro):
    bl_idname = "test.bake_and_callback"
    bl_label = "Bake and callback"


class BakeAndCallbackDone(bpy.types.Operator):
    bl_idname = "test.bake_and_callback_done"
    bl_label = "BakeAndCallbackDone"

    def execute(self, context):
        log.info("macro  part 2")
        currentRun.callback(None)
        return {'FINISHED'}


bpy.utils.register_class(BakeAndCallback)
bpy.utils.register_class(BakeAndCallbackDone)

BakeAndCallback.define("object.bake")
BakeAndCallback.define("test.bake_and_callback_done")


def deferBake():
    """run bpy.ops.object.bake('INVOKE_DEFAULT') but fire a deferred when it's done"""
    global currentRun
    currentRun = Deferred()
    log.info("deferBake: call the op")
    ret =bpy.ops.test.bake_and_callback('INVOKE_SCREEN') 
    log.info(f'op returned {ret}')
    return currentRun
