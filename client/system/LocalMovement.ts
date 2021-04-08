import { AbstractEntitySystem } from "@trixt0r/ecs";
import { Mesh, Quaternion, Vector2, Vector3 } from "babylonjs";
import { S_Sim, S_Transform, S_UsesNav } from "../../shared/Components";
import { IdEntity } from "../../shared/IdEntity";
import createLogger from "../../shared/logsetup";
import { ClientWorldRunOptions } from "../../shared/types";
import { LocallyDriven, PlayerDebug } from "../Components";
import { playerStep } from "../Motion";
const log = createLogger("system");

export class LocalMovement extends AbstractEntitySystem<IdEntity> {
  constructor(priority: number) {
    super(priority, [S_Transform, PlayerDebug, LocallyDriven, S_UsesNav]);
  }

  processEntity(entity: IdEntity, _index: number, _entities: unknown, options: ClientWorldRunOptions) {
    const dt = options.dt;
    const pt = entity.components.get(S_Transform);
    const si = entity.components.get(S_Sim);
    const pd = entity.components.get(PlayerDebug);
    const un = entity.components.get(S_UsesNav);
    const ld = entity.components.get(LocallyDriven);

    const mouseX = ld.mouseX,
      stick = new Vector2(ld.stickX, ld.stickY);

    this.onMouseX(mouseX, pt.facing, si.vel);
    si.vel = this.setXZVel(stick, pt.facing, si.vel);

    const navMesh = options.scene.getMeshByName("navmesh") as Mesh;
    [pt.pos, si.vel, pt.facing, un.grounded, un.currentNavFaceId] = playerStep(dt, pt.pos, si.vel, pt.facing, navMesh, pd, un.currentNavFaceId);
  }

  private onMouseX(movementX: number, facing: Vector3 /*mutated*/, vel: Vector3 /*mutated*/) {
    const nf = Vector3.Zero();
    const rot = Quaternion.RotationAxis(Vector3.Up(), movementX * 0.0002);
    facing.rotateByQuaternionAroundPointToRef(rot, Vector3.Zero(), nf);
    facing.copyFrom(nf);

    vel.rotateByQuaternionAroundPointToRef(rot, Vector3.Zero(), nf);
    vel.copyFrom(nf);
  }

  private setXZVel(stick: Vector2, facing: Vector3, vel: Vector3) {
    const runMult = 1; // todo get shift key
    const forwardComp = facing.scale(-2.5 * stick.y * runMult);
    const sidewaysComp = facing.cross(Vector3.Up()).scale(-2 * stick.x * runMult);
    const xzComp = forwardComp.add(sidewaysComp);

    const yComp = vel.multiplyByFloats(0, 1, 0);
    return xzComp.add(yComp);
  }
}
