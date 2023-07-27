import { MapSchema } from "@colyseus/schema";
import { Component, ComponentClass, Engine } from "@trixt0r/ecs";
import { Vector3 } from "babylonjs";
import { LocallyDriven } from "../client/Components";
import { componentConversions, S_Transform } from "../shared/Components";
import { IdEntity } from "../shared/IdEntity";
import createLogger from "../shared/logsetup";
import { Convertor, CtorArg, PropV3, ServerComponent, ServerEntity, UpdateGroup } from "../shared/SyncTypes";
import { WorldState } from "../shared/SyncTypes";
const log = createLogger("sync");

function vector3FromProp(p: PropV3): Vector3 {
  return new Vector3(p.x, p.y, p.z);
}

export class TrackServerEntities {
  _entityByServId: Map<string, IdEntity> = new Map();
  constructor(public world: Engine) {}

  trackEntities(state: WorldState) {
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

    new TrackServerComponents(se, ent);
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
  _autoComps = new Map<string, Component[]>();
  _trackingServerComps = new Set<string>();
  constructor(private sourceEntity: ServerEntity, private targetEntity: IdEntity) {
    // we need this one because entity can show up with a bunch of components already...
    this.sourceEntity.components.forEach(this.makeLocalComponents.bind(this));
    // ...and then this one sometimes makes repeated calls of some components.
    this.sourceEntity.components.onAdd = this.makeLocalComponents.bind(this);

    this.sourceEntity.components.onChange = (_sourceComp: ServerComponent, compName: string) => {
      this.log(`sc change compName=${compName}`);
    };
    this.sourceEntity.components.onRemove = this.onRemove.bind(this);
  }

  log(...args: any[]) {
    log.info(`e${this.targetEntity.id}:  `, ...args);
  }

  private makeLocalComponents(sourceComp: ServerComponent, compName: string) {
    if (this._trackingServerComps.has(compName)) {
      // unexpected repeated add, but I know the server only has one comp per type on an entity.
      return;
    }
    this._trackingServerComps.add(compName);
    this.log("build local comps for server comp", compName);
    if (!this._autoComps.has(compName)) {
      this._autoComps.set(compName, []);
    }
    (componentConversions[compName] || []).forEach((convertor) => {
      const made = this.makeLocalComponent(sourceComp, convertor);
      this._autoComps.get(compName)!.push(made);
    });
  }

  private makeLocalComponent(sourceComp: ServerComponent, convertor: Convertor): Component {
    const classToMake: ComponentClass<Component> = convertor.ctor;

    const ctorArgs = (convertor.ctorArgs || []).map((spec: CtorArg): any => {
      const servSchemaMap = sourceComp[spec.servType] as MapSchema;
      let curValue = servSchemaMap.get(spec.attr);
      if (curValue === undefined) {
        this.log(`serverProxyObj ${spec.attr} is undefined`);
      }
      if (spec.servType == "propV3") {
        curValue = vector3FromProp(curValue);
      }
      return curValue;
    });

    const newComp: Component = new classToMake(...ctorArgs);

    this.log(`TrackServerComponents.makeLocalComponents making component ${classToMake.name}`);
    // until server movement is right:
    if (classToMake === S_Transform && this.targetEntity.components.get(LocallyDriven)) {
      // no sync
    } else {
      new TrackComponentAttrs(sourceComp, newComp, convertor);
    }
    this.targetEntity.components.add(newComp);
    return newComp;
  }

  onRemove(_sourceComp: ServerComponent, compName: string) {
    (this._autoComps.get(compName) || []).forEach((c: Component) => {
      this.log(`sc remove compName=${c.constructor.name}`);
      this.targetEntity.components.remove(c);
    });
    this._autoComps.delete(compName);
    this._trackingServerComps.delete(compName);
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
    servSchemaMap.onChange((item:any,key:string) => 
    this.onSourceChange(attrsOfThisType, servSchemaMap, servType, key));
    this.onSourceChange(attrsOfThisType, servSchemaMap, servType, null);
  }

  onSourceChange(attrsOfThisType: (keyof TC & string)[], servSchemaMap: MapSchema, servType: keyof ServerComponent,
  key: string|null) {
    //key is from a new api- not sure if it's useful here.
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
