"""
read source in ../client/asset/, write what babylonjs will use in ../build/client/
"""

import subprocess
import os

os.chdir(os.path.dirname(__file__))
# hopefully this can be optimized by leaving blender up and loading linked files as needed
subprocess.check_call([
    'blender', 
    # '--disable-autoexec',
    # '--no-window-focus',
    # '--background', 
    '--debug-python',
    # '--debug-handlers',
    # '--debug-gpu',
    # '--debug-jobs',
    # '--debug-cycles',
    # '--debug-events',
    # '../client/asset/wrap/wrap.blend', 
    '--python',
    'run_scene_export.py'
])
# convert oher images, etc
