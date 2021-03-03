import { AbstractEntitySystem, Component } from "@trixt0r/ecs";
import { removeComponent } from "./EcsOps";
import { IdEntity } from "./IdEntity";
import { Transform } from "./Motion";
import { WorldRunOptions } from "./types";
import { UsesNav } from "./walkAlongNavMesh";

export class InitJump implements Component {
  constructor() {}
}

export class PlayerJump extends AbstractEntitySystem<IdEntity> {
  processEntity(entity: IdEntity, _index: number, _entities: unknown, _options: WorldRunOptions) {
    const pt = entity.components.get(Transform);
    const un = entity.components.get(UsesNav);
    if (un.grounded) {
      pt.vel.y = 3;
    }

    removeComponent(entity, InitJump);
  }
}
