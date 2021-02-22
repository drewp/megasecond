import {
  AxesViewer,
  StandardMaterial,
  DynamicTexture,
  InstancedMesh,
  Mesh,
  Scene,
  ShadowGenerator,
  TransformNode,
  Vector3,
  AbstractMesh,
  PlaneBuilder,
} from "babylonjs";
import { FollowCam } from "./FollowCam";

export class PlayerView {
  // makes one player from base models. owns scene objects. low-level controls.
  //
  // X=left, Y=up, Z=fwd
  private body?: InstancedMesh;
  private aimAt?: TransformNode;
  private nametag?: AbstractMesh;
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

    this.nametag = this.makeNametag();

    const sunCaster = (window as any).gen as ShadowGenerator; // todo
    if (sunCaster) {
      sunCaster.addShadowCaster(this.body);
    }
  }

  makeNametag() {
    const scl = 0.2;
    const plane = PlaneBuilder.CreatePlane(`nametag-${this.name}`, { width: 480 * scl, height: 64 * scl }, this.scene);
    plane.parent = this.aimAt!;
    plane.position.y = 20;

    var tx = new DynamicTexture(
      `nametag-${this.name}`,
      { width: 256, height: 64 },
      this.scene,
      false // types bug made this nonoptional?
    );
    tx.hasAlpha = true;
    tx.drawText(this.name, 0, 50, "45px sans", "#ffffffff", "#00000000", true, true);

    var mat = new StandardMaterial(`nametag-${this.name}`, this.scene);
    mat.diffuseTexture = tx;
    mat.disableLighting = true;
    mat.transparencyMode = 3;
    mat.useAlphaFromDiffuseTexture = true;
    plane.material = mat;
    plane.billboardMode = TransformNode.BILLBOARDMODE_ALL;

    return plane;
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
