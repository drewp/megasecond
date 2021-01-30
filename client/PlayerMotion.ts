import { AbstractMesh, Color3, Matrix, Mesh, Quaternion, Ray, Scene, ThinEngine, Vector3 } from "babylonjs";
import { ShowPoint, ShowSegment } from "./Debug";

function projectToSegment(pt: Vector3, segStart: Vector3, segEnd: Vector3): Vector3 {
  const t =
    Vector3.Dot(pt.subtract(segStart), segEnd.subtract(segStart)) / //
    Vector3.Dot(segEnd.subtract(segStart), segEnd.subtract(segStart));
  return segStart.add(segEnd.subtract(segStart).scale(t));
}

export class PlayerMotion {
  // inputs->motion, physics, etc. Might move to server side.
  pos = Vector3.Zero();
  vel = Vector3.Zero();
  facing = Vector3.Forward(); // unit
  nav: Mesh;
  rootTransform: Matrix;
  currentNavFaceId = 0;
  grounded = false;
  debugNavHit: ShowSegment;
  debugNavRay: ShowSegment;
  debugCurNavFace: ShowPoint[];
  constructor(public scene: Scene) {
    this.nav = scene.getMeshByName("navmesh") as Mesh;
    this.nav.updateFacetData();

    this.debugNavHit = new ShowSegment(scene, Color3.Red(), Color3.Blue());
    this.debugNavRay = new ShowSegment(scene, Color3.Magenta(), Color3.Magenta());
    this.debugCurNavFace = [0, 1, 2].map((i) => new ShowPoint(scene, Color3.Green()));

    this.rootTransform = this.nav.getWorldMatrix()!;
  }

  onMouseX(movementX: number) {
    const nf = Vector3.Zero();
    const rot = Quaternion.RotationAxis(Vector3.Up(), movementX * 0.006);
    this.facing.rotateByQuaternionAroundPointToRef(rot, Vector3.Zero(), nf);
    this.facing.copyFrom(nf);

    this.vel.rotateByQuaternionAroundPointToRef(rot, Vector3.Zero(), nf);
    this.vel.copyFrom(nf);
  }

  onStick(x: number, y: number) {
    const forwardComp = this.facing.scale(-2.5 * y);
    const sidewaysComp = this.facing.cross(Vector3.Up()).scale(-2 * x);
    const xzComp = forwardComp.add(sidewaysComp);

    const yComp = this.vel.multiplyByFloats(0, 1, 0);
    this.vel = xzComp.add(yComp);
  }

  requestJump() {
    if (this.grounded) {
      this.vel.y = 3;
    }
  }

  step(dt: number) {
    const tryPos = this.pos.add(this.vel.scale(dt));

    const knees = tryPos.add(new Vector3(0, 0.5, 0));

    const down = new Ray(knees, Vector3.Down());
    this.debugNavRay.set(down.origin, down.origin.add(down.direction));

    const info = down.intersectsMesh(this.nav as any);

    const verts = this._currentNavFace();
    this.debugCurNavFace[0].set(verts[0]);
    this.debugCurNavFace[1].set(verts[1]);
    this.debugCurNavFace[2].set(verts[2]);

    if (!info.hit) {
      this.pos = this._closestEdgeProject(tryPos, verts);
      this.grounded = true;
    } else {
      this.currentNavFaceId = info.faceId;
      this.pos = tryPos;
      const groundY = info.pickedPoint!.y;
      if (groundY > tryPos.y) {
        this.pos.y = groundY;
        this.grounded = true;
      } else {
        this.grounded = false;
      }
      this.debugNavHit.set(knees, info.pickedPoint!);
    }

    if (!this.grounded) {
      this.vel.y -= dt * 9.8;
    } else {
      this.vel.y = 0;
    }
  }

  private _closestEdgeProject(tryPos: Vector3, verts: Vector3[]): Vector3 {
    const projTries = [
      projectToSegment(tryPos, verts[0], verts[1]),
      projectToSegment(tryPos, verts[1], verts[2]),
      projectToSegment(tryPos, verts[2], verts[0]),
    ];
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

  _currentNavFace(): Vector3[] {
    const navIndices = this.nav.getIndices()!;
    const currentFaceVertIndices = [
      navIndices[this.currentNavFaceId * 3 + 0],
      navIndices[this.currentNavFaceId * 3 + 1],
      navIndices[this.currentNavFaceId * 3 + 2],
    ];
    const navVertPos = this.nav.getVerticesData(BABYLON.VertexBuffer.PositionKind)!;
    const verts = [
      new Vector3(navVertPos[currentFaceVertIndices[0] * 3 + 0], navVertPos[currentFaceVertIndices[0] * 3 + 1], navVertPos[currentFaceVertIndices[0] * 3 + 2]),
      new Vector3(navVertPos[currentFaceVertIndices[1] * 3 + 0], navVertPos[currentFaceVertIndices[1] * 3 + 1], navVertPos[currentFaceVertIndices[1] * 3 + 2]),
      new Vector3(navVertPos[currentFaceVertIndices[2] * 3 + 0], navVertPos[currentFaceVertIndices[2] * 3 + 1], navVertPos[currentFaceVertIndices[2] * 3 + 2]),
    ];
    // verts are local to navmesh, which is under
    verts[0] = Vector3.TransformCoordinates(verts[0], this.rootTransform);
    verts[1] = Vector3.TransformCoordinates(verts[1], this.rootTransform);
    verts[2] = Vector3.TransformCoordinates(verts[2], this.rootTransform);
    return verts;
  }
}
