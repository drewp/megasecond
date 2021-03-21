import { Aspect, Engine, System } from "@trixt0r/ecs";
import { SceneLoader } from "babylonjs";
import { BjsModel, LoadState, Model } from "../../shared/Components";
import { IdEntity } from "../../shared/IdEntity";
import createLogger from "../../shared/logsetup";
import { ClientWorldRunOptions } from "../../shared/types";
const log = createLogger("system");

export class BjsLoadUnload extends System {
  // Turn Model.modelPath into BjsModel.root obj tree; cleans up that root tree
  // when BjsModel component is deleted.
  private needLoad: Set<IdEntity> = new Set();
  onAddedToEngine(engine: Engine): void {
    Aspect.for(engine.entities)
      .all(Model, BjsModel)
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
            const bm = entity.components.get(BjsModel);
            if (!bm.root) return;
            bm.root.dispose();
          });
        },
      });
  }
  process(options: ClientWorldRunOptions) {
    this.needLoad.forEach((entity) => {
      const mo = entity.components.get(Model);
      const bm = entity.components.get(BjsModel);
      //myabe loadstate starts as loaded, the 2nd time?
      switch (bm.loadState) {
        case LoadState.NONE:
          bm.loadState = LoadState.STARTED_GET;
          log.info("start load", mo.modelPath);
          SceneLoader.LoadAssetContainerAsync(/*rootUrl=*/ "./asset_build/", mo.modelPath + ".glb", options.scene, /*onProgress=*/ null).then((container) => {
            log.info("done load", mo.modelPath);
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
