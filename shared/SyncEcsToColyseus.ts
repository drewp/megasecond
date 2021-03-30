import { MapSchema } from "@colyseus/schema";
import { Component, Engine } from "@trixt0r/ecs";
import { Vector3 } from "babylonjs";
import { autorun } from "mobx";
import { PropV3, ServerComponent, ServerEntity } from "./SyncTypes";
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

function serverEntityKeyForId(id: string | number): string {
  return "s" + id;
}

export class TrackEcsEntities {
  constructor(public state: WorldState, public world: Engine) {
    this.world.addListener({
      onAddedEntities: (...entities) => {
        entities.forEach((ent) => {
          this.onAdd(ent as IdEntity);
        });
      },
      onRemovedEntities: (...entities) => {
        log.info("onRemovedEntities", entities.length);
        entities.forEach((ent) => this.state.entities.delete(serverEntityKeyForId(ent.id)));
      },
    });
  }

  onAdd(ent: IdEntity) {
    const se = new ServerEntity();
    this.state.entities.set(serverEntityKeyForId(ent.id), se);
    new TrackEcsComponents(ent, se);
  }
}

class TrackEcsComponents {
  constructor(public source: IdEntity, public target: ServerEntity) {
    this.onCompsAdd(...source.components);
    source.components.addListener({
      onAdded: this.onCompsAdd.bind(this),
      onRemoved: this.onCompRemove.bind(this),
    });
  }

  onCompsAdd(...comps: Component[]) {
    comps.forEach((comp) => {
      this.onCompAdd(comp);
    });
  }

  onCompRemove(...comps: Component[]) {
    log.info("TODO oncompremove", comps.length);
  }

  onCompAdd<C extends Component>(sourceComp: C) {
    // ECS has added a component to source; track it in target.
    if (componentConversions[sourceComp.constructor.name] === undefined) {
      log.info("ignoring server-only sourceComp=", sourceComp);
      return;
    }

    const targetComp = new ServerComponent();
    this.target.components.set(sourceComp.constructor.name, targetComp);
    // See componentConversions for this data in a table
    if (sourceComp instanceof Model) {
      targetComp.propString.set("modelPath", sourceComp.modelPath);
    } else if (sourceComp instanceof NetworkSession) {
      targetComp.propString.set("sessionId", sourceComp.sessionId);
      targetComp.propString.set("serverEntityId", "" + sourceComp.serverEntityId);
    } else if (sourceComp instanceof Toucher) {
      targetComp.propV3.set("posOffset", propFromVector3(sourceComp.posOffset));
      targetComp.propFloat32.set("radius", sourceComp.radius);
      // sc.propCurrentlyTouching. = Array.from(comp.currentlyTouching).map(ent=>(ent.id as number));
    } else if (sourceComp instanceof AimAt) {
      targetComp.propString.set("objName", sourceComp.objName);
    } else if (sourceComp instanceof Touchable) {
    } else if (sourceComp instanceof Transform) {
      this.syncFieldToColy(sourceComp, targetComp, "pos", "propV3");
      this.syncFieldToColy(sourceComp, targetComp, "facing", "propV3");
    } else if (sourceComp instanceof Sim) {
      this.syncFieldToColy(sourceComp, targetComp, "vel", "propV3");
    } else if (sourceComp instanceof Twirl) {
      targetComp.propFloat32.set("degPerSec", sourceComp.degPerSec);
    } else if (sourceComp instanceof Nametag) {
      this.syncFieldToColy(sourceComp, targetComp, "text", "propString");
      this.syncFieldToColy(sourceComp, targetComp, "offset", "propV3");
    }
  }

  syncFieldToColy<T extends Component>(comp: T, sc: ServerComponent, attr: keyof T & string, servType: keyof ServerComponent) {
    // the attrs you send here, you have to have made into mobx.observables
    autorun(() => {
      const value: Vector3 | string | number = comp[attr];
      let targetValue;
      if (servType == "propV3") {
        if (typeof value === "object" && value instanceof Vector3) {
          targetValue = propFromVector3(value); // todo types
        } else {
          throw new Error("TypeError");
        }
      } else {
        targetValue = value;
      }
      const servSchemaMap = sc[servType] as MapSchema;
      servSchemaMap.set(attr, targetValue);
    });
  }
}
