import { Component, Engine } from "@trixt0r/ecs";
import { Vector3 } from "babylonjs";
import { Room } from "colyseus.js";
import { LocalCam, LocallyDriven, PlayerDebug, ServerRepresented } from "../client/Components";
import { PropV3, ServerComponent, ServerEntity } from "./ColyTypesForEntities";
import { AimAt, BjsModel, Model, NetworkSession, Touchable, Toucher, Transform, Twirl, UsesNav } from "./Components";
import { IdEntity } from "./IdEntity";
import createLogger from "./logsetup";
import { Player, WorldRoom, WorldState } from "./WorldRoom";
const log = createLogger("sync");

function vector3FromProp(p: PropV3): Vector3 {
  return new Vector3(p.x, p.y, p.z);
}

export class TrackServerEntities {
  sessionId?: string;
  room_temp?: Room<WorldState>;
  netPlayer_temp?: Player;
  constructor(public world: Engine) {}

  trackEntities(state: WorldState, sessionId: string, room_temp: Room<WorldState>) {
    this.room_temp = room_temp;
    // make world entities for the ones in state
    this.sessionId = sessionId;
    state.entities.forEach((se: ServerEntity) => {
      this.addServerEntity(se);
    });
    state.entities.onAdd = (se: ServerEntity) => this.addServerEntity(se);
  }

  private addServerEntity(se: ServerEntity) {
    log.info(`addServerEntity id=${se.id}`);
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
    if (false) {
    } else if (compName == "NetworkSession") {
      lc = new NetworkSession(sc.propString.get("sessionId")!);
      if (lc.sessionId == this.sessionId) {
        // we're the player
        ent.components.add(new PlayerDebug());
        ent.components.add(new LocallyDriven());
        ent.components.add(new UsesNav());
        ent.components.add(new LocalCam());
        ent.components.add(new ServerRepresented(this.room_temp!));
      }
    } else if (compName == "Model") {
      lc = new Model(sc.propString.get("modelPath")!);
      // and since this is client, add renderable:
      ent.components.add(new BjsModel());
    } else if (compName == "Toucher") {
      lc = new Toucher(vector3FromProp(sc.propV3.get("posOffset")!), sc.propFloat32.get("radius")!, new Set());
    } else if (compName == "AimAt") {
      lc = new AimAt(sc.propString.get("objName")!);
    } else if (compName == "Touchable") {
      lc = new Touchable();
    } else if (compName == "Twirl") {
      lc = new Twirl(sc.propFloat32.get("degPerSec"));
    } else if (compName == "Transform") {
      lc = new Transform(
        vector3FromProp(sc.propV3.get("pos")!), //
        vector3FromProp(sc.propV3.get("vel")!),
        vector3FromProp(sc.propV3.get("facing")!)
      );
    } else {
      throw new Error(`server sent unknown ${compName} component`);
    }
    log.info(`making entity ${ent.id} component ${compName}`);
    ent.components.add(lc);
  }
}
