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
                # plus a descriptor with mats, etc
            ],
        }


# def task_geom():
#     return {
#         'file_dep': [
#             'build/stage/env_edit.blend',
#             'asset/model/prop/card.blend',
#             'world_export/export_geom.py',
#         ] + shared_code_deps,
#         'actions': ['blender --background --python world_export/export_geom.py'],
#         'targets': [
#             'build/serve/model/card.glb',
#             'build/serve/model/env.glb',
#         ],
#     }

# def task_bake_maps():
#     for job in [
#             #'gnd.023',
#             #'other_gnd',
#             'not_gnd',
#             # 'debug',
#     ]:
#         yield {
#             'name':
#                 job,
#             'file_dep': [
#                 'build/stage/env_edit.blend',
#                 'asset/map/flag_rainbow_dif.png',
#                 'asset/map/gnd_dif.png',
#                 'asset/map/sign_dif.png',
#                 'asset/map/stair_dif.png',
#                 'world_export/export_bake_maps.py',
#                 'world_export/image.py',
#             ] + shared_code_deps,
#             'params': [{
#                 'name': 'job',
#                 'env_var': 'EXPORT_JOB',
#                 'default': 'debug'
#             }],
#             'actions': [f'blender --background --python world_export/export_bake_maps.py -- --job={job}'],
#             # 'targets': [
#             #     'build/stage/bake/sign_board_dif.png',
#             #     'build/stage/bake/sign_board_shad.png',
#             # ]
#         }

# @create_after(executed='bake_maps')
# def task_convert_bake_maps():
#     for p in (dest / 'stage/bake').glob('*.png'):
#         t = dest / 'serve/bake' / p.name.replace('.png', '.jpg')
#         t.parent.mkdir(parents=True, exist_ok=True)
#         yield {
#             'name': p.name,
#             'file_dep': [p],
#             'actions': [f"convert -quality 80 {p} {t}"],
#             'targets': [t],
#         }

# world.json currently not ever being cleared
