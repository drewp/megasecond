import { Component, Engine } from "@trixt0r/ecs";
import { Vector3 } from "babylonjs";
import { PropV3, ServerComponent, ServerEntity } from "./ColyTypesForEntities";
import { AimAt, Model, NetworkSession, Touchable, Toucher, Transform, Twirl } from "./Components";
import { IdEntity } from "./IdEntity";
import createLogger from "./logsetup";
import { WorldState } from "./WorldRoom";
const log = createLogger("sync");

function propFromVector3(v3: Vector3): PropV3 {
  const ret = new PropV3();
  ret.x = v3.x;
  ret.y = v3.y;
  ret.z = v3.z;
  return ret;
}

export class TrackEcsEntities {
  constructor(public state: WorldState, public world: Engine) {
    this.world.addListener({
      onAddedEntities: (...entities) => {
        entities.forEach((ent) => {
          this.addServerEntity(ent as IdEntity);
        });
      },
    });
  }

  addServerEntity(ent: IdEntity) {
    const se = new ServerEntity();
    log.info(`new server ent ${ent.id} already has ${ent.components.length} comps`);
    this.state.entities.set("" + ent.id, se);

    this.onCompAdd(se, ...ent.components);
    ent.components.addListener({
      onAdded: this.onCompAdd.bind(this, se),
    });
  }

  onCompAdd(se: ServerEntity, ...comps: Component[]) {
    comps.forEach((comp: any) => {
      this.addServerComponent(comp, se);
    });
  }

  addServerComponent(comp: any, se: ServerEntity) {
    if (comp.constructor === Model) {
      const sc = new ServerComponent();
      se.components.set(comp.constructor.name, sc);

      sc.propString.set("modelPath", comp.modelPath);
    } else if (comp.constructor === NetworkSession) {
      const sc = new ServerComponent();
      se.components.set(comp.constructor.name, sc);

      sc.propString.set("sessionId", comp.sessionId);
    } else if (comp.constructor == Toucher) {
      const sc = new ServerComponent();
      se.components.set(comp.constructor.name, sc);

      sc.propV3.set("posOffset", propFromVector3(comp.posOffset));
      sc.propFloat32.set("radius", comp.radius);
      // sc.propCurrentlyTouching. = Array.from(comp.currentlyTouching).map(ent=>(ent.id as number));
    } else if (comp.constructor == AimAt) {
      const sc = new ServerComponent();
      se.components.set(comp.constructor.name, sc);

      sc.propString.set("objName", comp.objName);
    } else if (comp.constructor == Touchable) {
      const sc = new ServerComponent();
      se.components.set(comp.constructor.name, sc);
    } else if (comp.constructor == Transform) {
      const sc = new ServerComponent();
      se.components.set(comp.constructor.name, sc);
      sc.propV3.set("pos", propFromVector3(comp.pos));
      sc.propV3.set("vel", propFromVector3(comp.vel));
      sc.propV3.set("facing", propFromVector3(comp.facing));
    } else if (comp.constructor == Twirl) {
      const sc = new ServerComponent();
      se.components.set(comp.constructor.name, sc);
      sc.propFloat32.set("degPerSec", comp.degPerSec);
    }
  }
}
