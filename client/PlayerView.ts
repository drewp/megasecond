import { System } from "@trixt0r/ecs";
import { Engine } from "@trixt0r/ecs";
import { Aspect } from "@trixt0r/ecs";
import { AbstractEntitySystem, Component } from "@trixt0r/ecs";
import { AbstractMesh, AssetContainer, Mesh, Scene, SceneLoader, TransformNode, Vector3 } from "babylonjs";
import { IdEntity } from "../shared/IdEntity";
import createLogger from "../shared/logsetup";
import { Toucher } from "../shared/TouchItem";
import { Transform } from "../shared/Transform";
import { ClientWorldRunOptions } from "../shared/types";

const log = createLogger("PlayerView");

enum LoadState {
  NONE,
  STARTED_GET,
  LOADED,
}

export class BjsMesh implements Component {
  public root?: TransformNode;
  public loadState = LoadState.NONE;
  public container?: AssetContainer;
  constructor(public objName: string) {}
  dispose() {
    this.root?.dispose();
  }
}

export class BjsLoadUnload extends System {
  // Turn BjsMesh.objName into obj instance at BjsMesh.root; cleans up that root tree when BjsMesh component is deleted.
  private needLoad: Set<IdEntity> = new Set();
  onAddedToEngine(engine: Engine): void {
    Aspect.for(engine.entities)
      .all(BjsMesh)
      .addListener({
        onAddedEntities: (...entities) => {
          entities.forEach((entity) => {
            log.info("engine +entity", entity.id);
            this.needLoad.add(entity as IdEntity); // queue for process time
          });
        },
        onRemovedEntities: (...entities) => {
          entities.forEach((entity) => {
            log.info("engine -entity", entity.id);
            const bm = entity.components.get(BjsMesh);
            if (!bm.root) return;
            bm.root.dispose();
          });
        },
      });
  }
  process(options: ClientWorldRunOptions) {
    this.needLoad.forEach((entity) => {
      const bm = entity.components.get(BjsMesh);
      //myabe loadstate starts as loaded, the 2nd time?
      switch (bm.loadState) {
        case LoadState.NONE:
          const filename = bm.objName + ".glb";
          bm.loadState = LoadState.STARTED_GET;
          log.info("start load", filename);
          SceneLoader.LoadAssetContainerAsync(/*rootUrl=*/ "./asset_build/", filename, options.scene, /*onProgress=*/ null).then((container) => {
            log.info("done load", filename);
            bm.loadState = LoadState.LOADED;
            bm.container = container;
          });

          break;
        case LoadState.STARTED_GET:
          break;
        case LoadState.LOADED:
          const newInstances = bm.container!.instantiateModelsToScene(/*nameFunction=*/ entity.localName.bind(entity));
          if (newInstances.rootNodes.length != 1) throw new Error();
          bm.root = newInstances.rootNodes[0];
          bm.root.scaling.z = 1; //likely wrong
          this.needLoad.delete(entity);
          break;
      }
    });
  }
}

// aim camera at this (child) object, e.g. player's torso instead of feet
export class AimAt implements Component {
  constructor(public objName: string) {
    // objName is some obj in the BjsMesh hierarchy
  }
  getAimObj(entity: IdEntity, scene: Scene): TransformNode | null {
    const instancedName = entity.localName(this.objName);
    return scene.getTransformNodeByName(instancedName);
  }
}

export function CreatePlayer() {
  // X=left, Y=up, Z=fwd
  const p = new IdEntity();

  // const sunCaster = (window as any).gen as ShadowGenerator; // todo
  // if (sunCaster) {
  //   sunCaster.addShadowCaster(body);
  // }
  p.components.add(new BjsMesh("model/player/player"));
  p.components.add(new AimAt("player_aim"));
  p.components.add(new Toucher(/*posOffset=*/ new Vector3(0, 1.2, 0), /*radius=*/ 0.3, new Set()));

  return p;
}

// Transform -> BjsMesh.root
export class TransformMesh extends AbstractEntitySystem<IdEntity> {
  constructor(priority: number) {
    super(priority, [BjsMesh, Transform]);
  }

  processEntity(entity: IdEntity, _index: number, _entities: unknown, _options: ClientWorldRunOptions) {
    const tr = entity.components.get(Transform);
    const root = entity.components.get(BjsMesh).root;
    if (root) {
      root.position.copyFrom(tr.pos);
      root.lookAt(root.position.add(tr.facing));
    }
  }
}
