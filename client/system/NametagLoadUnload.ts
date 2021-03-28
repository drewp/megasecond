import { autorun } from "mobx";
import { AbstractMesh, DynamicTexture, PlaneBuilder, Scene, StandardMaterial, TransformNode } from "babylonjs";
import { AimAt } from "../../shared/Components";
import { IdEntity } from "../../shared/IdEntity";
import { KeepProcessing, LoadUnloadSystem } from "../../shared/LoadUnloadSystem";
import createLogger from "../../shared/logsetup";
import { ClientWorldRunOptions } from "../../shared/types";
import { Nametag } from "../../shared/Components";
const log = createLogger("system");

export class NametagLoadUnload extends LoadUnloadSystem {
  requiredComponents = [Nametag, AimAt];
  processAdded(entity: IdEntity, options: ClientWorldRunOptions): KeepProcessing {
    const nt = entity.components.get(Nametag);
    const aa = entity.components.get(AimAt);
    const aimAt = aa.getAimObj(entity, options.scene);
    log.info("applying nametag, aimAt is", aimAt);
    if (!aimAt) {
      // keep waiting for this
      return KeepProcessing.KEEP_PROCESSING;
    }

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

    log.info("autorun 1st time");
    autorun(() => {
      tx.getContext().fillStyle = "#00000000";
      tx.clear();
      const msg = nt.text;
      log.info("  repaint", msg);
      tx.drawText(msg, 0, 50, "40px sans", "#ffffffff", "#00000000", true, true);
    });
    return KeepProcessing.STOP_PROCESSING;
  }
  onRemoved(entity: IdEntity) {
    const nt = entity.components.get(Nametag);
    log.info("nametag unload", nt);
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
    log.info("created texture");

    var mat = new StandardMaterial(entity.localName("nametag"), scene);
    mat.diffuseTexture = tx;
    mat.disableLighting = true;
    mat.transparencyMode = 3;
    mat.useAlphaFromDiffuseTexture = true;
    return { mat, tx };
  }
}
