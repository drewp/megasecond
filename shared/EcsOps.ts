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
