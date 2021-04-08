import { AbstractEntitySystem } from "@trixt0r/ecs";
import {  S_PlayerPose } from "../../shared/Components";
import { IdEntity } from "../../shared/IdEntity";
import createLogger from "../../shared/logsetup";
import { ClientWorldRunOptions } from "../../shared/types";
import { BjsModel } from "../Components";

const log = createLogger("system");

export class AnimatePlayerPose extends AbstractEntitySystem<IdEntity> {
  constructor(priority: number) {
    super(priority, [S_PlayerPose, BjsModel]);
  }

  processEntity(entity: IdEntity, _index: number, _entities: unknown, _options: ClientWorldRunOptions) {
    const pp = entity.getComponentReadonly(S_PlayerPose);
    const bm = entity.components.get(BjsModel);

    if (pp.waving) {
      // bm.root.material
    }
  }
}
