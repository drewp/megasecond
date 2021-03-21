import { AbstractEntitySystem } from "@trixt0r/ecs";
import { Transform } from "../../shared/Components";
import { IdEntity } from "../../shared/IdEntity";
import createLogger from "../../shared/logsetup";
import { ClientWorldRunOptions } from "../../shared/types";
import { LocallyDriven, ServerRepresented } from "../Components";
const log = createLogger("system");

export class CorrectLocalSimulation extends AbstractEntitySystem<IdEntity> {
  constructor(priority: number) {
    super(priority, [ServerRepresented, Transform]);
  }

  processEntity(entity: IdEntity, _index: number, _entities: unknown, _options: ClientWorldRunOptions) {
    if (entity.components.get(LocallyDriven)) {
      // it's me; server is not authoritative yet, and we don't have correction code
      return;
    }
    const pt = entity.components.get(Transform);
    const sr = entity.components.get(ServerRepresented);
    pt.pos = sr.receivedPos;
    pt.facing = sr.receivedFacing;
  }
}
