import { AbstractEntitySystem, Component } from "@trixt0r/ecs";
import { AbstractMesh, FollowCamera, Scene, Vector3 } from "babylonjs";
import { IdEntity } from "../shared/IdEntity";
import createLogger from "../shared/logsetup";
import { Transform } from "../shared/Transform";
import { ClientWorldRunOptions } from "../shared/types";
import { AimAt, BjsMesh } from "./PlayerView";

const log = createLogger("PlayerMotion");

export class LocalCam implements Component {
  public cam: FollowCamera;
  public birds_eye_view = false;
  constructor(scene: Scene) {
    this.cam = new FollowCamera("cam", new Vector3(-1.4, 1.5, -4), scene);
    this.cam.inputs.clear();
    this.cam.radius = 2;
    this.cam.heightOffset = 1;
    this.cam.fov = 1.2;
    this.cam.rotationOffset = 180;
    this.cam.cameraAcceleration = 0.5;
    scene.switchActiveCamera(this.cam);
  }

  toggleBirdsEyeView() {
    if (!this.birds_eye_view) {
      this.cam.heightOffset += 100;
      this.birds_eye_view = true;
    } else {
      this.cam.heightOffset -= 100;
      this.birds_eye_view = false;
    }
  }
}

export class LocalCamFollow extends AbstractEntitySystem<IdEntity> {
  constructor(priority: number) {
    super(priority, [BjsMesh, Transform, AimAt, LocalCam]);
  }

  processEntity(entity: IdEntity, index: number, entities: unknown, options: ClientWorldRunOptions) {
    const dt = options.dt;
    const cam = entity.components.get(LocalCam).cam;
    const heading = entity.components.get(Transform).heading;
    const bm = entity.components.get(BjsMesh);
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

    cam.rotationOffset = (r + dt * 10 * (heading - r)) % 360;
  }
}
