import { Component, ComponentCollection } from "@trixt0r/ecs";
import { S_Model } from "../../shared/Components";
import { IdEntity } from "../../shared/IdEntity";
import { KeepProcessing, LoadUnloadSystem } from "../../shared/LoadUnloadSystem";
import createLogger from "../../shared/logsetup";
import { ClientWorldRunOptions } from "../../shared/types";
import { BjsModel } from "../Components";
const log = createLogger("system");

export class BjsLoadUnload extends LoadUnloadSystem {
  // Turn Model.modelPath into BjsModel.root obj tree; cleans up that root tree
  // when BjsModel component is deleted.
  requiredComponentTypes = [S_Model, BjsModel];

  processAdded(entity: IdEntity, options: ClientWorldRunOptions): KeepProcessing {
    const mo = entity.getComponentReadonly(S_Model);
    const bm = entity.components.get(BjsModel);
    bm.instance = options.world3d.instances.makeInstance(mo.modelPath, entity.localName("inst"));
    return KeepProcessing.STOP_PROCESSING;
  }
  onRemoved(_entity: IdEntity, comps: ComponentCollection<Component>) {
    const bm = comps.get(BjsModel);
    bm.instance!.dispose();
  }
}
