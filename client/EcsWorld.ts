// layer of fixes on miski lib
import { Component, createWorld, Entity, System, World } from "miski";
interface ComponentSpec<T> {
  entityLimit?: number | null;
  name: string;
  properties: T;
  removable?: boolean;
}
interface SystemSpec {
  components: Component<unknown>[];
  exclusive?: boolean;
  name: string;
  postUpdate?: (int: number, entity: Entity[], system: System) => void;
  preUpdate?: (entities: Entity[], system: System) => void;
  update?: (dt: number, entities: Entity[], system: System) => void;
}

export class EcsWorld {
  private world: World;
  private componentMap: Map<System, Component<any>[]>;
  constructor() {
    this.world = createWorld({});
    this.componentMap = new Map(); // workaround for miski
  }
  registerComponent(spec: ComponentSpec<any>): Component<any> {
    return this.world.registerComponent(spec);
  }
  registerSystem(spec: SystemSpec) {
    const sys = this.world.registerSystem(spec);
    this.componentMap.set(sys, spec.components);
    return sys;
  }
  createEntity(): Entity {
    return this.world.createEntity();
  }
  update(dt: number) {
    const systems = this.world.getSystems();
    for (let i = 0; i < systems.length; i++) {
      const system = systems[i];
      if (system.enabled === false) continue;

      const allEntities = this.world.getEntities();
      const comps = this.componentMap.get(system);
      if (comps === undefined) {
        throw new Error();
      }
      const matchingEntities: Entity[] = [];
      allEntities.forEach((e) => {
        for (let j = 0; j < comps.length; j++) {
          if (!e.hasComponent(comps[j])) {
            return;
          }
        }
        matchingEntities.push(e);
      });

      system.update(dt, matchingEntities, system);
    }
  }
}

export function props<P>(e: Entity, c: Component<P>): P {
  return e._[c.name as string] as P;
}
