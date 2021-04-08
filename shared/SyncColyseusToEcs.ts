import { MapSchema } from "@colyseus/schema";
import { Component, Engine } from "@trixt0r/ecs";
import { Vector3 } from "babylonjs";
import { Room } from "colyseus.js";
import { BjsModel, BattleRing, LocalCam, LocallyDriven, PlayerDebug, ServerRepresented } from "../client/Components";
import { componentConversions, S_PlayerPose, S_UsesNav } from "./Components";
import { IdEntity } from "./IdEntity";
import createLogger from "./logsetup";
import { Convertor, CtorArg, PropV3, ServerComponent, ServerEntity, UpdateGroup } from "./SyncTypes";
import { WorldState } from "./WorldRoom";
const log = createLogger("sync");

function vector3FromProp(p: PropV3): Vector3 {
  return new Vector3(p.x, p.y, p.z);
}

export class TrackServerEntities {
  sessionId?: string;
  room_temp?: Room<WorldState>;
  _entityByServId: Map<string, IdEntity> = new Map();
  constructor(public world: Engine) {}

  trackEntities(state: WorldState, sessionId: string, room_temp: Room<WorldState>) {
    this.room_temp = room_temp;
    this.sessionId = sessionId;
    state.entities.forEach(this.addServerEntity.bind(this));
    state.entities.onAdd = this.addServerEntity.bind(this);
    state.entities.onChange = (_se: ServerEntity, servId: string) => {
      throw new Error(`unhandled- servId=${servId}`);
    };
    state.entities.onRemove = this.removeServerEntity.bind(this);
  }

  private addServerEntity(se: ServerEntity, servId: string) {
    const ent = new IdEntity();
    log.info(`e${ent.id}: server add (remote servId=${servId})`);
    this.world.entities.add(ent);
    this._entityByServId.set(servId, ent);

    new TrackServerComponents(se, ent, this.sessionId!, this.room_temp!);
  }
  private removeServerEntity(_se: ServerEntity, servId: string) {
    const ent = this._entityByServId.get(servId);
    if (!ent) {
      throw new Error(`lost track of ${servId}`);
    }
    log.info(`e${ent.id}: server remove (servId=${servId})`);
    this.world.entities.remove(ent);
    this._entityByServId.delete(servId);
  }
}

class TrackServerComponents {
  _compByName = new Map<string, Component>();
  constructor(
    private sourceEntity: ServerEntity,
    private targetEntity: IdEntity,
    private sessionId: string, //doesn't belong here
    private room_temp: Room<WorldState> //doesn't belong here
  ) {
    this.sourceEntity.components.forEach(this.makeLocalComponents.bind(this));
    this.sourceEntity.components.onAdd = this.makeLocalComponents.bind(this);
    this.sourceEntity.components.onChange = (_sourceComp: ServerComponent, compName: string) => {
      this.log(`sc change compName=${compName}`);
    };
    this.sourceEntity.components.onRemove = (_sourceComp: ServerComponent, compName: string) => {
      this.log(`sc remove compName=${compName}`);
      this.targetEntity.components.remove(this._compByName.get(compName)!);
      this._compByName.delete(compName);
    };
  }
  log(...args: any[]) {
    log.info(`e${this.targetEntity.id}:  `, ...args);
  }
  private makeLocalComponents(sourceComp: ServerComponent, compName: string) {
    const convertor = componentConversions[compName];

    if (convertor === undefined) {
      this.log(`no client component for server-sent ${compName}`);
      return;
    }
    if (this.targetEntity.components.find((el: Component) => el.constructor.name == compName)) {
      this.log(`had ${compName} already- skipping further adds`);
      return;
    }

    const ctorArgs = (convertor.ctorArgs || []).map((spec: CtorArg): any => {
      const servSchemaMap = sourceComp[spec.servType] as MapSchema;
      let curValue = servSchemaMap.get(spec.attr);
      if (curValue === undefined) {
        this.log(`serverProxyObj ${compName}.${spec.attr} is undefined`);
      }
      if (spec.servType == "propV3") {
        curValue = vector3FromProp(curValue);
      }
      return curValue;
    });

    const componentCtor = convertor.ctor as any; // ideally: as subtypeof(Component)
    const newComp: Component = new componentCtor(...ctorArgs);

    this.log(`making component ${compName}`);
    // until server movement is right:
    if (compName === "S_Transform" && this.targetEntity.components.get(LocallyDriven)) {
      // no sync
    } else {
      new TrackComponentAttrs(sourceComp, newComp, convertor);
    }
    this.targetEntity.components.add(newComp);
    this._compByName.set(compName, newComp);

    this.addLocalComponents(compName, newComp);
  }

  private addLocalComponents(compName: string, newComp: Component) {
    if (compName == "S_Model") {
      // and since this is client, add renderable:
      if (this.targetEntity.components.get(BjsModel)) {
        throw new Error(`ent=${this.targetEntity.id} already had BjsModel`);
      }
      this.targetEntity.components.add(new BjsModel());
    }

    if (compName == "S_NetworkSession") {
      if (newComp.sessionId == this.sessionId) {
        // we're the player
        this.targetEntity.components.add(new PlayerDebug());
        this.targetEntity.components.add(new LocallyDriven());
        this.targetEntity.components.add(new S_UsesNav());
        this.targetEntity.components.add(new LocalCam());
        this.targetEntity.components.add(new ServerRepresented(this.room_temp!));
      }
    }
  }
}

class TrackComponentAttrs<TC extends Component> {
  constructor(private sourceComp: ServerComponent, private targetComp: TC, convertor: Convertor) {
    (convertor.localUpdatedAttrs || []).forEach((spec: UpdateGroup) => {
      this.syncFieldType(spec.attrs, spec.servType);
    });
  }

  syncFieldType(attrsOfThisType: (keyof TC & string)[], servType: keyof ServerComponent) {
    const servSchemaMap = this.sourceComp[servType] as MapSchema;
    if (servSchemaMap.onChange) throw new Error(`not the first schema watcher for ${attrsOfThisType}`);
    servSchemaMap.onChange = () => this.onSourceChange(attrsOfThisType, servSchemaMap, servType);
    this.onSourceChange(attrsOfThisType, servSchemaMap, servType);
  }
  onSourceChange(attrsOfThisType: (keyof TC & string)[], servSchemaMap: MapSchema, servType: keyof ServerComponent) {
    attrsOfThisType.forEach((attr) => {
      this.copySourceToTargetValue(servSchemaMap, attr, servType);
    });
  }

  copySourceToTargetValue(servSchemaMap: MapSchema, attr: keyof TC & string, servType: keyof ServerComponent) {
    let newval = servSchemaMap.get(attr);
    if (servType == "propV3") {
      newval = vector3FromProp(newval);
      // log.info(`sync from sc.${servType}[${attr}]=${newval.toString()} to comp ${comp.constructor.name}`);
    }
    this.targetComp[attr] = newval;
  }
}
