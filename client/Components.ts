import { Component } from "@trixt0r/ecs";
import { AbstractMesh, Color3, DynamicTexture, FollowCamera, Mesh, Scene, Vector3 } from "babylonjs";
import * as Colyseus from "colyseus.js";
import { ShowPoint, ShowSegment } from "../client/Debug";
import createLogger from "../shared/logsetup";
import { Player as NetPlayer, WorldState } from "../shared/WorldRoom";
import { makeObservable, observable } from "mobx";
import { StandardMaterial } from "babylonjs/Materials/standardMaterial";

const log = createLogger("component");

export class LocalCam implements Component {
  public cam: FollowCamera;
  public birds_eye_view = false;
  constructor(scene: Scene) {
    this.cam = new FollowCamera("cam", new Vector3(-1.4, 1.5, -4), scene);
    this.cam.inputs.clear();
    this.cam.radius = 2;
    this.cam.heightOffset = 1;
    this.cam.fov = 1.2;
    this.cam.rotationOffset = 180;
    this.cam.cameraAcceleration = 0.5;
    scene.switchActiveCamera(this.cam);
  }

  toggleBirdsEyeView() {
    if (!this.birds_eye_view) {
      this.cam.heightOffset += 100;
      this.birds_eye_view = true;
    } else {
      this.cam.heightOffset -= 100;
      this.birds_eye_view = false;
    }
  }
}

export class ServerRepresented implements Component {
  public lastSentTime = 0; // ms
  public lastSent: any;
  public receivedPos = Vector3.Zero();
  public receivedFacing = Vector3.Forward();
  constructor(
    public worldRoom: Colyseus.Room<WorldState>,
    public netPlayer: NetPlayer // with latest server state
  ) {}
}

export class LocallyDriven implements Component {
  // temporary tag for the local player that recvs input
  constructor() {}
}

export class PlayerDebug implements Component {
  debugNavHit: ShowSegment;
  debugNavRay: ShowSegment;
  debugCurNavFace: ShowPoint[];
  constructor(scene: Scene) {
    this.debugNavHit = new ShowSegment(scene, Color3.Red(), Color3.Blue());
    this.debugNavRay = new ShowSegment(scene, Color3.Magenta(), Color3.Magenta());
    this.debugCurNavFace = [0, 1, 2].map(() => new ShowPoint(scene, Color3.Green()));
  }
}

export class Nametag implements Component {
  // draw nametag on this model
  public text: string = "?";
  public plane?: Mesh;
  public tx?: DynamicTexture;
  public mat?: StandardMaterial;
  constructor(public offsetY: number, public netPlayer: NetPlayer) {
    makeObservable(this, { text: observable });
  }
}
