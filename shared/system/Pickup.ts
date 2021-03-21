import { AbstractEntitySystem } from "@trixt0r/ecs";
import { BjsMesh, Touchable, Toucher, Transform } from "../Components";
import { removeComponent } from "../EcsOps";
import { IdEntity } from "../IdEntity";
import createLogger from "../logsetup";
import { CommonWorldRunOptions } from "../types";

const log = createLogger("system");

export class Pickup extends AbstractEntitySystem<IdEntity> {
  constructor(priority: number) {
    super(priority, [Toucher]);
  }

  processEntity(entity: IdEntity, _index: number, _entities: unknown, _options: CommonWorldRunOptions) {
    if (!this.engine) return;
    const tu = entity.components.get(Toucher);
    if (tu.currentlyTouching.size > 0) {
      tu.currentlyTouching.forEach((obj) => {
        removeComponent(obj, Transform);
        removeComponent(obj, Touchable);
        removeComponent(obj, BjsMesh); // another system should be doing this, e.g. when Touchable is removed
      });
    }
  }
}
