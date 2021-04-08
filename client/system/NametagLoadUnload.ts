import { Component, ComponentCollection } from "@trixt0r/ecs";
import { AbstractMesh, DynamicTexture, PlaneBuilder, Scene, StandardMaterial, TransformNode } from "babylonjs";
import { autorun } from "mobx";
import { S_AimAt, S_Nametag } from "../../shared/Components";
import { IdEntity } from "../../shared/IdEntity";
import { KeepProcessing, LoadUnloadSystem } from "../../shared/LoadUnloadSystem";
import createLogger from "../../shared/logsetup";
import { ClientWorldRunOptions } from "../../shared/types";
import { C_Nametag } from "../Components";
const log = createLogger("nametag");

export class NametagLoadUnload extends LoadUnloadSystem {
  requiredComponentTypes = [S_Nametag, C_Nametag, S_AimAt];
  processAdded(entity: IdEntity, options: ClientWorldRunOptions): KeepProcessing {
    const nt = entity.getComponentReadonly(S_Nametag);
    const ct = entity.components.get(C_Nametag);
    const aa = entity.getComponentReadonly(S_AimAt);
    const aimAt = aa.getAimObj(entity, options.scene);
    if (!aimAt) {
      // keep waiting for this
      return KeepProcessing.KEEP_PROCESSING;
    }

    const scl = 0.003;
    ct.plane = PlaneBuilder.CreatePlane(entity.localName("nametag"), { width: 256 * scl, height: 64 * scl }, options.scene);

    ct.plane.parent = aimAt as AbstractMesh;
    autorun(() => {
      ct.plane!.position = nt.offset;
    });

    var { mat, tx } = this.createMaterial(entity, options.scene);
    ct.tx = tx;
    ct.mat = mat;
    ct.plane.material = mat;
    ct.plane.billboardMode = TransformNode.BILLBOARDMODE_ALL;

    autorun(() => {
      const fg = "#ffffffff";
      const bg = "#000000ff";
      const msg = nt.text;
      tx.drawText(msg, 0, 50, "35px sans", fg, bg, /*invertY=*/ true, /*update=*/ true);
    });
    return KeepProcessing.STOP_PROCESSING;
  }

  onRemoved(_entity: IdEntity, components: ComponentCollection<Component>) {
    const ct = components.get(C_Nametag);
    ct.plane?.dispose();
    ct.tx?.dispose();
    ct.mat?.dispose();
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
