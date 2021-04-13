import { Component } from "@trixt0r/ecs";
import { AssetContainer, DynamicTexture, FollowCamera, ShaderMaterial, StandardMaterial, TransformNode, Vector2, Vector3 } from "babylonjs";
import { Mesh } from "babylonjs/Meshes/mesh";
import * as Colyseus from "colyseus.js";
import { makeObservable, observable } from "mobx";
import { ShowPoint, ShowSegment } from "../client/Debug";
import createLogger from "../shared/logsetup";
import { WorldState } from "../shared/SyncTypes";
import { MobileSticks } from "./system/UserInput";
import { Instance } from "./Env";

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
  public stickKey = Vector2.Zero(); // exact state of up/down l/r keys
  public stick = Vector2.Zero(); // analog input to game
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
  public instance?: Instance;
  constructor() {}
  dispose() {
    this.root?.dispose();
  }
}
export class C_Nametag implements Component {
  public plane?: Mesh;
  public tx?: DynamicTexture;
  public mat?: StandardMaterial;
  constructor() {}
}

export class C_UsesNav implements Component {
  public currentNavFaceId = 0;
  public grounded = false;
  public nav?: string; //
  constructor() {}
}

export class C_Transform implements Component {
  // this is the prediction of S_Transform
  public pos = Vector3.Zero();
  public facing = Vector3.Forward();
  constructor() {
    if (false) {
    } else {
      // dont mess up Vector3 for setting
    }
  }
  get heading(): number {
    return (360 / (2 * Math.PI)) * Math.atan2(-this.facing.z, this.facing.x) + 270;
  }
}

export class C_Sim implements Component {
  public vel = Vector3.Zero();
  constructor() {}
}

export class C_PlayerPose implements Component {
  public waving = false;
  constructor() {
    makeObservable(this, { waving: observable });
  }
}
