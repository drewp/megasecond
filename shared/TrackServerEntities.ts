import { Component, Engine } from "@trixt0r/ecs";
import { Vector3 } from "babylonjs";
import { BjsModel, Model, Touchable, Transform, Twirl } from "./Components";
import { IdEntity } from "./IdEntity";
import { PropV3, ServerComponent, ServerEntity, WorldState } from "./WorldRoom";

function vector3FromProp(p: PropV3): Vector3 {
  return new Vector3(p.x, p.y, p.z);
}
export class TrackServerEntities {
  constructor(public world: Engine) {}

  trackEntities(state: WorldState) {
    // make world entities for the ones in state
    state.entities.forEach((se: ServerEntity) => {
      this.addServerEntity(se);
    });
    state.entities.onAdd = (se: ServerEntity) => this.addServerEntity(se);
  }

  private addServerEntity(se: ServerEntity) {
    const ent = new IdEntity();
    this.world.entities.add(ent);

    const addComp = (sc: ServerComponent, compName: string) => {
      this.makeLocalComponents(compName, sc, ent);
    };
    se.components.forEach(addComp);
    se.components.onAdd = addComp;
  }

  private makeLocalComponents(compName: string, sc: ServerComponent, ent: IdEntity) {
    let lc: Component;
    if (compName == "Touchable") {
      lc = new Touchable();
    } else if (compName == "Twirl") {
      lc = new Twirl(sc.propFloat32.get("degPerSec"));
    } else if (compName == "Transform") {
      lc = new Transform(
        vector3FromProp(sc.propV3.get("pos")!), //
        vector3FromProp(sc.propV3.get("vel")!),
        vector3FromProp(sc.propV3.get("facing")!)
      );
    } else if (compName == "Model") {
      lc = new Model(sc.propString.get("modelPath")!);
      // and since this is client, add renderable:
      ent.components.add(new BjsModel());
    } else {
      throw new Error(`server sent unknown ${compName} component`);
    }
    ent.components.add(lc);
  }
}
