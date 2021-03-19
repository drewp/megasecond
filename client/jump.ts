import { AbstractEntitySystem, Component } from "@trixt0r/ecs";
import { removeComponent } from "../shared/EcsOps";
import { IdEntity } from "../shared/IdEntity";
import { Transform } from "../shared/Transform";
import { ClientWorldRunOptions } from "../shared/types";
import { UsesNav } from "./walkAlongNavMesh";

export class InitJump implements Component {
  constructor() {}
}

export class PlayerJump extends AbstractEntitySystem<IdEntity> {
  constructor(priority: number) {
    super(priority, [Transform, InitJump]);
  }

  processEntity(entity: IdEntity, _index: number, _entities: unknown, _options: ClientWorldRunOptions) {
    const pt = entity.components.get(Transform);
    const un = entity.components.get(UsesNav);
    if (un.grounded) {
      pt.vel.y = 3;
    }

    removeComponent(entity, InitJump);
  }
}
