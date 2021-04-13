import { Component, ComponentCollection } from "@trixt0r/ecs";
import { S_NetworkSession } from "../../shared/Components";
import { removeComponentsOfType } from "../../shared/EcsOps";
import { IdEntity } from "../../shared/IdEntity";
import { KeepProcessing, LoadUnloadSystem } from "../../shared/LoadUnloadSystem";
import createLogger from "../../shared/logsetup";
import { ClientWorldRunOptions } from "../../shared/types";
import { LocalCam, LocallyDriven, PlayerDebug, ServerRepresented } from "../Components";
const log = createLogger("system");

export class PlayerSetup extends LoadUnloadSystem {
  requiredComponentTypes = [S_NetworkSession];

  processAdded(entity: IdEntity, options: ClientWorldRunOptions): KeepProcessing {
    const ns = entity.getComponentReadonly(S_NetworkSession);
    if (ns.sessionId == options.room.sessionId) {
      // we're the player
      entity.components.add(new PlayerDebug());
      entity.components.add(new LocallyDriven());
      entity.components.add(new LocalCam());
      entity.components.add(new ServerRepresented(options.room));
    }
    return KeepProcessing.STOP_PROCESSING;
  }
  onRemoved(entity: IdEntity, _comps: ComponentCollection<Component>) {
    removeComponentsOfType(entity, PlayerDebug);
    removeComponentsOfType(entity, LocallyDriven);
    removeComponentsOfType(entity, LocalCam);
    removeComponentsOfType(entity, ServerRepresented);
  }
}
