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


def task_env_scene():
# def task_env_scene():
#     return {
#         'file_dep': [
#             'asset/layout/env.blend',
#             'world_export/export_env_scene.py',
#         ] + shared_code_deps,
#         'actions': ['blender --background --python world_export/export_env_scene.py'],
#         'targets': ['build/stage/env_edit.blend'],
#     }

def task_layout():
    """blend scene full of instanced collections -> json for Env.ts"""
    return {
        'file_dep': [
            'asset/layout/env.blend',
            'world_export/export_layout.py',
        ] + shared_code_deps,
        'actions': ['blender --background --python world_export/export_layout.py'],
        'targets': ['build/serve/layout.json'],
    }


def task_bake_maps():
    for job in [
            'gnd.023',
            'other_gnd',
            'not_gnd',
            # 'debug',
    ]:
def task_model():
    for f in (src / 'model').glob('*/*.blend'):
        output_export = dest / 'serve' / f.relative_to(src).parent / f.name.replace('.blend', '.glb')

        yield {
            'name':
                job,
            'name': str(f.relative_to(src / 'model')),
            'file_dep': [
                'build/asset/edit.blend',
                str(f),
                'world_export/export_model.py',
            ] + shared_code_deps,
            'actions': [f'blender --background --python world_export/export_model.py -- read {f}'],
            'targets': [
                output_export,
                # plus a descriptor with mats, etc
            ],
        }


@create_after(executed='bake_maps')
def task_convert_bake_maps():
    for p in (dest / 'bake').glob('*.png'):
        t = str(p).replace('.png', '.jpg')
        yield {
            'name': p.name,
            'file_dep': [p],
            'actions': [f"convert -quality 80 {p} {t}"],
            'targets': [t],
        }


# world.json currently not ever being cleared
