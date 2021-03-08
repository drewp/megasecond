DOIT_CONFIG = {
    'reporter': 'console',
    'dep_file': '../build/dep.json',
    'backend': 'json',
}


def task_convert_normal1():
    return {
        'file_dep': ['../client/asset/wrap/normal1.png'],
        'targets': ['../build/asset/normal1.jpg'],
        'actions': ['convert -quality 95 ../client/asset/wrap/normal1.png ../build/asset/normal1.jpg'],
    }
