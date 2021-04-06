import { Component, ComponentCollection } from "@trixt0r/ecs";
import { AbstractMesh, DynamicTexture, PlaneBuilder, Scene, StandardMaterial, TransformNode } from "babylonjs";
import { autorun } from "mobx";
import { AimAt, Nametag, PlayerPose } from "../../shared/Components";
import { IdEntity } from "../../shared/IdEntity";
import { KeepProcessing, LoadUnloadSystem } from "../../shared/LoadUnloadSystem";
import createLogger from "../../shared/logsetup";
import { ClientWorldRunOptions } from "../../shared/types";
const log = createLogger("nametag");

export class NametagLoadUnload extends LoadUnloadSystem {
  requiredComponentTypes = [Nametag, AimAt, PlayerPose];
  processAdded(entity: IdEntity, options: ClientWorldRunOptions): KeepProcessing {
    const nt = entity.components.get(Nametag);
    const aa = entity.components.get(AimAt);
    const aimAt = aa.getAimObj(entity, options.scene);
    if (!aimAt) {
      // keep waiting for this
      return KeepProcessing.KEEP_PROCESSING;
    }
    log.info("applying nametag, aimAt is", aimAt);

    const scl = 0.003;
    nt.plane = PlaneBuilder.CreatePlane(entity.localName("nametag"), { width: 256 * scl, height: 64 * scl }, options.scene);

    nt.plane.parent = aimAt as AbstractMesh;
    autorun(() => {
      nt.plane!.position = nt.offset;
    });

    var { mat, tx } = this.createMaterial(entity, options.scene);
    nt.tx = tx;
    nt.mat = mat;
    nt.plane.material = mat;
    nt.plane.billboardMode = TransformNode.BILLBOARDMODE_ALL;

    autorun(() => {
      const pp = entity.components.get(PlayerPose);
      const fg = "#ffffffff";
      const bg = "#000000ff";
      const msg = nt.text;
      const pose = pp.waving ? " *wave*" : "";
      tx.drawText(msg + pose, 0, 50, "35px sans", fg, bg, /*invertY=*/ true, /*update=*/ true);
    });
    return KeepProcessing.STOP_PROCESSING;
  }

  onRemoved(_entity: IdEntity, components: ComponentCollection<Component>) {
    const nt = components.get(Nametag);
    nt.plane?.dispose();
    nt.tx?.dispose();
    nt.mat?.dispose();
  }

  private createMaterial(entity: IdEntity, scene: Scene) {
    const tx = new DynamicTexture(
      entity.localName("nametag"),
      { width: 256, height: 64 },
      scene,
      false // types bug made this nonoptional?
    );
    tx.hasAlpha = true;

    var mat = new StandardMaterial(entity.localName("nametag"), scene);
    mat.emissiveTexture = tx;
    mat.disableLighting = true;
    mat.transparencyMode = 3;
    mat.useAlphaFromDiffuseTexture = true;
    return { mat, tx };
  }
}
