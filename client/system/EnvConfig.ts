import { AbstractEntitySystem } from "@trixt0r/ecs";
import { IdEntity } from "../../shared/IdEntity";
import createLogger from "../../shared/logsetup";
import { ClientWorldRunOptions } from "../../shared/types";
import { Action, LocallyDriven } from "../Components";
import * as Env from "../Env";

const log = createLogger("system");

export class EnvConfig extends AbstractEntitySystem<IdEntity> {
  constructor(priority: number) {
    super(priority, [LocallyDriven]);
  }

  processEntity(entity: IdEntity, _index: number, _entities: unknown, options: ClientWorldRunOptions) {
    const ld = entity.components.get(LocallyDriven);
    ld.forAction(Action.ReloadEnv, () => {
      // todo
      // env.reloadLayoutInstances();
    });
    ld.forAction(Action.ToggleNavmeshView, () => {
      Env.toggleNavmeshView(options.scene);
    });
  }
}
