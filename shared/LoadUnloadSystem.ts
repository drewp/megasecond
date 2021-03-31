import { Aspect, Component, ComponentCollection, Engine, System } from "@trixt0r/ecs";
import { combineComponentCollections, componentNameList, entityIdList } from "./EcsOps";
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
  private aspect!: Aspect;
  onAddedToEngine(engine: Engine): void {
    this.aspect = Aspect.for(engine.entities, /*all=*/ this.requiredComponentTypes);
    this.aspect.addListener({
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

    if (!this.aspect.matches(entity)) {
      return;
    }

    const comps: ComponentCollection<Component> = combineComponentCollections(entity.components, components);
    this.onRemoved(entity, comps);
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
    components: ComponentCollection<Component> // contains all the requiredComponents, even if they just got removed from entity
  ) {
    // override
  }
  processAdded(entity: IdEntity, options: ClientWorldRunOptions): KeepProcessing {
    // override
    return KeepProcessing.STOP_PROCESSING;
  }
}
