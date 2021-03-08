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
    for f in (list(src.glob("*.jpg")) +  #
              list(src.glob("*.png")) + list(src.glob("wrap/*.png"))):
        target = dest / f.name
        yield {
            'name': str(target.relative_to(dest)),
            'file_dep': [f],
            'targets': [target],
            'actions': [f'install -D {f} {target}'],
        }


def task_env_scene():
    return {
        'file_dep': [
            'client/asset/wrap/wrap.blend',
            'world_export/export_env_scene.py',
        ] + shared_code_deps,
        'actions': ['blender --background --python world_export/export_env_scene.py'],
        'targets': ['build/asset/edit.blend'],
    }


def task_geom():
    return {
        'file_dep': [
            'build/asset/edit.blend',
            'client/asset/wrap/card.blend',
            'world_export/export_geom.py',
        ] + shared_code_deps,
        'actions': ['blender --background --python world_export/export_geom.py'],
        'targets': [
            'build/asset/obj_card.glb',
            'build/asset/wrap.glb',
        ],
    }


def task_bake_maps():
    for job in [
            'gnd.023',
            'other_gnd',
            'not_gnd',
            # 'debug',
    ]:
        yield {
            'name':
                job,
            'file_dep': [
                'build/asset/edit.blend',
                'client/asset/wrap/flag_rainbow_dif.png',
                'client/asset/wrap/gnd_dif.png',
                'client/asset/wrap/sign_dif.png',
                'client/asset/wrap/stair_dif.png',
                'world_export/export_bake_maps.py',
                'world_export/image.py',
            ] + shared_code_deps,
            'params': [{
                'name': 'job',
                'env_var': 'EXPORT_JOB',
                'default': 'debug'
            }],
            'actions': [f'blender --background --python world_export/export_bake_maps.py -- --job={job}'],
            # 'targets': [
            #     'build/asset/bake/bake_sign_board_dif.png',
            #     'build/asset/bake/bake_sign_board_shad.png',
            # ]
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
