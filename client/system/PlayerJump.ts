import { AbstractEntitySystem } from "@trixt0r/ecs";
import { S_Sim, S_Transform, S_UsesNav } from "../../shared/Components";
import { IdEntity } from "../../shared/IdEntity";
import createLogger from "../../shared/logsetup";
import { ClientWorldRunOptions } from "../../shared/types";
import { Action, C_Sim, LocallyDriven, C_UsesNav } from "../Components";
const log = createLogger("system");

export class PlayerJump extends AbstractEntitySystem<IdEntity> {
  constructor(priority: number) {
    super(priority, [LocallyDriven, C_Sim, C_UsesNav]);
  }
  processEntity<U>(entity: IdEntity, index?: number | undefined, entities?: IdEntity[] | undefined, options?: U | undefined): void {
    this.processEntity2(entity, index!, entities, options as unknown as ClientWorldRunOptions)
  }
  processEntity2(entity: IdEntity, _index: number, _entities: unknown, _options: ClientWorldRunOptions) {
    const ld = entity.components.get(LocallyDriven);
    ld.forAction(Action.Jump, () => {
      const si = entity.getComponentReadonly(C_Sim);
      const un = entity.getComponentReadonly(C_UsesNav);
      if (un.grounded) {
        si.vel.y = 3;
      }
    });
  }
}
