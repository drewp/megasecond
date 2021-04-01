import { AbstractEntitySystem } from "@trixt0r/ecs";
import { Transform } from "../../shared/Components";
import { round4 } from "../../shared/debug";
import { IdEntity } from "../../shared/IdEntity";
import createLogger from "../../shared/logsetup";
import { ClientWorldRunOptions } from "../../shared/types";
import { LocallyDriven, ServerRepresented } from "../Components";

const log = createLogger("system");

export class SendUntrustedLocalPos extends AbstractEntitySystem<IdEntity> {
  // - to replace with input commands
  constructor(priority: number) {
    super(priority, [ServerRepresented, Transform]);
  }

  processEntity(entity: IdEntity, _index: number, _entities: unknown, _options: ClientWorldRunOptions) {
    const pt = entity.components.get(Transform);
    const sr = entity.components.get(ServerRepresented);

    const pos = pt.pos;
    const facing = pt.facing;
    const now = Date.now();
    const minSendPeriodMs = 100;
    if (sr.lastSentTime > now - minSendPeriodMs) return;

    if (
      sr.lastSent !== undefined && //
      sr.lastSent.x == round4(pos.x) &&
      sr.lastSent.y == round4(pos.y) &&
      sr.lastSent.z == round4(pos.z) &&
      sr.lastSent.facingX == round4(facing.x) &&
      sr.lastSent.facingY == round4(facing.y) &&
      sr.lastSent.facingZ == round4(facing.z)
    ) {
      return;
    }
    sr.lastSent = { x: round4(pos.x), y: round4(pos.y), z: round4(pos.z), facingX: round4(facing.x), facingY: round4(facing.y), facingZ: round4(facing.z) };
    sr.worldRoom.send("playerMove", sr.lastSent);
    sr.lastSentTime = now;
  }
}
