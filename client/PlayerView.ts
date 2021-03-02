import { AbstractEntitySystem, Component } from "@trixt0r/ecs";
import { DynamicTexture, InstancedMesh, Mesh, PlaneBuilder, Scene, ShadowGenerator, StandardMaterial, TransformNode } from "babylonjs";
import createLogger from "logging";
import { removeComponent } from "./EcsOps";
import { IdEntity } from "./IdEntity";
import { PlayerTransform } from "./PlayerMotion";
import { WorldRunOptions } from "./types";

const log = createLogger("PlayerView");

export class PlayerView implements Component {
  // X=left, Y=up, Z=fwd
  public body: InstancedMesh;
  public aimAt: TransformNode;
  // public nametag: AbstractMesh;
  constructor(scene: Scene, playerId: string) {
    const playerReferenceModel = scene.getMeshByName("player");
    const refAim = scene.getTransformNodeByName("player_aim")!;
    if (!playerReferenceModel || !refAim) {
      throw new Error("no ref yet");
    }
    this.body = (playerReferenceModel as Mesh).createInstance(`${playerId}-body`);
    this.aimAt = new TransformNode(`${playerId}-aim`);
    this.aimAt.parent = this.body;

    const refOffset = refAim.position.subtract(playerReferenceModel.position);
    this.aimAt.position = this.body.position.add(refOffset);

    // this.nametag = this.makeNametag();

    const sunCaster = (window as any).gen as ShadowGenerator; // todo
    if (sunCaster) {
      sunCaster.addShadowCaster(this.body);
    }
  }
  onRemoved() {
    // where does this go?
    this.body?.dispose();
  }
}

// i want a nametag
export class InitNametag implements Component {
  constructor(public scene: Scene, public offsetY = 20, public suffix: string) {}
}

// i have a nametag
export class Nametag implements Component {
  constructor(public plane: Mesh, public tx: DynamicTexture) {}
}

export class CreateNametag extends AbstractEntitySystem<IdEntity> {
  processEntity(entity: IdEntity, index: number, entities: unknown, options: WorldRunOptions) {
    const init = entity.components.get(InitNametag);
    const pv = entity.components.get(PlayerView);
    const scl = 0.2;
    const plane = PlaneBuilder.CreatePlane(`nametag-${init.suffix}`, { width: 480 * scl, height: 64 * scl }, init.scene);
    plane.parent = pv.aimAt;
    plane.position.y = init.offsetY;

    const tx = new DynamicTexture(
      `nametag-${init.suffix}`,
      { width: 256, height: 64 },
      init.scene,
      false // types bug made this nonoptional?
    );
    tx.hasAlpha = true;

    var mat = new StandardMaterial(`nametag-${init.suffix}`, init.scene);
    mat.diffuseTexture = tx;
    mat.disableLighting = true;
    mat.transparencyMode = 3;
    mat.useAlphaFromDiffuseTexture = true;
    plane.material = mat;
    plane.billboardMode = TransformNode.BILLBOARDMODE_ALL;

    entity.components.add(new Nametag(plane, tx));
    removeComponent(entity, InitNametag);
  }
}

export class RepaintNametag extends AbstractEntitySystem<IdEntity> {
  processEntity(entity: IdEntity, index: number, entities: unknown, options: WorldRunOptions) {}

  repaint(tx: DynamicTexture, msg: string) {
    tx.getContext().fillStyle = "#00000000";
    tx.clear();
    tx.drawText(msg, 0, 50, "45px sans", "#ffffffff", "#00000000", true, true);
  }
  // onRemoved() {
  //   this.nametag?.dispose();
  // }
}

export class PlayerViewMovement extends AbstractEntitySystem<IdEntity> {
  processEntity(entity: IdEntity, index: number, entities: unknown, options: WorldRunOptions) {
    const b = entity.components.get(PlayerView).body;
    b.position.copyFrom(entity.components.get(PlayerTransform).pos);
    b.lookAt(b.position.add(entity.components.get(PlayerTransform).facing)); // todo: maybe with animation
  }
}
