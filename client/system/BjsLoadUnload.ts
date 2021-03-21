import { Aspect, Engine, System } from "@trixt0r/ecs";
import { SceneLoader } from "babylonjs";
import { BjsMesh, LoadState } from "../../shared/Components";
import { IdEntity } from "../../shared/IdEntity";
import createLogger from "../../shared/logsetup";
import { ClientWorldRunOptions } from "../../shared/types";
const log = createLogger("system");

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
