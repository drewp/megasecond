import { MapSchema } from "@colyseus/schema";
import { Component, Engine } from "@trixt0r/ecs";
import { Vector3 } from "babylonjs";
import { Room } from "colyseus.js";
import { LocalCam, LocallyDriven, PlayerDebug, ServerRepresented } from "../client/Components";
import { PropV3, ServerComponent, ServerEntity } from "./ColyTypesForEntities";
import { AimAt, BjsModel, componentConversions, Model, NetworkSession, Touchable, Toucher, Transform, Twirl, UsesNav } from "./Components";
import { IdEntity } from "./IdEntity";
import createLogger from "./logsetup";
import { CtorArg, UpdateGroup } from "./types";
import { Player, WorldRoom, WorldState } from "./WorldRoom";
const log = createLogger("sync");

function vector3FromProp(p: PropV3): Vector3 {
  return new Vector3(p.x, p.y, p.z);
}

export class TrackServerEntities {
  sessionId?: string;
  room_temp?: Room<WorldState>;
  netPlayer_temp?: Player;
  constructor(public world: Engine) {}

  trackEntities(state: WorldState, sessionId: string, room_temp: Room<WorldState>) {
    this.room_temp = room_temp;
    // make world entities for the ones in state
    this.sessionId = sessionId;
    state.entities.forEach((se: ServerEntity) => {
      this.addServerEntity(se);
    });
    state.entities.onAdd = (se: ServerEntity) => this.addServerEntity(se);
  }

  private addServerEntity(se: ServerEntity) {
    const ent = new IdEntity();
    log.info(`addServerEntity id=${se.id} local=${ent.id}`);
    this.world.entities.add(ent);

    const addComp = (sc: ServerComponent, compName: string) => {
      this.makeLocalComponents(compName, sc, ent);
    };
    se.components.forEach(addComp);
    se.components.onAdd = addComp;
  }

  private makeLocalComponents(compName: string, serverProxyObj: ServerComponent, ent: IdEntity) {
    const convertor = componentConversions[compName];

    if (convertor === undefined) {
      log.info(`no client component for server-sent ${compName}`);
      return;
    }
    if (ent.components.find((el: Component) => el.constructor.name == compName)) {
      log.info(`ent ${ent.id} had ${compName} already- skipping further adds`);
      return;
    }

    const ctorArgs = (convertor.ctorArgs || []).map((spec: CtorArg): any => {
      const servSchemaMap = serverProxyObj[spec.servType] as MapSchema;
      let curValue = servSchemaMap.get(spec.attr);
      if (curValue === undefined) {
        log.info(`for ${ent.id}, serverProxyObj ${compName}.${spec.attr} is undefined`);
      }
      if (spec.servType == "propV3") {
        curValue = vector3FromProp(curValue);
      }
      return curValue;
    });

    const componentCtor = convertor.ctor as any; // ideally: as subtypeof(Component)
    const newComp = new componentCtor(...ctorArgs);

    log.info(`making entity ${ent.id} component ${compName}`);

    ent.components.add(newComp);

    (convertor.localUpdatedAttrs || []).forEach((spec: UpdateGroup) => {
      this.syncFieldType(newComp, serverProxyObj, spec.attrs, spec.servType);
    });

    if (compName == "Model") {
      // and since this is client, add renderable:
      if (ent.components.get(BjsModel)) {
        throw new Error(`ent=${ent.id} already had BjsModel`);
      }
      ent.components.add(new BjsModel());
    }

    if (compName == "NetworkSession") {
      if (newComp.sessionId == this.sessionId) {
        // we're the player
        ent.components.add(new PlayerDebug());
        ent.components.add(new LocallyDriven());
        ent.components.add(new UsesNav());
        ent.components.add(new LocalCam());
        ent.components.add(new ServerRepresented(this.room_temp!));
      }
    }
  }

  syncFieldType<T extends Component>(comp: T, serverProxyObj: ServerComponent, attrsOfThisType: (keyof T)[], servType: keyof ServerComponent) {
    const servSchemaMap = serverProxyObj[servType] as MapSchema;
    servSchemaMap.onChange = () => {
      attrsOfThisType.forEach((attr) => {
        let newval = servSchemaMap.get(attr as string)!; // todo types
        if (servType == "propV3") {
          newval = vector3FromProp(newval);
          // log.info(`sync from sc.${servType}[${attr}]=${newval.toString()} to comp ${comp.constructor.name}`);
        }
        comp[attr] = newval;
      });
    };
  }
}
