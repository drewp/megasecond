import { AxesViewer, InstancedMesh, Mesh, Scene, ShadowGenerator, TransformNode, Vector3 } from "babylonjs";
import { FollowCam } from "./FollowCam";

export class PlayerView {
  // makes one player from base models. owns scene objects. low-level controls.
  //
  // X=left, Y=up, Z=fwd
  private body?: InstancedMesh;
  private aimAt?: TransformNode;
  constructor(private scene: Scene, private name: string) {
    this.makeInstance();
  }
  makeInstance() {
    const playerReferenceModel = this.scene.getMeshByName("player");
    const refAim = this.scene.getTransformNodeByName("player_aim")!;
    if (!playerReferenceModel || !refAim) {
      throw new Error("no ref yet");
    }
    this.body = (playerReferenceModel as Mesh).createInstance(`${this.name}-body`);
    this.aimAt = new TransformNode(`${this.name}-aim`);
    this.aimAt.parent = this.body;

    const refOffset = refAim.position.subtract(playerReferenceModel.position);
    this.aimAt.position = this.body.position.add(refOffset);
    const sunCaster = (window as any).gen as ShadowGenerator; // todo
    sunCaster.addShadowCaster(this.body);

  }
  dispose() {
    this.body?.dispose();
  }
  step(dt: number, pos: Vector3, facing: Vector3, fcam: FollowCam | undefined) {
    const b = this.body!;
    b.position.copyFrom(pos);
    b.lookAt(b.position.add(facing)); // todo: maybe with animation
    if (fcam) {
      fcam.step(dt, pos, facing);
    }
  }
  getCamTarget(): TransformNode {
    return this.aimAt!;
  }
}
