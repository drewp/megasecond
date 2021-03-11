import json

from dirs import dest

_wj = dest / 'serve/world.json'


def delete():
    rewrite({})


def load():
    outData = {}
    try:
        with open(_wj) as worldJsonPrev:
            outData = json.load(worldJsonPrev)
    except IOError:
        pass
    return outData


def rewrite(outData):
    with open(_wj, 'w') as worldJson:
        json.dump(outData, worldJson, indent=2, sort_keys=True)


def dump():
    print(open(_wj).read())
