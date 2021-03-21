import { AbstractEntitySystem } from "@trixt0r/ecs";
import { AimAt, BjsModel, InitNametag } from "../../shared/Components";
import { removeComponent } from "../../shared/EcsOps";
import { IdEntity } from "../../shared/IdEntity";
import createLogger from "../../shared/logsetup";
import { ClientWorldRunOptions } from "../../shared/types";
import { Nametag } from "../Components";

const log = createLogger("system");

export class CreateNametag extends AbstractEntitySystem<IdEntity> {
  constructor(priority: number) {
    super(priority, [BjsModel, AimAt, InitNametag]);
  }
  processEntity(entity: IdEntity, _index: number, _entities: unknown, options: ClientWorldRunOptions) {
    const aa = entity.components.get(AimAt);
    const init = entity.components.get(InitNametag);

    const nt = new Nametag(init.offsetY);
    
    const netPlayer = init.netPlayer;
    {
      // where does this go? In RepaintNametag somehow?
      const onNickChanged = () => {
        log.info("onNickChanged", netPlayer.nick);
        nt.text = netPlayer.nick;
      };
      log.info("listening for nick change on ", netPlayer.sessionId);
      netPlayer.listen("nick", onNickChanged);
      onNickChanged();
    }

    entity.components.add(nt);
    removeComponent(entity, InitNametag);
  }
}
