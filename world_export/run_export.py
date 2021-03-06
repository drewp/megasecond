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

docker_blender = [
    'docker',
    'run',
    '-v',
    os.getcwd() + "/..:/workspace",
    'mega_blender',  # image name
    'blender'  #   command
]


def export_env_scene():
    subprocess.check_call(docker_blender + ['--background'] +
                          ['--python', 'world_export/export_env_scene.py'])


def export_geom():
    subprocess.check_call(docker_blender + ['--background'] +
                          ['--python', 'world_export/export_geom.py'])


def export_bake_maps():
    cur_env = os.environ.copy()
    for job in [
            'gnd.023',
            'other gnd',
            'not gnd',
            # 'debug',
    ]:
        cur_env['EXPORT_JOB'] = job
        subprocess.check_call(docker_blender[:2] +
                              ['-e', f'EXPORT_JOB={job}'] +
                              docker_blender[2:] + [
                                  '--background', '--debug-python', '--python',
                                  'world_export/export_bake_maps.py'
                              ],
                              env=cur_env)


world_json.delete()

export_static_images()
export_env_scene()
export_geom()
export_bake_maps()

world_json.dump()
