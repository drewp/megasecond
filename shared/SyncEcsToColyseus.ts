import { MapSchema } from "@colyseus/schema";
import { Component, Engine } from "@trixt0r/ecs";
import { Vector3 } from "babylonjs";
import { autorun } from "mobx";
import { PropV3, ServerComponent, ServerEntity } from "./ColyTypesForEntities";
import { AimAt, componentConversions, Model, Nametag, NetworkSession, Sim, Touchable, Toucher, Transform, Twirl } from "./Components";
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
    // see componentConversions for this data in a table

    if (componentConversions[comp.constructor.name] === undefined) {
      log.info("addServerComponent ignoring comp=", comp);
      return;
    }

    const sc = new ServerComponent();
    se.components.set(comp.constructor.name, sc);
    if (comp.constructor === Model) {
      sc.propString.set("modelPath", comp.modelPath);
    } else if (comp.constructor === NetworkSession) {
      sc.propString.set("sessionId", comp.sessionId);
      sc.propString.set("serverEntityId", "" + comp.serverEntityId);
    } else if (comp.constructor == Toucher) {
      sc.propV3.set("posOffset", propFromVector3(comp.posOffset));
      sc.propFloat32.set("radius", comp.radius);
      // sc.propCurrentlyTouching. = Array.from(comp.currentlyTouching).map(ent=>(ent.id as number));
    } else if (comp.constructor == AimAt) {
      sc.propString.set("objName", comp.objName);
    } else if (comp.constructor == Touchable) {
    } else if (comp.constructor == Transform) {
      this.syncFieldToColy(comp, sc, "pos", "propV3");
      this.syncFieldToColy(comp, sc, "facing", "propV3");
    } else if (comp.constructor == Sim) {
      this.syncFieldToColy(comp, sc, "vel", "propV3");
    } else if (comp.constructor == Twirl) {
      sc.propFloat32.set("degPerSec", comp.degPerSec);
    } else if (comp.constructor == Nametag) {
      sc.propString.set("text", comp.text);
      this.syncFieldToColy(comp, sc, "text", "propString");
      sc.propV3.set("offset", propFromVector3(comp.offset));
      this.syncFieldToColy(comp, sc, "offset", "propV3");
    }
  }
  syncFieldToColy<T extends Component>(comp: T, sc: ServerComponent, attr: keyof T, servType: keyof ServerComponent) {
    autorun(() => {
      let value = comp[attr];
      if (servType == "propV3") {
        // log.info(`sync from ${comp.constructor.name}=${(value as Vector3).toString()} to sc.${servType}[${attr}]`)
        (value as any) = propFromVector3(value); // todo types
      }
      const servSchemaMap = sc[servType] as MapSchema;
      servSchemaMap.set(attr as string, value); // todo types; shouldn't have had to force that
    });
  }
}
