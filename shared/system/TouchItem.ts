import { AbstractEntitySystem } from "@trixt0r/ecs";
import { S_Touchable, S_Toucher, S_Transform } from "../Components";
import { IdEntity } from "../IdEntity";
import createLogger from "../logsetup";
import { CommonWorldRunOptions } from "../types";
const log = createLogger("system");

// do collisions; write Toucher.currentlyTouching
export class TouchItem extends AbstractEntitySystem<IdEntity> {
  constructor(priority: number) {
    super(priority, undefined, undefined, /*one=*/ [S_Toucher, S_Touchable]);
  }

  // see https://github.com/Trixt0r/ecsts/blob/master/examples/rectangles/src/systems/renderer.ts#L13
  process(options: CommonWorldRunOptions) {
    if (!this._engine) return;
    const entities = this.aspect!.entities;
    const touchers: IdEntity[] = [];
    const touchables: IdEntity[] = [];
    for (let i = 0, l = entities.length; i < l; i++) {
      const ent = entities[i] as IdEntity;
      if (ent.components.get(S_Toucher)) {
        touchers.push(ent);
      } else if (ent.components.get(S_Touchable)) {
        touchables.push(ent);
      }
    }
    for (let t1 of touchers) {
      const toucher = t1.components.get(S_Toucher);
      const currentlyTouching = toucher.currentlyTouching;
      currentlyTouching.clear();
      for (let t2 of touchables) {
        if (!t2.components.get(S_Transform)) continue;
        const pos1 = t1.components.get(S_Transform).pos.add(toucher.posOffset);
        const rad1 = toucher.radius;
        const pos2 = t2.components.get(S_Transform).pos;
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
