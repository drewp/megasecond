import bpy

def later(sec, func, *args, **kw):
    bpy.app.timers.register(lambda: func(*args, **kw), first_interval=sec)
