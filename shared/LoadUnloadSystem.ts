import { Component } from "@trixt0r/ecs";
import { Aspect, Engine, System } from "@trixt0r/ecs";
import { IdEntity } from "./IdEntity";
import { ClientWorldRunOptions } from "./types";

export enum KeepProcessing {
  KEEP_PROCESSING,
  STOP_PROCESSING,
}
export class LoadUnloadSystem extends System {
  // when entities show up with these components, do some load behavior, and when they leave, do some unload.
  requiredComponents: Component[] = [];

  private needLoad: Set<IdEntity> = new Set();
  onAddedToEngine(engine: Engine): void {
    Aspect.for(engine.entities, /*all=*/ this.requiredComponents).addListener({
      onAddedEntities: (...entities) => {
        entities.forEach((entity) => {
          this.needLoad.add(entity as IdEntity);
        });
      },
      onRemovedEntities: (...entities) => {
        entities.forEach((entity) => {
          this.onRemoved(entity as IdEntity);
        });
      },
    });
  }
  process(options: ClientWorldRunOptions) {
    this.needLoad.forEach((entity) => {
      const status = this.processAdded(entity, options);
      if (status == KeepProcessing.STOP_PROCESSING) {
        this.needLoad.delete(entity);
      }
    });
  }
  onRemoved(entity: IdEntity) {
    // override
  }
  processAdded(entity: IdEntity, options: ClientWorldRunOptions): KeepProcessing {
    // override
    return KeepProcessing.STOP_PROCESSING;
  }
}
