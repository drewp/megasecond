import { AbstractEntitySystem } from "@trixt0r/ecs";
import { IdEntity } from "../../shared/IdEntity";
import { ClientWorldRunOptions } from "../../shared/types";
import { BjsModel, C_Transform } from "../Components";

export class TransformMesh extends AbstractEntitySystem<IdEntity> {
  // Transform -> BjsModel.root
  constructor(priority: number) {
    super(priority, [BjsModel, C_Transform]);
  }

  processEntity(entity: IdEntity, _index: number, _entities: unknown, _options: ClientWorldRunOptions) {
    const tr = entity.components.get(C_Transform);
    const bm = entity.components.get(BjsModel);
    const root = bm.instance!.root;
    if (root) {
      root.position.copyFrom(tr.pos);
      root.lookAt(root.position.add(tr.facing));
    }
  }
}
