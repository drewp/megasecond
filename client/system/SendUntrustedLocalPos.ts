import { AbstractEntitySystem } from "@trixt0r/ecs";
import { Transform } from "../../shared/Components";
import { IdEntity } from "../../shared/IdEntity";
import createLogger from "../../shared/logsetup";
import { ClientWorldRunOptions } from "../../shared/types";
import { LocallyDriven, ServerRepresented } from "../Components";

const log = createLogger("system");

export class SendUntrustedLocalPos extends AbstractEntitySystem<IdEntity> {
  // - to replace with input commands
  constructor(priority: number) {
    super(priority, [ServerRepresented, Transform, LocallyDriven]);
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
      sr.lastSent.x == pos.x &&
      sr.lastSent.y == pos.y &&
      sr.lastSent.z == pos.z &&
      sr.lastSent.facingX == facing.x &&
      sr.lastSent.facingY == facing.y &&
      sr.lastSent.facingZ == facing.z
    ) {
      return;
    }
    sr.lastSent = { x: pos.x, y: pos.y, z: pos.z, facingX: facing.x, facingY: facing.y, facingZ: facing.z };
    sr.worldRoom.send("playerMove", sr.lastSent);
    sr.lastSentTime = now;
  }
}
