import { AbstractEntitySystem } from "@trixt0r/ecs";
import { AbstractMesh, DynamicTexture, PlaneBuilder, Scene, StandardMaterial, TransformNode } from "babylonjs";
import { AimAt, BjsModel, InitNametag } from "../../shared/Components";
import { removeComponent } from "../../shared/EcsOps";
import { IdEntity } from "../../shared/IdEntity";
import createLogger from "../../shared/logsetup";
import { ClientWorldRunOptions } from "../../shared/types";
import { Nametag } from "../Components";
import { RepaintNametag } from "./RepaintNametag";

const log = createLogger("system");

export class CreateNametag extends AbstractEntitySystem<IdEntity> {
  constructor(priority: number) {
    super(priority, [BjsModel, AimAt, InitNametag]);
  }

  processEntity(entity: IdEntity, _index: number, _entities: unknown, options: ClientWorldRunOptions) {
    const aa = entity.components.get(AimAt);

    const aimAt = aa.getAimObj(entity, options.scene);
    log.info("applying nametag, aimAt is", aimAt);
    if (!aimAt) {
      // keep waiting for this
      return;
    }

    const init = entity.components.get(InitNametag);

    const scl = 0.003;
    const plane = PlaneBuilder.CreatePlane(entity.localName("nametag"), { width: 256 * scl, height: 64 * scl }, options.scene);

    plane.parent = aimAt as AbstractMesh;
    plane.position.y = init.offsetY;

    // {
    //   // we're probably under a blender coord swap node now :(
    //   plane.scaling.y *= -1;
    //   plane.position.y *= -1;
    // }
    var { mat, tx } = this.createMaterial(entity, options.scene);
    plane.material = mat;
    plane.billboardMode = TransformNode.BILLBOARDMODE_ALL;

    const netPlayer = init.netPlayer;

    {
      // where does this go? In RepaintNametag somehow?
      const onNickChanged = () => {
        log.info("onNickChanged", netPlayer.nick);
        new RepaintNametag(0).repaint(tx, netPlayer.nick);
      };
      log.info("listening for nick change on ", netPlayer.sessionId);
      netPlayer.listen("nick", onNickChanged);
      onNickChanged();
    }

    entity.components.add(new Nametag(plane, tx));
    removeComponent(entity, InitNametag);
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
