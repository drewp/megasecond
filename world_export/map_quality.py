# deliberatly not in file_dep, so a change to sizes doesn't force rerenders


def get_map_size(obj_name):
    map_size = 512
    # maybe let a custom attr raise this sometimes, or determine it from obj size?
    if obj_name.startswith('gnd.'):
        if obj_name != 'gnd.023':
            return None
        map_size = 4096
    if obj_name in ['building_022.outer.003']:
        map_size = 2048
    if obj_name.startswith('leaf.'):
        return None
    # map_size = 128
    return map_size