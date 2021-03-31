import { SceneLoader } from "babylonjs";
import { BjsModel, LoadState, Model } from "../../shared/Components";
import { IdEntity } from "../../shared/IdEntity";
import createLogger from "../../shared/logsetup";
import { ClientWorldRunOptions } from "../../shared/types";
import { LoadUnloadSystem, KeepProcessing } from "../../shared/LoadUnloadSystem";
import { Collection } from "@trixt0r/ecs";
import { Component } from "@trixt0r/ecs";
import { ComponentCollection } from "@trixt0r/ecs";
const log = createLogger("system");

export class BjsLoadUnload extends LoadUnloadSystem {
  // Turn Model.modelPath into BjsModel.root obj tree; cleans up that root tree
  // when BjsModel component is deleted.
  requiredComponentTypes = [Model, BjsModel];

  processAdded(entity: IdEntity, options: ClientWorldRunOptions): KeepProcessing {
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
        return KeepProcessing.STOP_PROCESSING;
    }
    return KeepProcessing.KEEP_PROCESSING;
  }
  onRemoved(_entity: IdEntity, comps: ComponentCollection<Component>) {
    const bm = comps.get(BjsModel);
    if (!bm.root) return;
    bm.root.dispose();
  }
}
