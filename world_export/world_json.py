import re
import itertools
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


def json_serialize_with_pretty_matrices(obj):
    j = json.dumps(obj, indent=2, sort_keys=True)

    def reindent_mat(match: re.Match):
        pre, cells, post = match.groups()
        seen = itertools.count(1)

        def maybe_break(m: re.Match) -> str:
            post = m.groups()[0] if next(seen) % 4 == 0 else '  '
            return ',' + post

        cells = re.sub(r',(\n\s*)', maybe_break, cells)
        return pre + cells + post

    return re.sub(r'((?:_baby|_blender)": \[)(.*?)(\s*\])', reindent_mat, j, flags=re.DOTALL)
