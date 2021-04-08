import { AbstractEntitySystem } from "@trixt0r/ecs";
import { Quaternion, Vector3 } from "babylonjs";
import {  S_Transform, S_Twirl } from "../../shared/Components";
import { IdEntity } from "../../shared/IdEntity";
import createLogger from "../../shared/logsetup";
import { ClientWorldRunOptions } from "../../shared/types";
import { BjsModel, C_Transform } from "../Components";

const log = createLogger("system");

export class SimpleMove extends AbstractEntitySystem<IdEntity> {
  constructor(priority: number) {
    super(priority, [BjsModel, C_Transform, S_Twirl]);
  }

  processEntity(entity: IdEntity, _index: number, _entities: unknown, options: ClientWorldRunOptions) {
    const tr = entity.components.get(C_Transform);
    const tw = entity.getComponentReadonly(S_Twirl);

    // (accumulates error)
    const rot = Quaternion.RotationAxis(Vector3.Up(), tw.degPerSec * options.dt);
    const nf = Vector3.Zero();
    tr.facing.rotateByQuaternionAroundPointToRef(rot, Vector3.Zero(), nf);
    tr.facing.copyFrom(nf);
  }
}
