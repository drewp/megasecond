import { AbstractEntitySystem } from "@trixt0r/ecs";
import { Component } from "@trixt0r/ecs";
import { Vector3 } from "babylonjs";
import { BjsMesh } from "../client/PlayerView";
import { removeComponent } from "./EcsOps";
import { IdEntity } from "./IdEntity";
import { Transform } from "./Transform";
import { CommonWorldRunOptions } from "./types";

export class Toucher implements Component {
  // e.g. a player
  constructor(public posOffset: Vector3, public radius: number, public currentlyTouching: Set<IdEntity>) {}
}

export class Touchable implements Component {
  // e.g. a prize
  constructor() {}
}

export class Pickup extends AbstractEntitySystem<IdEntity> {
  constructor(priority: number) {
    super(priority, [Toucher]);
  }

  processEntity(entity: IdEntity, _index: number, _entities: unknown, _options: CommonWorldRunOptions) {
    if (!this.engine) return;
    const tu = entity.components.get(Toucher);
    if (tu.currentlyTouching.size > 0) {
      tu.currentlyTouching.forEach((obj) => {
        removeComponent(obj, Transform);
        removeComponent(obj, Touchable);
        removeComponent(obj, BjsMesh); // another system should be doing this, e.g. when Touchable is removed
      });
    }
  }
}

// do collisions; write Toucher.currentlyTouching
export class TouchItem extends AbstractEntitySystem<IdEntity> {

  constructor(priority: number) {
    super(priority, undefined, undefined, /*one=*/[Toucher, Touchable]);
  }

  // see https://github.com/Trixt0r/ecsts/blob/master/examples/rectangles/src/systems/renderer.ts#L13
  process(options: CommonWorldRunOptions) {
    if (!this._engine) return;
    const entities = this.aspect!.entities;
    const touchers: IdEntity[] = [];
    const touchables: IdEntity[] = [];
    for (let i = 0, l = entities.length; i < l; i++) {
      const ent = entities[i] as IdEntity;
      if (ent.components.get(Toucher)) {
        touchers.push(ent);
      } else if (ent.components.get(Touchable)) {
        touchables.push(ent);
      }
    }
    for (let t1 of touchers) {
      const toucher = t1.components.get(Toucher);
      const currentlyTouching = toucher.currentlyTouching;
      currentlyTouching.clear();
      for (let t2 of touchables) {
        if (!t2.components.get(Transform)) continue;
        const pos1 = t1.components.get(Transform).pos.add(toucher.posOffset);
        const rad1 = toucher.radius;
        const pos2 = t2.components.get(Transform).pos;
        const rad2 = 0;

        const dist = pos1.subtract(pos2).length();
        if (dist < rad1 + rad2) {
          currentlyTouching.add(t2);
        }
      }
    }
  }
  processEntity() {
    throw new Error();
  }
}
