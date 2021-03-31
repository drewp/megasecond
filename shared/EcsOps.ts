import { Engine } from "@trixt0r/ecs";
import { ComponentCollection } from "@trixt0r/ecs";
import { Component } from "@trixt0r/ecs";
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

export function dump(world: Engine) {
  world.entities.forEach((e) => {
    log.info("entity", e.id);
    e.components.sort((a, b) => (a.constructor.name < b.constructor.name ? -1 : 1));
    e.components.forEach((comp) => {
      log.info("  component", comp.constructor.name);
      for (let prop in comp) {
        let v = comp[prop];
        if (v === undefined) {
          log.info(`    ${prop} [undefined]`);
        } else {
          if (typeof v == "object") {
            log.info(`    ${prop}`, comp[prop]);
          } else {
            log.info(`    ${prop} ${v}`);
          }
        }
      }
    });
  });
}

export function componentNameList(comps: Component[] | ComponentCollection<Component>): string {
  return comps.map((c: Component) => c.constructor.name).join(",");
}

export function entityIdList(entities: IdEntity[]): string {
  return entities.map((e: IdEntity) => "e" + e.id).join(",");
}
