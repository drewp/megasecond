import { Component, ComponentCollection, Engine } from "@trixt0r/ecs";
import { AbstractMesh, Vector3 } from "babylonjs";
import { AssetContainer } from "babylonjs";
import { round4 } from "./debug";
import { IdEntity } from "./IdEntity";
import createLogger from "./logsetup";
const log = createLogger("ecs");

export function removeComponent(entity: IdEntity, component: Component) {
  // not sure how to do this in @trixt0r/ecs yet
  const matching = entity.components.filter((c) => c.constructor === component);
  matching.forEach((c) => {
    entity.components.remove(c);
  });
}

export function componentNameList(comps: Component[] | ComponentCollection<Component>): string {
  return comps.map((c: Component) => c.constructor.name).join(",");
}

export function entityIdList(entities: IdEntity[]): string {
  return entities.map((e: IdEntity) => "e" + e.id).join(",");
}

export function combineComponentCollections(...sources: (ComponentCollection<Component> | Component[])[]): ComponentCollection<Component> {
  const ret = new ComponentCollection<Component>();
  sources.forEach((clist) => {
    clist.forEach((c) => ret.add(c));
  });
  return ret;
}

export function dumpWorld(world: Engine, write: (line: string) => void) {
  world.entities.forEach((e) => {
    write(`entity ${e.id}`);
    e.components.sort((a, b) => (a.constructor.name < b.constructor.name ? -1 : 1));
    e.components.forEach((comp) => {
      write(`  component ${comp.constructor.name}`);
      for (let prop in comp) {
          write(`    ${prop} ${prettyPrintText(comp[prop])}`);
      }
    });
  });
}

function prettyVector3(v: Vector3) {
  return `<${round4(v.x)} ${round4(v.y)} ${round4(v.z)}>`

}

function prettyPrintText(v: any): string {
  if (v instanceof Vector3) {
    return prettyVector3(v)
  }
  if (v instanceof AbstractMesh) {
    return `Mesh ${v.name} at pos=${prettyVector3(v.position)}`
  }
  if (v instanceof AssetContainer) {
    return `AssetContainer with ${v.rootNodes.length} root nodes; ${v.getNodes().length} total`
  }
  try {
    v = v.toString();
  } catch (err) {
    v = "" + v;
  }
  if (v.match(/\[object/)) {
    return "(obj)"
  }
  return v
}