import { AbstractEntitySystem, Component } from "@trixt0r/ecs";
import { Color3, Matrix, Mesh, Quaternion, Ray, Scene, Vector2, Vector3 } from "babylonjs";
import createLogger from "logging";
import { ShowPoint, ShowSegment } from "./Debug";
import { removeComponent } from "./EcsOps";
import { IdEntity } from "./IdEntity";
import { WorldRunOptions } from "./types";
const log = createLogger("PlayerMotion");

function projectToSegment(pt: Vector3, segStart: Vector3, segEnd: Vector3): Vector3 {
  const t =
    Vector3.Dot(pt.subtract(segStart), segEnd.subtract(segStart)) / //
    Vector3.Dot(segEnd.subtract(segStart), segEnd.subtract(segStart));
  return segStart.add(segEnd.subtract(segStart).scale(t));
}

export class PlayerTransform implements Component {
  constructor(
    public scene: Scene,
    public pos: Vector3,
    public vel: Vector3, // move this to a motion component
    public facing: Vector3,
    public nav: Mesh, // move to Grounded?
    public rootTransform: Matrix,
    public currentNavFaceId = 0,
    public grounded = false
  ) {}
  get heading(): number {
    return (360 / (2 * Math.PI)) * Math.atan2(-this.facing.z, this.facing.x) + 270;
  }
}

export class PlayerDebug implements Component {
  debugNavHit: ShowSegment;
  debugNavRay: ShowSegment;
  debugCurNavFace: ShowPoint[];
  constructor(scene: Scene) {
    this.debugNavHit = new ShowSegment(scene, Color3.Red(), Color3.Blue());
    this.debugNavRay = new ShowSegment(scene, Color3.Magenta(), Color3.Magenta());
    this.debugCurNavFace = [0, 1, 2].map((i) => new ShowPoint(scene, Color3.Green()));
  }
}

export class InitJump implements Component {
  constructor() {}
}

export class PlayerJump extends AbstractEntitySystem<IdEntity> {
  processEntity(entity: IdEntity, index: number, entities: unknown, options: WorldRunOptions) {
    const pt = entity.components.get(PlayerTransform);
    if (pt.grounded) {
      pt.vel.y = 3;
    }

    removeComponent(entity, InitJump);
  }
}

export class PlayerMovement extends AbstractEntitySystem<IdEntity> {
  processEntity(entity: IdEntity, index: number, entities: unknown, options: WorldRunOptions) {
    const dt = options.dt;
    const pt = entity.components.get(PlayerTransform);
    const pd = entity.components.get(PlayerDebug);

    const mouseX = options.userInput.mouseX,
      stick = new Vector2(options.userInput.stickX, options.userInput.stickY);

    this.onMouseX(mouseX, pt.facing, pt.vel);
    pt.vel = this.setXZVel(stick, pt.facing, pt.vel);
    const tryPos = pt.pos.add(pt.vel.scale(dt));

    const knees = tryPos.add(new Vector3(0, 0.5, 0));

    const down = new Ray(knees, Vector3.Down());
    pd.debugNavRay.set(down.origin, down.origin.add(down.direction));

    const info = down.intersectsMesh(pt.nav as any);

    const verts = this.currentNavFace(pt.nav, pt.rootTransform, pt.currentNavFaceId);
    pd.debugCurNavFace[0].set(verts[0]);
    pd.debugCurNavFace[1].set(verts[1]);
    pd.debugCurNavFace[2].set(verts[2]);

    if (!info.hit) {
      pt.pos = this._closestEdgeProject(tryPos, verts);
      pt.grounded = true;
    } else {
      pt.currentNavFaceId = info.faceId;
      pt.pos = tryPos;
      const groundY = info.pickedPoint!.y;
      if (groundY + 0.01 > tryPos.y) {
        pt.pos.y = groundY;
        pt.grounded = true;
      } else {
        pt.grounded = false;
      }
      pd.debugNavHit.set(knees, info.pickedPoint!);
    }

    if (!pt.grounded) {
      pt.vel.y -= dt * 9.8;
    } else {
      pt.vel.y = 0;
    }
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

  private currentNavFace(nav: Mesh, rootTransform: Matrix, currentNavFaceId: number): Vector3[] {
    const navIndices = nav.getIndices()!;
    const currentFaceVertIndices = [navIndices[currentNavFaceId * 3 + 0], navIndices[currentNavFaceId * 3 + 1], navIndices[currentNavFaceId * 3 + 2]];
    const navVertPos = nav.getVerticesData(BABYLON.VertexBuffer.PositionKind)!;
    const verts = [
      new Vector3(navVertPos[currentFaceVertIndices[0] * 3 + 0], navVertPos[currentFaceVertIndices[0] * 3 + 1], navVertPos[currentFaceVertIndices[0] * 3 + 2]),
      new Vector3(navVertPos[currentFaceVertIndices[1] * 3 + 0], navVertPos[currentFaceVertIndices[1] * 3 + 1], navVertPos[currentFaceVertIndices[1] * 3 + 2]),
      new Vector3(navVertPos[currentFaceVertIndices[2] * 3 + 0], navVertPos[currentFaceVertIndices[2] * 3 + 1], navVertPos[currentFaceVertIndices[2] * 3 + 2]),
    ];
    // verts are local to navmesh, which is under
    verts[0] = Vector3.TransformCoordinates(verts[0], rootTransform);
    verts[1] = Vector3.TransformCoordinates(verts[1], rootTransform);
    verts[2] = Vector3.TransformCoordinates(verts[2], rootTransform);
    return verts;
  }
}
