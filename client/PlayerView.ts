import { AbstractEntitySystem } from "@trixt0r/ecs";
import { Vector3 } from "babylonjs";
import { AimAt, BjsMesh, Toucher, Transform } from "../shared/Components";
import { IdEntity } from "../shared/IdEntity";
import createLogger from "../shared/logsetup";
import { ClientWorldRunOptions } from "../shared/types";

export const log = createLogger("PlayerView");

export function CreatePlayer() {
  // X=left, Y=up, Z=fwd
  const p = new IdEntity();

  // const sunCaster = (window as any).gen as ShadowGenerator; // todo
  // if (sunCaster) {
  //   sunCaster.addShadowCaster(body);
  // }
  p.components.add(new BjsMesh("model/player/player"));
  p.components.add(new AimAt("player_aim"));
  p.components.add(new Toucher(/*posOffset=*/ new Vector3(0, 1.2, 0), /*radius=*/ 0.3, new Set()));

  return p;
}

// Transform -> BjsMesh.root
export class TransformMesh extends AbstractEntitySystem<IdEntity> {
  constructor(priority: number) {
    super(priority, [BjsMesh, Transform]);
  }

  processEntity(entity: IdEntity, _index: number, _entities: unknown, _options: ClientWorldRunOptions) {
    const tr = entity.components.get(Transform);
    const root = entity.components.get(BjsMesh).root;
    if (root) {
      root.position.copyFrom(tr.pos);
      root.lookAt(root.position.add(tr.facing));
    }
  }
}
