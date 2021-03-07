import { AbstractEntitySystem, Component } from "@trixt0r/ecs";
import { Color3, Mesh, Quaternion, Scene, Vector2, Vector3 } from "babylonjs";
import createLogger from "../shared/logsetup";
import { IdEntity } from "./IdEntity";
import { WorldRunOptions } from "./types";
import { PlayerDebug, UsesNav, walkAlongNavMesh } from "./walkAlongNavMesh";

const log = createLogger("Motion");

export class Transform implements Component {
  constructor(
    public pos: Vector3,
    public vel: Vector3, // move this to a motion component
    public facing: Vector3
  ) {}
  get heading(): number {
    return (360 / (2 * Math.PI)) * Math.atan2(-this.facing.z, this.facing.x) + 270;
  }
}

export class Twirl implements Component {
  constructor(public degPerSec = 1) {}
}

// server will run this too
function playerStep(
  dt: number,
  pos: Vector3,
  vel: Vector3,
  facing: Vector3,
  nav: Mesh,
  pd: PlayerDebug,
  currentNavFaceId: number
): [Vector3, Vector3, Vector3, boolean, number] {
  const tryPos = pos.add(vel.scale(dt));

  let grounded;
  ({ grounded, currentNavFaceId, pos } = walkAlongNavMesh(pos, tryPos, pd, nav, currentNavFaceId));

  if (!grounded) {
    vel.y -= dt * 9.8;
  } else {
    vel.y = 0;
  }
  return [pos, vel, facing, grounded, currentNavFaceId];
}

export class LocalMovement extends AbstractEntitySystem<IdEntity> {
  processEntity(entity: IdEntity, _index: number, _entities: unknown, options: WorldRunOptions) {
    const dt = options.dt;
    const pt = entity.components.get(Transform);
    const pd = entity.components.get(PlayerDebug);
    const un = entity.components.get(UsesNav);

    const mouseX = options.userInput.mouseX,
      stick = new Vector2(options.userInput.stickX, options.userInput.stickY);

    this.onMouseX(mouseX, pt.facing, pt.vel);
    pt.vel = this.setXZVel(stick, pt.facing, pt.vel);

    [pt.pos, pt.vel, pt.facing, un.grounded, un.currentNavFaceId] = playerStep(dt, pt.pos, pt.vel, pt.facing, un.nav, pd, un.currentNavFaceId);
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

export class SimpleMove extends AbstractEntitySystem<IdEntity> {
  processEntity(entity: IdEntity, _index: number, _entities: unknown, options: WorldRunOptions) {
    const tr = entity.components.get(Transform);
    const tw = entity.components.get(Twirl);

    // (accumulates error)
    const rot = Quaternion.RotationAxis(Vector3.Up(), tw.degPerSec * options.dt);
    const nf = Vector3.Zero();
    tr.facing.rotateByQuaternionAroundPointToRef(rot, Vector3.Zero(), nf);
    tr.facing.copyFrom(nf);
  }
}
