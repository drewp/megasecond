import { AbstractEntitySystem } from "@trixt0r/ecs";
import { S_Model, S_Touchable, S_Toucher, S_Transform } from "../Components";
import { removeComponentsOfType } from "../EcsOps";
import { IdEntity } from "../IdEntity";
import createLogger from "../logsetup";
import { CommonWorldRunOptions } from "../types";

const log = createLogger("system");

export class Pickup extends AbstractEntitySystem<IdEntity> {
  constructor(priority: number) {
    super(priority, [S_Toucher]);
  }

  processEntity<U>(entity: IdEntity, index?: number | undefined, entities?: IdEntity[] | undefined, options?: U | undefined): void {
    this.processEntity2(entity, index!, entities, options as unknown as CommonWorldRunOptions)
  }
    processEntity2(entity: IdEntity, _index: number, _entities: unknown, _options: CommonWorldRunOptions) {
    if (!this.engine) return;
    const tu = entity.getComponentReadonly(S_Toucher);
    if (tu.currentlyTouching.size > 0) {
      tu.currentlyTouching.forEach((obj) => {
        removeComponentsOfType(obj, S_Transform);
        removeComponentsOfType(obj, S_Touchable);
        removeComponentsOfType(obj, S_Model); // another system should be doing this, e.g. when Touchable is removed
      });
    }
  }
}
