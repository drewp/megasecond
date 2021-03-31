import { Collection } from "@trixt0r/ecs";
import { Component } from "@trixt0r/ecs";
import { ComponentCollection } from "@trixt0r/ecs";
import { Aspect, Engine, System } from "@trixt0r/ecs";
import { componentNameList, entityIdList } from "./EcsOps";
import { IdEntity } from "./IdEntity";
import createLogger from "./logsetup";
import { ClientWorldRunOptions } from "./types";
const log = createLogger("system");

export enum KeepProcessing {
  KEEP_PROCESSING,
  STOP_PROCESSING,
}
export class LoadUnloadSystem extends System {
  // when entities first exist with these components, do some load behavior, and when they leave that set, do some unload.
  requiredComponentTypes: Component[] = [];

  // processAdded calls are deferred until the next process time
  private needLoad: Set<IdEntity> = new Set();

  onAddedToEngine(engine: Engine): void {
    Aspect.for(engine.entities, /*all=*/ this.requiredComponentTypes).addListener({
      onAddedEntities: (...entities) => {
        entities.forEach((entity) => {
          this.needLoad.add(entity as IdEntity);
        });
      },
      onRemovedComponents: this.onRemovedComponents.bind(this),
      onRemovedEntities: (...entities: IdEntity[]) => {
        log.info("onRemovedEntities", entityIdList(entities));
        entities.forEach((entity) => {
          log.info(`  e${entity.id} removed, comps ${componentNameList(entity.components)} remain for onRemoved`);
          this.onRemoved(entity, entity.components);
        });
      },
    });
  }

  private onRemovedComponents(entity: IdEntity, ...components: Component[]) {
    log.info(`e${entity.id} onRemovedComponents ${componentNameList(components)}`);

    if (!this.containsRequiredComponent(components)) {
      return;
    }
    log.info("  entity is now out of our aspect");

    const comps: ComponentCollection<Component> = new ComponentCollection();
    for (let c of components) {
      if (this.containsRequiredComponent([c])) {
        comps.add(c);
      }
    }
    for (let c of entity.components) {
      if (this.containsRequiredComponent([c])) {
        comps.add(c);
      }
    }
    log.info("  calling onRemoved with fake collection", componentNameList(comps));
    this.onRemoved(entity, comps);
  }
  private containsRequiredComponent(removedComps: Component[]): boolean {
    // maybe this can be Aspect.matches
    for (let rm of removedComps) {
      for (let req of this.requiredComponentTypes) {
        if (rm.constructor == req) {
          //todo- clearer types
          return true;
        }
      }
    }
    return false;
  }
  process(options: ClientWorldRunOptions) {
    this.needLoad.forEach((entity) => {
      const status = this.processAdded(entity, options);
      if (status == KeepProcessing.STOP_PROCESSING) {
        this.needLoad.delete(entity);
      }
    });
  }
  onRemoved(
    entity: IdEntity,
    components: ComponentCollection<Component> // all the requiredComponents, even if they just got removed from entity
  ) {
    // override
  }
  processAdded(entity: IdEntity, options: ClientWorldRunOptions): KeepProcessing {
    // override
    return KeepProcessing.STOP_PROCESSING;
  }
}
