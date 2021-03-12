import logging
import os
import json
import sys
import math
from typing import List

import bpy
from mathutils import Matrix

sys.path.append(os.path.dirname(__file__))
from dirs import dest, src

logging.basicConfig(stream=sys.stderr, level=logging.DEBUG)
log = logging.getLogger()


def all_collection_instances():
    for instance in bpy.data.objects:
        if instance.instance_type != 'COLLECTION':
            continue
        yield instance
        # 0.5, 0, 0.866, 0.0,
        # 0.0,  1.0,0, 0.0,
        # -0.866, 0, 0.5, 0.0,
        # 2.8725, 0.0001, -2.4789, 1.0

def baby_from_blender(mat: Matrix) -> List[float]:
    y_up = Matrix.Rotation(math.radians(-90), 4, 'X')
    #mat = mat.copy()
    out = mat @ y_up
    out.transpose()
    out = out @ Matrix([
        [1,0,0,0],
        [0,1,0,0],
        [0,0,1,0],
        [0,0,0,1]
        ])
    out = out @ y_up
    return sum([[round(v, 5) for v in row] for row in out], [])
    x, y, z, w = 0, 1, 2, 3
    tx, ty, tz = -mat[x][w], mat[z][w], mat[y][w]
    return [round(v, 4) for v in [
        mat[x][x], mat[z][x], mat[y][x], mat[w][x], #
        mat[x][z], mat[z][z],-mat[z][y], mat[w][z], #
        mat[x][y], mat[y][z], mat[y][y],  mat[w][y], #
        #
        tx * mat[x][x] + tz * mat[y][x], 
        ty,
        tx * mat[x][y] - tz * mat[y][y],
        mat[w][w], #
    ]]

def main():
    layout = {}
    bpy.ops.wm.open_mainfile(filepath=str(src / 'layout/env.blend'))

    def localize_collections():
        for empty in all_collection_instances():
            log.info(f'{empty.name} is an instance of collection {empty.instance_collection.name}')
            lib_path = empty.instance_collection.library.filepath
            layout.setdefault('instances', []).append({
                'name': empty.name,
                'model': lib_path.replace('//../', '').replace('.blend', '.glb'),
                'pos_blender': [round(v, 4) for      v in list(empty.location)],
                'world_blender': [round(v, 4) for v in sum([list(row) for row in empty.matrix_world], [])],
                'transform_baby': baby_from_blender(empty.matrix_world),
            })

    localize_collections()

    out = dest / 'serve/layout.json'
    out.parent.mkdir(parents=True, exist_ok=True)
    with open(out, 'w') as f:
        json.dump(layout, f, indent=2, sort_keys=True)


main()
