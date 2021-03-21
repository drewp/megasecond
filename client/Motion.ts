import { Mesh, Vector3 } from "babylonjs";
import createLogger from "../shared/logsetup";
import { PlayerDebug } from "./Components";
import { walkAlongNavMesh } from "./walkAlongNavMesh";

const log = createLogger("Motion");

// server will run this too
export function playerStep(
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
