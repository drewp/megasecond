"""
read source in ../client/asset/, write what babylonjs will use in ../build/asset/
"""

import os
import shutil
import subprocess
from dirs import src, dest

os.chdir(os.path.dirname(__file__))

for f in (list(src.glob("*.jpg")) +  #
          list(src.glob("*.png")) +  #
          list((src / "wrap").glob("*.png"))):
    shutil.copyfile(f, dest / f.name)

# hopefully this can be optimized by leaving blender up and loading linked files as needed
subprocess.check_call([
    'blender',
    # '--disable-autoexec',
    # '--no-window-focus',
    '--background',
    '--debug-python',
    # '--debug-handlers',
    # '--debug-gpu',
    # '--debug-jobs',
    # '--debug-cycles',
    '--debug-events',
    '--python',
    'run_scene_export.py'
])
