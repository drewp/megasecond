import { Component, ComponentCollection, Engine } from "@trixt0r/ecs";
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
        let v;
        try {
          v = comp[prop].toString();
        } catch (err) {
          v = "" + comp[prop];
        }
        if (v.match(/\[object/)) {
          write(`    ${prop} (obj)`); //, comp[prop]);
        } else {
          write(`    ${prop} ${v}`);
        }
      }
    });
  });
}

