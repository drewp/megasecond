import { AbstractEntitySystem, Component } from "@trixt0r/ecs";
import { DynamicTexture, Mesh, PlaneBuilder, Scene, StandardMaterial, TransformNode } from "babylonjs";
import { removeComponent } from "./EcsOps";
import { IdEntity } from "./IdEntity";
import { BjsMesh } from "./PlayerView";
import { WorldRunOptions } from "./types";
import { Player as NetPlayer, WorldState } from "../shared/WorldRoom";

// i want a nametag
export class InitNametag implements Component {
  constructor(public scene: Scene, public offsetY = 20, public netPlayer: NetPlayer) {}
}

// i have a nametag
export class Nametag implements Component {
  constructor(public plane: Mesh, public tx: DynamicTexture) {}
}

export class CreateNametag extends AbstractEntitySystem<IdEntity> {
  processEntity(entity: IdEntity, _index: number, _entities: unknown, _options: WorldRunOptions) {
    const init = entity.components.get(InitNametag);
    const bm = entity.components.get(BjsMesh);
    const scl = 0.2;
    const suffix = init.netPlayer.sessionId;
    const plane = PlaneBuilder.CreatePlane(`nametag-${suffix}`, { width: 480 * scl, height: 64 * scl }, init.scene);
    plane.parent = bm.aimAt;
    plane.position.y = init.offsetY;

    const tx = new DynamicTexture(
      `nametag-${suffix}`,
      { width: 256, height: 64 },
      init.scene,
      false // types bug made this nonoptional?
    );
    tx.hasAlpha = true;

    var mat = new StandardMaterial(`nametag-${suffix}`, init.scene);
    mat.diffuseTexture = tx;
    mat.disableLighting = true;
    mat.transparencyMode = 3;
    mat.useAlphaFromDiffuseTexture = true;
    plane.material = mat;
    plane.billboardMode = TransformNode.BILLBOARDMODE_ALL;

    const netPlayer = init.netPlayer;

    {
      // where does this go? In RepaintNametag somehow?
      const onNickChanged = () => {
        new RepaintNametag().repaint(tx, netPlayer.nick);
      };
      netPlayer.listen("nick", onNickChanged);
      onNickChanged();
    }

    entity.components.add(new Nametag(plane, tx));
    removeComponent(entity, InitNametag);
  }
}

export class RepaintNametag extends AbstractEntitySystem<IdEntity> {
  processEntity(_entity: IdEntity, _index: number, _entities: unknown, _options: WorldRunOptions) {}

  repaint(tx: DynamicTexture, msg: string) {
    tx.getContext().fillStyle = "#00000000";
    tx.clear();
    tx.drawText(msg, 0, 50, "45px sans", "#ffffffff", "#00000000", true, true);
  }
}
