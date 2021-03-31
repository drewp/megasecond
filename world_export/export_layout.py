import logging
import os
import sys
from typing import List

import bpy
from io_scene_gltf2.blender.com.gltf2_blender_math import (swizzle_yup_location, swizzle_yup_rotation, swizzle_yup_scale)
from mathutils import Matrix, Vector

sys.path.append(os.path.dirname(__file__))
from dirs import dest, src
from world_json import json_serialize_with_pretty_matrices

logging.basicConfig(stream=sys.stderr, level=logging.INFO)
log = logging.getLogger()


def any_scale(scl: Vector) -> Matrix:
    return Matrix([
        [scl.x, 0, 0, 0],  #
        [0, scl.y, 0, 0],
        [0, 0, scl.z, 0],
        [0, 0, 0, 1]
    ])


def baby_from_blender(mat: Matrix) -> Matrix:
    t, qr, s = mat.decompose()
    out = (
        Matrix.Translation(swizzle_yup_location(t) * Vector([-1, 1, 1])) @  #
        swizzle_yup_rotation(qr).to_matrix().to_4x4() @  #
        any_scale(swizzle_yup_scale(s)))
    out.transpose()
    return out


def flatten_matrix(out: Matrix) -> List[float]:
    return sum([[round(v, 6) for v in row] for row in out], [])


def all_collection_instances():
    for instance in bpy.data.objects:
        if instance.instance_type != 'COLLECTION':
            continue
        yield instance


def main():
    layout = {}
    bpy.ops.wm.open_mainfile(filepath=str(src / 'layout/env.blend'))

    def localize_collections():
        for empty in all_collection_instances():
            log.debug(f'{empty.name} is an instance of collection {empty.instance_collection.name}')
            if empty.name in ['player']:
                log.debug('  skipping')
                continue
            lib_path = empty.instance_collection.library.filepath
            layout.setdefault('instances', []).append({
                'name': empty.name,
                'model': lib_path.replace('//../', '').replace('.blend', '.glb'),
                'pos_blender': list(empty.location),
                'world_blender': flatten_matrix(empty.matrix_world),
                'transform_baby': flatten_matrix(baby_from_blender(empty.matrix_world)),
            })

    localize_collections()

    out = dest / 'serve/layout.json'
    out.parent.mkdir(parents=True, exist_ok=True)
    with open(out, 'w') as f:
        f.write(json_serialize_with_pretty_matrices(layout))


main()
