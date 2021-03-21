import { AbstractEntitySystem } from "@trixt0r/ecs";
import { AbstractMesh } from "babylonjs";
import { AimAt, BjsModel, Transform } from "../../shared/Components";
import { IdEntity } from "../../shared/IdEntity";
import createLogger from "../../shared/logsetup";
import { ClientWorldRunOptions } from "../../shared/types";
import { LocalCam } from "../Components";

const log = createLogger("system");

export class LocalCamFollow extends AbstractEntitySystem<IdEntity> {
  constructor(priority: number) {
    super(priority, [BjsModel, Transform, AimAt, LocalCam]);
  }

  processEntity(entity: IdEntity, _index: number, _entities: unknown, options: ClientWorldRunOptions) {
    const cam = entity.components.get(LocalCam).cam;
    const heading = entity.components.get(Transform).heading;
    const aa = entity.components.get(AimAt);
    const aimAt = aa.getAimObj(entity, options.scene);
    if (aimAt) {
      cam.lockedTarget = aimAt as AbstractMesh;
    }
    cam.heightOffset += 0.0003 * options.userInput.mouseY;

    // try to get behind player, don't crash walls
    let r = cam.rotationOffset;
    if (Math.abs(r - heading) > 180) {
      if (r < heading) {
        r += 360;
      } else {
        r -= 360;
      }
    }

    cam.rotationOffset = (r + options.dt * 10 * (heading - r)) % 360;
  }
}
