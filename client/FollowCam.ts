import { AbstractMesh, FollowCamera, Scene, TransformNode, Vector3 } from "babylonjs";



export class FollowCam {
    private cam: FollowCamera;
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
    setTarget(me: TransformNode) {
      this.cam.lockedTarget = me as AbstractMesh;
    }
    onMouseY(movementY: number) {
      this.cam.heightOffset += 0.001 * movementY;
    }
    step(dt: number, pos: Vector3, facing: Vector3) {
      // try to get behind player, don't crash walls
      let heading = (360 / 6.28) * Math.atan2(-facing.z, facing.x) + 270;
      while (Math.abs(heading - 360 - this.cam.rotationOffset) < Math.abs(heading - this.cam.rotationOffset)) {
        heading -= 360;
      }
      this.cam.rotationOffset += (dt * 20 * (heading - this.cam.rotationOffset)) % 360;
    }
  }