import { AbstractEntitySystem } from "@trixt0r/ecs";
import { AbstractMesh } from "babylonjs";
import { S_AimAt } from "../../shared/Components";
import { IdEntity } from "../../shared/IdEntity";
import createLogger from "../../shared/logsetup";
import { ClientWorldRunOptions } from "../../shared/types";
import { Action, BjsModel, C_Transform, LocalCam, LocallyDriven } from "../Components";

const log = createLogger("system");

export class LocalCamFollow extends AbstractEntitySystem<IdEntity> {
  constructor(priority: number) {
    super(priority, [C_Transform, S_AimAt, LocalCam, LocallyDriven, BjsModel]);
  }
  processEntity<U>(entity: IdEntity, index?: number | undefined, entities?: IdEntity[] | undefined, options?: U | undefined): void {
    this.processEntity2(entity, index!, entities, options as unknown as ClientWorldRunOptions)
  }
  processEntity2(entity: IdEntity, _index: number, _entities: unknown, options: ClientWorldRunOptions) {
    const cam = entity.components.get(LocalCam).cam;
    if (!cam) return;

    const heading = entity.getComponentReadonly(C_Transform).heading;
    const aa = entity.getComponentReadonly(S_AimAt);
    const ld = entity.components.get(LocallyDriven);
    const lc = entity.components.get(LocalCam);
    const bm = entity.components.get(BjsModel);

    ld.forAction(Action.ToggleBirdsEyeView, () => {
      lc.toggleBirdsEyeView();
    });

    const aimAt = bm.instance!.getChildTransformNode(aa.objName);
    if (aimAt) {
      cam.lockedTarget = aimAt as AbstractMesh;
    }
    cam.heightOffset += 0.0003 * ld.mouseY;

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
