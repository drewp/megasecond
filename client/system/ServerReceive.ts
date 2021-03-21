import { AbstractEntitySystem } from "@trixt0r/ecs";
import { Vector3 } from "babylonjs";
import { Transform } from "../../shared/Components";
import { IdEntity } from "../../shared/IdEntity";
import createLogger from "../../shared/logsetup";
import { ClientWorldRunOptions } from "../../shared/types";
import { ServerRepresented } from "../Components";

const log = createLogger("system");

export class ServerReceive extends AbstractEntitySystem<IdEntity> {
  constructor(priority: number) {
    super(priority, [ServerRepresented, Transform]);
  }

  processEntity(entity: IdEntity, _index: number, _entities: unknown, _options: ClientWorldRunOptions) {
    const sr = entity.components.get(ServerRepresented);
    const np = sr.netPlayer;
    // this is rewriting a lot- we could use a watcher on the colyseus half
    sr.receivedPos = new Vector3(np.x, np.y, np.z);
    sr.receivedFacing = new Vector3(np.facingX, np.facingY, np.facingZ);
  }
}
