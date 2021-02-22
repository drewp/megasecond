import json

from dirs import dest

_wj = dest / 'world.json'


def delete():
    if _wj.exists():
        _wj.unlink()


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
