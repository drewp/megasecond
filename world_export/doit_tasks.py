import json
from doit import create_after

from dirs import src, dest
DOIT_CONFIG = {
    'reporter': 'console',
    'dep_file': 'build/dep.json',
    'backend': 'json',
}

shared_code_deps = [
    'world_export/dirs.py',
    'world_export/blender_async.py',
    'world_export/selection.py',
    'world_export/world_json.py',
]

layout_json = 'build/serve/layout.json'
relocated_layout_for_bakes = 'build/stage/bake/layout/env.blend'


def task_static_images():
    for f in (list((src / 'logo').glob("*.jpg")) +  #
              list((src / 'logo').glob("*.png")) + list((src / 'map').glob("*.jpg")) +  #
              list((src / 'map').glob("*.png"))):
        target = dest / 'serve/map' / f.name
        yield {
            'name': str(target.relative_to(dest)),
            'file_dep': [f],
            'targets': [target],
            'actions': [f'install -D {f} {target}'],
        }


def task_layout():
    """blend scene full of instanced collections -> json for Env.ts"""
    return {
        'file_dep': [
            'asset/layout/env.blend',
            'world_export/export_layout.py',
        ] + shared_code_deps,
        'actions': ['blender --background --python world_export/export_layout.py'],
        'targets': [layout_json],
    }


def task_model():
    for f in (src / 'model').glob('*/*.blend'):
        output_export = dest / 'serve' / f.relative_to(src).parent / f.name.replace('.blend', '.glb')

        yield {
            'name': str(f.relative_to(src / 'model')),
            'file_dep': [
                str(f),
                'world_export/export_model.py',
            ] + shared_code_deps,
            'actions': [f'blender --background --python world_export/export_model.py -- read {f}'],
            'targets': [
                output_export,
                dest / 'stage/bake' / f.relative_to(src),
                # plus a descriptor with mats, etc
            ],
        }


def task_bake_precopy():
    return {
        'file_dep': ['asset/layout/env.blend'],
        'actions': [f'install -D asset/layout/env.blend {relocated_layout_for_bakes}'],
        'targets': [relocated_layout_for_bakes]
    }


@create_after(executed='layout')
def task_bake_maps():
    layout = json.load(open(layout_json))
    for inst in layout['instances']:
        # todo- it would be tres cool if this could use the instance matrix as a
        # dep, so only the moved or edited objects get rerun.
        # todo- it would also be nice to update with a junky low-res map first
        # the follow up with a full one.
        coll = inst['name']
        # if coll not in ['sign.001', 'gnd']: continue
        yield {
            'name':
                coll,
            'file_dep': [
                'world_export/export_bake_maps.py',
                relocated_layout_for_bakes,
            ] + shared_code_deps,
            'actions': [f'blender --background --python world_export/export_bake_maps.py -- coll {coll}'],
            'targets': [
                f'build/serve/map/bake/{coll}.json',
                # plus imgs: 'build/stage/bake/render/{coll}/{obj}_{bake_type}.jpg',
            ]
        }


@create_after(executed='bake_maps')
def task_convert_bake_maps():
    for instanceDir in (dest / 'stage/bake/render').glob('*'):
        targetDir = dest / 'serve/map/bake' / instanceDir.name
        targetDir.mkdir(parents=True, exist_ok=True)
        for renderedPng in instanceDir.glob('*.png'):
            targetJpg = targetDir / renderedPng.name.replace('.png', '.jpg')
            adjust = ''
            if renderedPng.name.endswith('_shad.png'):
                adjust = '-brightness-contrast 20'
            yield {
                'name': f'{instanceDir.name}/{targetJpg.name}',
                'file_dep': [renderedPng],
                'actions': [f"convert {adjust} -quality 90 {renderedPng} {targetJpg}"],
                'targets': [targetJpg],
            }
