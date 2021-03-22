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

    function r(x: number) {
      return Math.round(x * 10000) / 10000;
    }
    if (
      sr.lastSent !== undefined && //
      sr.lastSent.x == r(pos.x) &&
      sr.lastSent.y == r(pos.y) &&
      sr.lastSent.z == r(pos.z) &&
      sr.lastSent.facingX == r(facing.x) &&
      sr.lastSent.facingY == r(facing.y) &&
      sr.lastSent.facingZ == r(facing.z)
    ) {
      return;
    }
    sr.lastSent = { x: r(pos.x), y: r(pos.y), z: r(pos.z), facingX: r(facing.x), facingY: r(facing.y), facingZ: r(facing.z) };
    sr.worldRoom.send("playerMove", sr.lastSent);
    sr.lastSentTime = now;
  }
}
