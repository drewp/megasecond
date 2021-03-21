import { AbstractEntitySystem } from "@trixt0r/ecs";
import { BjsModel, Transform } from "../../shared/Components";
import { IdEntity } from "../../shared/IdEntity";
import { ClientWorldRunOptions } from "../../shared/types";


export class TransformMesh extends AbstractEntitySystem<IdEntity> {
  // Transform -> BjsModel.root
  constructor(priority: number) {
    super(priority, [BjsModel, Transform]);
  }

  processEntity(entity: IdEntity, _index: number, _entities: unknown, _options: ClientWorldRunOptions) {
    const tr = entity.components.get(Transform);
    const root = entity.components.get(BjsModel).root;
    if (root) {
      root.position.copyFrom(tr.pos);
      root.lookAt(root.position.add(tr.facing));
    }
  }
}
