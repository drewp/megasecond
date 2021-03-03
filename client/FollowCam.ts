import { AbstractEntitySystem } from "@trixt0r/ecs";
import { Component } from "@trixt0r/ecs";
import { AbstractMesh, FollowCamera, Scene, TransformNode, Vector3 } from "babylonjs";
import { IdEntity } from "./IdEntity";
import { WorldRunOptions } from "./types";

import createLogger from "logging";
import { Transform } from "./Motion";

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
  processEntity(entity: IdEntity, index: number, entities: unknown, options: WorldRunOptions) {
    const dt = options.dt;
    const cc = entity.components;
    const cam = cc.get(LocalCam).cam;
    const heading = cc.get(Transform).heading;

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
