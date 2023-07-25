import { AbstractEntitySystem } from "@trixt0r/ecs";
import { Quaternion, Vector3 } from "babylonjs";
import { S_Transform, S_Twirl } from "../../shared/Components";
import { IdEntity } from "../../shared/IdEntity";
import createLogger from "../../shared/logsetup";
import { ClientWorldRunOptions } from "../../shared/types";
import { BjsModel, C_Transform } from "../Components";

const log = createLogger("system");

export class SimpleMove extends AbstractEntitySystem<IdEntity> {
  // a local cosmetic animation layered on top of the server's transform
  constructor(priority: number) {
    super(priority, [BjsModel, S_Transform, C_Transform, S_Twirl]);
  }
  processEntity<U>(entity: IdEntity, index?: number | undefined, entities?: IdEntity[] | undefined, options?: U | undefined): void {
    this.processEntity2(entity, index!, entities, options as unknown as ClientWorldRunOptions)
  }
  processEntity2(entity: IdEntity, _index: number, _entities: unknown, options: ClientWorldRunOptions) {
    const tw = entity.getComponentReadonly(S_Twirl);
    const st = entity.getComponentReadonly(S_Transform);
    const ct = entity.components.get(C_Transform);

    ct.pos = st.pos;

    const now = Date.now() / 1000;
    const rot = Quaternion.RotationAxis(Vector3.Up(), tw.degPerSec * (now - tw.start));
    ct.facing = st.facing.clone();
    ct.facing.rotateByQuaternionAroundPointToRef(rot, Vector3.Zero(), ct.facing);
  }
}
