import { MapSchema } from "@colyseus/schema";
import { Component, Engine } from "@trixt0r/ecs";
import { Vector3 } from "babylonjs";
import { autorun } from "mobx";
import { PropV3, ServerComponent, ServerEntity } from "../shared/SyncTypes";
import { S_AimAt, componentConversions, S_Model, S_Nametag, S_NetworkSession, S_PlayerPose, S_Sim, S_Touchable, S_Toucher, S_Transform, S_Twirl } from "../shared/Components";
import { IdEntity } from "../shared/IdEntity";
import createLogger from "../shared/logsetup";
import { WorldState } from "../shared/SyncTypes";
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

function serverComponentKeyForComponent(sourceComp: Component): string {
  return sourceComp.constructor.name;
}

export class TrackEcsEntities {
  constructor(public source: Engine, public target: WorldState) {
    this.source.addListener({
      onAddedEntities: (...entities) => {
        entities.forEach((ent) => {
          this.onAdd(ent as IdEntity);
        });
      },
      onRemovedEntities: (...entities) => {
        log.info("onRemovedEntities", entities.length);
        entities.forEach((ent) => this.target.entities.delete(serverEntityKeyForId(ent.id)));
      },
    });
  }

  onAdd(ent: IdEntity) {
    const se = new ServerEntity();
    this.target.entities.set(serverEntityKeyForId(ent.id), se);
    new TrackEcsComponents(ent, se);
  }
}

class TrackEcsComponents {
  constructor(public source: IdEntity, public target: ServerEntity) {
    this.onCompsAdd(...source.components);
    source.components.addListener({
      onAdded: this.onCompsAdd.bind(this),
      onRemoved: this.onCompsRemove.bind(this),
    });
  }

  onCompsAdd(...comps: Component[]) {
    comps.forEach((comp) => {
      this.onCompAdd(comp);
    });
  }

  onCompsRemove(...comps: Component[]) {
    comps.forEach((c) => {
      this.target.components.delete(serverComponentKeyForComponent(c));
    });
  }

  onCompAdd<C extends Component>(sourceComp: C) {
    // ECS has added a component to source; track it in target.
    if (componentConversions[serverComponentKeyForComponent(sourceComp)] === undefined) {
      log.info("ignoring server-only sourceComp=", sourceComp);
      return;
    }

    const targetComp = new ServerComponent();
    this.target.components.set(serverComponentKeyForComponent(sourceComp), targetComp);
    // See componentConversions for this data in a table
    if (sourceComp instanceof S_Model) {
      targetComp.propString.set("modelPath", sourceComp.modelPath);
    } else if (sourceComp instanceof S_NetworkSession) {
      targetComp.propString.set("sessionId", sourceComp.sessionId);
      targetComp.propString.set("serverEntityId", "" + sourceComp.serverEntityId);
    } else if (sourceComp instanceof S_Toucher) {
      targetComp.propV3.set("posOffset", propFromVector3(sourceComp.posOffset));
      targetComp.propFloat32.set("radius", sourceComp.radius);
      // sc.propCurrentlyTouching. = Array.from(comp.currentlyTouching).map(ent=>(ent.id as number));
    } else if (sourceComp instanceof S_AimAt) {
      targetComp.propString.set("objName", sourceComp.objName);
    } else if (sourceComp instanceof S_Touchable) {
    } else if (sourceComp instanceof S_Transform) {
      this.syncFieldToColy(sourceComp, targetComp, "pos", "propV3");
      this.syncFieldToColy(sourceComp, targetComp, "facing", "propV3");
    } else if (sourceComp instanceof S_Sim) {
      this.syncFieldToColy(sourceComp, targetComp, "vel", "propV3");
    } else if (sourceComp instanceof S_Twirl) {
      targetComp.propFloat32.set("degPerSec", sourceComp.degPerSec);
    } else if (sourceComp instanceof S_Nametag) {
      this.syncFieldToColy(sourceComp, targetComp, "text", "propString");
      this.syncFieldToColy(sourceComp, targetComp, "offset", "propV3");
    } else if (sourceComp instanceof S_PlayerPose) {
      this.syncFieldToColy(sourceComp, targetComp, "waving", "propBoolean");
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
