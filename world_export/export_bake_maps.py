"""
read source in ../client/asset/, write what babylonjs will use in ../build/asset/

see https://github.com/Naxela/The_Lightmapper for a possible replacement
or https://github.com/danielenger/Principled-Baker
or https://github.com/leukbaars/EasyBake/blob/master/EasyBake.py
"""
import logging
import os
import sys
import time

import bpy

sys.path.append(os.path.dirname(__file__))
import image
from dirs import dest, src
from map_quality import get_map_size
from selection import all_mesh_objects, select_object
from world_json import json_serialize_with_pretty_matrices

logging.basicConfig(stream=sys.stderr, level=logging.DEBUG)
log = logging.getLogger()


class Bake:

    def __init__(self, inst_name, obj, outData, map_size=1024, samples=100):
        self.inst_name = inst_name
        self.obj = obj
        self.outData = outData
        self.map_size = map_size
        self.samples = samples

        select_object(self.obj.name)

        self.objData = self.outData.setdefault('objs', {}).setdefault(self.obj.name, {})

        mat = self._objMaterial(obj)
        if mat is None:
            return
        self.objData['material'] = {'name': mat.name}

        self._selectUvs(obj)
        mat = obj.material_slots.values()[0].material

        self._prepBakeImage(mat)

        runs = [
            # ('COMBINED', 'comb', 'sRGB'),
            # ('DIFFUSE', 'dif', 'sRGB'),
            # ('AO', 'ao', 'Non-Color'),
            ('SHADOW', 'shad', 'Non-Color'),
            # ('NORMAL', 'norm', 'Non-Color'),
            # ('ROUGHNESS', 'ruff', 'Non-Color'),
            # ('GLOSSY', 'glos', 'Non-Color'),
        ]

        for bake_type, out_name, cs in runs:
            self._bakeAndSave(bake_type, out_name, cs)
        self.delete_node()

    def _objMaterial(self, obj):
        slots = list(obj.material_slots)
        if len(slots) == 0:
            log.warning(f'    {self.obj.name} has no mat slots')
            return None
        elif len(slots) == 1:
            return slots[0].material
        else:
            raise NotImplementedError("separate_materials didn't work")

    def _selectUvs(self, obj):
        uvs = obj.data.uv_layers
        for lyr in uvs:
            if lyr.name == self.objData.get('render_uv', None):
                lyr.active_render = True  # bake reads with this
            if lyr.name == self.objData.get('lightmap_uv', None):
                uvs.active = lyr  # bake writes with this

    def _prepBakeImage(self, mat):
        self.img = bpy.data.images.new('bake_out', self.map_size, self.map_size, alpha=False, is_data=True)

        nodes = mat.node_tree.nodes
        log.info(f'    {self.obj.name} mat {mat.name} has {len(nodes)} nodes')

        tx = nodes.new('ShaderNodeTexImage')
        self.delete_node = lambda: nodes.remove(tx)
        tx.image = self.img

        tx.select = True  # bake writes to the selected node
        nodes.active = tx

    def _bakeAndSave(self, bake_type, out_name, cs):
        log.info(f'    {self.obj.name} start {bake_type} bake ' f'(size={self.img.generated_width}, samples={self.samples})')
        self.img.colorspace_settings.name = cs

        bpy.context.scene.render.engine = 'CYCLES'
        bpy.context.scene.cycles.device = 'GPU'
        bpy.context.scene.cycles.samples = self.samples
        bpy.context.scene.cycles.use_denoising = True
        bpy.context.scene.cycles.bake_type = bake_type

        bakeData = self.objData.setdefault('bake', {}).setdefault(bake_type, {})
        bakeData['res'] = self.img.generated_width
        bakeData['samples'] = bpy.context.scene.cycles.samples

        self.obj.select_set(state=True)

        try:
            t1 = time.time()
            bpy.ops.object.bake('INVOKE_DEFAULT', type=bake_type, use_clear=True)
            bakeData['bake_time'] = round(time.time() - t1, 2)
        except Exception as err:
            log.warning(err)
        else:
            # these should be named by content since some will be the same (dup object under 2 lights will have some of the same maps)
            t2 = time.time()
            image.save(self.img, dest / f'stage/bake/render/{self.inst_name}/{self.obj.name}_{out_name}.png', logPrefix='      ')
            bakeData['save_time'] = round(time.time() - t2, 2)


def localize(col_name):
    bpy.data.collections.new('to_bake')

    select_object(col_name)  # an empty
    bpy.ops.object.duplicates_make_real()
    # now there are child objs dumped at the top level

    objs = []
    for obj in bpy.context.selectable_objects:
        if obj.type != 'MESH':
            continue
        bpy.ops.object.make_local(type='SELECT_OBDATA_MATERIAL')
        objs.append(obj)

    return objs


def main():
    coll = sys.argv[-1]

    # relative links will now prefer dest/stage/bake/model, which have lightmaps
    changed_path = dest / 'stage/bake/layout/env.blend'
    log.info(f'loading {changed_path}')
    bpy.ops.wm.open_mainfile(filepath=str(changed_path))

    log.info(f'  localize {coll}')
    objs_to_bake = localize(coll)

    outData = {}
    for i, obj in enumerate(objs_to_bake):  # todo- bake into one atlas for the collection?
        map_size = get_map_size(obj.name)
        if map_size is None:
            continue
        log.info(f'  bake [{i}/{len(objs_to_bake)}] {obj.name}')
        Bake(coll, obj, outData, map_size=map_size)

    out_path = dest / f'serve/map/bake/{coll}.json'
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, 'w') as out:
        out.write(json_serialize_with_pretty_matrices(outData))


if __name__ == '__main__':
    main()
