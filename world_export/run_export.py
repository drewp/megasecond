"""
read source in ../client/asset/, write what babylonjs will use in ../build/asset/


see https://github.com/Naxela/The_Lightmapper for a possible replacement
or https://github.com/danielenger/Principled-Baker
or https://github.com/leukbaars/EasyBake/blob/master/EasyBake.py
"""

import os
import shutil
import subprocess
from dirs import src, dest

os.chdir(os.path.dirname(__file__))


def export_static_images():
    for f in (list(src.glob("*.jpg")) +  #
              list(src.glob("*.png")) #+  #
              #list((src / "wrap").glob("*.png"))
              ):
        shutil.copyfile(f, dest / f.name)


def export_env_scene():
    subprocess.check_call([
        'blender',
        '--window-geometry',
        '1200',
        '800',
        '0',
        '0',
        # '--background', # ideally, headless mode, but it doesn't work yet.
        '--python',
        'export_env_scene.py'
    ])


def export_geom():
    subprocess.check_call([
        'blender',  #
        '--background',  #
        '--addons',
        '',  #
        '--python',
        'export_geom.py'  #
    ])


def export_bake_maps():
    cur_env = os.environ.copy()
    for job in [
       'gnd.023', 
        #'other gnd', 
        'not gnd',
        ]:
        cur_env['EXPORT_JOB'] = job
        subprocess.check_call(
            [
                'blender',
                # '--disable-autoexec',
                # '--no-window-focus',
                '--window-geometry',
                '1200',
                '800',
                '0',
                '0',
                # '--background', # ideally, headless mode, but it doesn't work yet.
                '--debug-python',
                # '--debug-handlers',
                # '--debug-gpu',
                # '--debug-jobs',
                # '--debug-cycles',
                # '--debug-events',
                '--python',
                'export_bake_maps.py'
            ],
            env=cur_env)


# export_static_images()
export_env_scene()
export_geom()
# export_bake_maps()