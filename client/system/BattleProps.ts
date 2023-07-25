import { AbstractEntitySystem, Component, ComponentCollection } from "@trixt0r/ecs";
import { CylinderBuilder, Mesh, ShaderMaterial } from "babylonjs";
import { S_PlayerPose, S_Transform } from "../../shared/Components";
import { removeComponentsOfType } from "../../shared/EcsOps";
import { IdEntity } from "../../shared/IdEntity";
import { KeepProcessing, LoadUnloadSystem } from "../../shared/LoadUnloadSystem";
import createLogger from "../../shared/logsetup";
import { ClientWorldRunOptions } from "../../shared/types";
import { BattleRing, C_PlayerPose, C_Transform } from "../Components";
const log = createLogger("BattleProps");

export class BattleRingPresence extends AbstractEntitySystem<IdEntity> {
  constructor(priority: number) {
    super(priority, [C_PlayerPose]);
  }
  processEntity<U>(entity: IdEntity, index?: number | undefined, entities?: IdEntity[] | undefined, options?: U | undefined): void {
    this.processEntity2(entity, index!, entities, options as unknown as ClientWorldRunOptions)
  }
  processEntity2(entity: IdEntity, _index: number, _entities: unknown, _options: ClientWorldRunOptions) {
    const pp = entity.getComponentReadonly(C_PlayerPose);
    const br = entity.components.get(BattleRing);
    if (pp.waving && !br) {
      entity.components.add(new BattleRing());
    }

    if (!pp.waving && br) {
      removeComponentsOfType(entity, BattleRing);
    }
  }
}

export class BattleRingLoad extends LoadUnloadSystem {
  requiredComponentTypes = [BattleRing];
  processAdded(entity: IdEntity, options: ClientWorldRunOptions): KeepProcessing {
    const br = entity.components.get(BattleRing);

    br.cyl = CylinderBuilder.CreateCylinder(
      entity.localName("ring"),
      { height: 10, diameter: 3, cap: Mesh.NO_CAP, sideOrientation: Mesh.DOUBLESIDE },
      options.scene
    );

    // should be shared between rings
    br.mat = new ShaderMaterial(entity.localName("ring"), options.scene, "./shader/ring", {
      attributes: ["position", "normal", "uv"],
      uniforms: ["world", "worldView", "worldViewProjection", "view", "projection", "time"],
      needAlphaBlending: true,
      needAlphaTesting: true,
    });
    br.startTime = Date.now() / 1000;
    br.cyl.material = br.mat;
    br.mat.backFaceCulling = false;
    return KeepProcessing.STOP_PROCESSING;
  }

  onRemoved(_entity: IdEntity, components: ComponentCollection<Component>) {
    const br = components.get(BattleRing);
    br.cyl?.dispose();
  }
}

export class BattleRingAnim extends AbstractEntitySystem<IdEntity> {
  constructor(priority: number) {
    super(priority, [BattleRing, C_Transform]);
  }
  processEntity<U>(entity: IdEntity, index?: number | undefined, entities?: IdEntity[] | undefined, options?: U | undefined): void {
    this.processEntity2(entity, index!, entities, options as unknown as ClientWorldRunOptions)
  }
  processEntity2(entity: IdEntity, _index: number, _entities: unknown, _options: ClientWorldRunOptions) {
    const tr = entity.getComponentReadonly(C_Transform);
    const br = entity.components.get(BattleRing);
    if (!br.cyl) {
      return;
    }
    br.mat?.setFloat("time", Date.now() / 1000 - br.startTime);
    br.cyl.position = tr.pos;
  }
}
