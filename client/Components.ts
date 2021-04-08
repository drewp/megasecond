import { Component } from "@trixt0r/ecs";
import { FollowCamera, Vector3, AssetContainer, TransformNode } from "babylonjs";
import { ShaderMaterial } from "babylonjs/Materials/shaderMaterial";
import { Mesh } from "babylonjs/Meshes/mesh";
import * as Colyseus from "colyseus.js";
import { ShowPoint, ShowSegment } from "../client/Debug";
import createLogger from "../shared/logsetup";
import { WorldState } from "../shared/WorldRoom";
import { MobileSticks } from "./system/UserInput";

const log = createLogger("component");

export class LocalCam implements Component {
  public cam?: FollowCamera;
  public birds_eye_view = false;
  constructor() {}

  toggleBirdsEyeView() {
    if (!this.birds_eye_view) {
      this.cam!.heightOffset += 100;
      this.birds_eye_view = true;
    } else {
      this.cam!.heightOffset -= 100;
      this.birds_eye_view = false;
    }
  }
}

export class ServerRepresented implements Component {
  public lastSentTime = 0; // ms
  public lastSent: any;
  public receivedPos = Vector3.Zero();
  public receivedFacing = Vector3.Forward();
  constructor(public worldRoom: Colyseus.Room<WorldState>) {}
}

export enum Action {
  Jump,
  Activate,
  ActivateRelease,
  ToggleNavmeshView,
  ToggleBirdsEyeView,
  ReloadEnv,
}

export class LocallyDriven implements Component {
  public stickKeyX = 0; // exact state of up/down l/r keys
  public stickKeyY = 0;
  public stickX = 0; // analog input to game
  public stickY = 0;
  public shiftKey = false;
  public mouseAccumX = 0;
  public mouseAccumY = 0;
  public mouseX = 0;
  public mouseY = 0;
  public mobileInput: MobileSticks | undefined;
  public sceneIsInit = false;
  public accumFrameActions: Action[] = [];
  public frameActions: Action[] = [];
  public forAction(action: Action, cb: () => void) {
    this.frameActions.filter((a) => a == action).forEach(cb);
  }
  constructor() {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) {
      this.mobileInput = new MobileSticks(this);
    }
  }
}

export class BattleRing implements Component {
  cyl?: Mesh;
  mat?: ShaderMaterial;
  startTime = 0;
  // closest others, deformations, etc
  constructor() {}
}

export class PlayerDebug implements Component {
  debugNavHit?: ShowSegment;
  debugNavRay?: ShowSegment;
  debugCurNavFace?: ShowPoint[];
  constructor() {}
}

export enum LoadState {
  NONE,
  STARTED_GET,
  LOADED,
}
export class BjsModel implements Component {
  // load a BJS model that can be moved around
  public root?: TransformNode;
  public loadState = LoadState.NONE;
  public container?: AssetContainer;
  constructor() {}
  dispose() {
    this.root?.dispose();
  }
}
