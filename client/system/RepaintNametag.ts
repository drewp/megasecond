import { AbstractEntitySystem } from "@trixt0r/ecs";
import { DynamicTexture } from "babylonjs";
import { IdEntity } from "../../shared/IdEntity";
import createLogger from "../../shared/logsetup";
import { ClientWorldRunOptions } from "../../shared/types";
import { Nametag } from "../Components";

const log = createLogger("system");

export class RepaintNametag extends AbstractEntitySystem<IdEntity> {
  constructor(priority: number) {
    super(priority, [Nametag]);
  }

  processEntity(_entity: IdEntity, _index: number, _entities: unknown, _options: ClientWorldRunOptions) {}

  repaint(tx: DynamicTexture, msg: string) {
    tx.getContext().fillStyle = "#00000000";
    tx.clear();
    log.info("repaint", msg);
    tx.drawText(msg, 0, 50, "40px sans", "#ffffffff", "#00000000", true, true);
  }
}
