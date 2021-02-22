"""
read source in ../client/asset/, write what babylonjs will use in ../build/asset/

see https://github.com/Naxela/The_Lightmapper for a possible replacement
or https://github.com/danielenger/Principled-Baker
or https://github.com/leukbaars/EasyBake/blob/master/EasyBake.py
"""

import os
import shutil
import subprocess

import world_json
from dirs import dest, src

os.chdir(os.path.dirname(__file__))


def export_static_images():
    for f in (list(src.glob("*.jpg")) +  #
              list(src.glob("*.png"))):
        shutil.copyfile(f, dest / f.name)


small_window = ['--window-geometry', '1200', '800', '0', '0']
no_addons = ['--addons', '']  # might not actually do anything


def export_env_scene():
    subprocess.check_call([
        'blender',
    ] + small_window + no_addons + [
        # '--background', # ideally, headless mode, but it doesn't work yet.
    ] + ['--python', 'export_env_scene.py'])


def export_geom():
    subprocess.check_call([
        'blender',  #
        '--background',  #
    ] + no_addons + ['--python', 'export_geom.py'])


def export_bake_maps():
    cur_env = os.environ.copy()
    for job in [
            'gnd.023',
            'other gnd',
            'not gnd',
            # 'debug',
    ]:
        cur_env['EXPORT_JOB'] = job
        subprocess.check_call(
            [
                'blender',
            ] + small_window + no_addons + [
                # '--disable-autoexec',
                # '--no-window-focus',
                # '--background', # ideally, headless mode, but it doesn't work yet.
                '--debug-python',
                '--python',
                'export_bake_maps.py'
            ],
            env=cur_env)
    world_json.dump()


world_json.delete()

export_static_images()
export_env_scene()
export_geom()
export_bake_maps()
