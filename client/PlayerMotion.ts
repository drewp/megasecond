import { Quaternion, Vector3 } from "babylonjs";

export class PlayerMotion {
  // inputs->motion, physics, etc. Might move to server side.
  pos = Vector3.Zero();
  vel = Vector3.Zero();
  facing = Vector3.Forward(); // unit
  step(dt: number) {
    this.pos.addInPlace(this.vel.scale(dt));
    if (this.pos.y > 0) {
      this.vel.y -= dt * 9.8;
    } else
      this.vel.y = 0;
    // fric, grav, coll
  }
  requestJump() {
    this.vel.y = 3;
  }

  onMouseX(movementX: number) {
    const nf = Vector3.Zero();
    const rot = Quaternion.RotationAxis(Vector3.Up(), movementX * 0.001);
    this.facing.rotateByQuaternionAroundPointToRef(rot, Vector3.Zero(), nf);
    this.facing.copyFrom(nf);

    this.vel.rotateByQuaternionAroundPointToRef(rot, Vector3.Zero(), nf);
    this.vel.copyFrom(nf);
  }
}
