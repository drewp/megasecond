import { AbstractEntitySystem } from "@trixt0r/ecs";
import { BjsModel, PlayerPose } from "../../shared/Components";
import { IdEntity } from "../../shared/IdEntity";
import createLogger from "../../shared/logsetup";
import { ClientWorldRunOptions } from "../../shared/types";

const log = createLogger("system");

export class AnimatePlayerPose extends AbstractEntitySystem<IdEntity> {
  constructor(priority: number) {
    super(priority, [PlayerPose, BjsModel]);
  }

  processEntity(entity: IdEntity, _index: number, _entities: unknown, _options: ClientWorldRunOptions) {
    const pp = entity.components.get(PlayerPose);
    const bm = entity.components.get(BjsModel);

    if (pp.waving) {
      // bm.root.material
    }
  }
}
