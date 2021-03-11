import logging
import os
import json
import sys

import bpy

sys.path.append(os.path.dirname(__file__))
from dirs import dest, src

logging.basicConfig(stream=sys.stderr, level=logging.DEBUG)
log = logging.getLogger()


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
            log.info(f'{empty.name} is an instance of collection {empty.instance_collection.name}')
            lib_path = empty.instance_collection.library.filepath
            layout.setdefault('instances', []).append({
                'name': empty.name,
                'model': lib_path.replace('//../', '').replace('.blend', '.glb'),
                'transform': sum([list(row) for row in empty.matrix_world], []),
            })

    localize_collections()

    out = dest / 'serve/layout.json'
    out.parent.mkdir(parents=True, exist_ok=True)
    with open(out, 'w') as f:
        json.dump(layout, f, indent=2, sort_keys=True)


main()
