import { Mesh, Ray, Vector3 } from "babylonjs";
import createLogger from "../shared/logsetup";
import { PlayerDebug } from "./Components";
const log = createLogger("walk");

function projectToSegment(pt: Vector3, segStart: Vector3, segEnd: Vector3): Vector3 {
  const t =
    Vector3.Dot(pt.subtract(segStart), segEnd.subtract(segStart)) / //
    Vector3.Dot(segEnd.subtract(segStart), segEnd.subtract(segStart));
  return segStart.add(segEnd.subtract(segStart).scale(t));
}

export function walkAlongNavMesh(pos: Vector3, tryPos: Vector3, pd: PlayerDebug, nav: Mesh, currentNavFaceId: number) {
  const knees = tryPos.add(new Vector3(0, 0.5, 0));

  const down = new Ray(knees, Vector3.Down());
  if (pd) {
    pd.debugNavRay!.set(down.origin, down.origin.add(down.direction));
  }

  const info = down.intersectsMesh(nav as any);

  const verts = currentNavFace(nav, currentNavFaceId);
  if (pd) {
    pd.debugCurNavFace![0].set(verts[0]);
    pd.debugCurNavFace![1].set(verts[1]);
    pd.debugCurNavFace![2].set(verts[2]);
  }
  let grounded;
  if (!info.hit) {
    pos = closestEdgeProject(tryPos, verts);
    grounded = true;
  } else {
    currentNavFaceId = info.faceId;
    pos = tryPos;
    const groundY = info.pickedPoint!.y;
    if (groundY + 0.01 > tryPos.y) {
      pos.y = groundY;
      grounded = true;
    } else {
      grounded = false;
    }
    if (pd) {
      pd.debugNavHit!.set(knees, info.pickedPoint!);
    }
  }
  return { grounded, currentNavFaceId, pos };
}

function closestEdgeProject(tryPos: Vector3, verts: Vector3[]): Vector3 {
  const projTries = [projectToSegment(tryPos, verts[0], verts[1]), projectToSegment(tryPos, verts[1], verts[2]), projectToSegment(tryPos, verts[2], verts[0])];
  const withDist = [
    { proj: projTries[0], dist: projTries[0].subtract(tryPos).length() },
    { proj: projTries[1], dist: projTries[1].subtract(tryPos).length() },
    { proj: projTries[2], dist: projTries[2].subtract(tryPos).length() },
  ];
  withDist.sort((a, b) => {
    return a.dist - b.dist;
  });
  return withDist[0].proj;
}

function currentNavFace(nav: Mesh, currentNavFaceId: number): Vector3[] {
  const navIndices = nav.getIndices()!;
  const currentFaceVertIndices = [navIndices[currentNavFaceId * 3 + 0], navIndices[currentNavFaceId * 3 + 1], navIndices[currentNavFaceId * 3 + 2]];
  const navVertPos = nav.getVerticesData(BABYLON.VertexBuffer.PositionKind)!;
  const verts = [
    new Vector3(navVertPos[currentFaceVertIndices[0] * 3 + 0], navVertPos[currentFaceVertIndices[0] * 3 + 1], navVertPos[currentFaceVertIndices[0] * 3 + 2]),
    new Vector3(navVertPos[currentFaceVertIndices[1] * 3 + 0], navVertPos[currentFaceVertIndices[1] * 3 + 1], navVertPos[currentFaceVertIndices[1] * 3 + 2]),
    new Vector3(navVertPos[currentFaceVertIndices[2] * 3 + 0], navVertPos[currentFaceVertIndices[2] * 3 + 1], navVertPos[currentFaceVertIndices[2] * 3 + 2]),
  ];
  // verts are local to navmesh, which is under
  const rootTransform = nav.getWorldMatrix();
  verts[0] = Vector3.TransformCoordinates(verts[0], rootTransform);
  verts[1] = Vector3.TransformCoordinates(verts[1], rootTransform);
  verts[2] = Vector3.TransformCoordinates(verts[2], rootTransform);
  return verts;
}
