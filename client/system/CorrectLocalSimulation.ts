import { AbstractEntitySystem } from "@trixt0r/ecs";
import { S_PlayerPose, S_Transform } from "../../shared/Components";
import { IdEntity } from "../../shared/IdEntity";
import createLogger from "../../shared/logsetup";
import { ClientWorldRunOptions } from "../../shared/types";
import { C_PlayerPose, C_Transform, LocallyDriven } from "../Components";
const log = createLogger("system");

export class CorrectLocalSimulation extends AbstractEntitySystem<IdEntity> {
  // S_ values to C_ values, for transform, etc
  constructor(priority: number) {
    super(priority, [S_Transform, C_Transform, S_PlayerPose, C_PlayerPose]);
  }

  processEntity(entity: IdEntity, _index: number, _entities: unknown, _options: ClientWorldRunOptions) {
    if (entity.components.get(LocallyDriven)) {
      // it's me; server is not authoritative yet, and we don't have correction code
      return;
    }
    const st = entity.getComponentReadonly(S_Transform);
    const ct = entity.components.get(C_Transform);
    ct.pos = st.pos;
    ct.facing = st.facing;

    const sp = entity.getComponentReadonly(S_PlayerPose);
    const cp = entity.components.get(C_PlayerPose);
    cp.waving = sp.waving;
  }
}
