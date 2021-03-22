import { Color3 } from "babylonjs";
import { IdEntity } from "../../shared/IdEntity";
import { KeepProcessing, LoadUnloadSystem } from "../../shared/LoadUnloadSystem";
import { ClientWorldRunOptions } from "../../shared/types";
import { PlayerDebug } from "../Components";
import { ShowPoint, ShowSegment } from "../Debug";

export class PlayerDebugLoadUnload extends LoadUnloadSystem {
  requiredComponents = [PlayerDebug];
  processAdded(entity: IdEntity, options: ClientWorldRunOptions): KeepProcessing {
    const pd = entity.components.get(PlayerDebug);

    pd.debugNavHit = new ShowSegment(options.scene, Color3.Red(), Color3.Blue());
    pd.debugNavRay = new ShowSegment(options.scene, Color3.Magenta(), Color3.Magenta());
    pd.debugCurNavFace = [0, 1, 2].map(() => new ShowPoint(options.scene, Color3.Green()));

    return KeepProcessing.STOP_PROCESSING;
  }
  onRemoved(entity: IdEntity) {
    // todo
  }
}
