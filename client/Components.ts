import { Component } from "@trixt0r/ecs";
import { ActionEvent, FollowCamera, PickingInfo, PointerEventTypes, Vector3 } from "babylonjs";
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
  private stickKeyPressFunc: { [keyName: string]: () => void };
  private stickKeyReleaseFunc: { [keyName: string]: () => void };
  public sceneIsInit = false;
  public accumFrameActions: Action[] = [];
  public frameActions: Action[] = [];
  public forAction(action: Action, cb: () => void) {
    this.frameActions.filter((a) => a == action).forEach(cb);
  }
  constructor() {
    this.stickKeyPressFunc = {
      arrowup: () => (this.stickKeyY = -1),
      w: () => (this.stickKeyY = -1),
      arrowdown: () => (this.stickKeyY = 1),
      s: () => (this.stickKeyY = 1),
      arrowleft: () => (this.stickKeyX = -1),
      a: () => (this.stickKeyX = -1),
      arrowright: () => (this.stickKeyX = 1),
      d: () => (this.stickKeyX = 1),
    };
    this.stickKeyReleaseFunc = {
      arrowup: () => (this.stickKeyY = 0),
      w: () => (this.stickKeyY = 0),
      arrowdown: () => (this.stickKeyY = 0),
      s: () => (this.stickKeyY = 0),
      arrowleft: () => (this.stickKeyX = 0),
      a: () => (this.stickKeyX = 0),
      arrowright: () => (this.stickKeyX = 0),
      d: () => (this.stickKeyX = 0),
    };

    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) {
      this.mobileInput = new MobileSticks(this);
    }
  }

  onAction(a: Action) {
    this.accumFrameActions.push(a);
  }

  onMove(ev: PointerEvent, pickInfo: PickingInfo, type: PointerEventTypes) {
    if (!document.pointerLockElement) {
      return;
    }
    this.mouseAccumX += ev.movementX;
    this.mouseAccumY += ev.movementY;
  }

  onKeyDown(ev: ActionEvent) {
    const setFromKey = this.stickKeyPressFunc[(ev.sourceEvent.key as string).toLowerCase()];
    if (setFromKey) {
      setFromKey();
    }
    this.shiftKey = ev.sourceEvent.shiftKey as boolean;
    const keyAction: { [key: string]: Action } = {
      " ": Action.Jump,
      e: Action.Activate,
      n: Action.ToggleNavmeshView,
      b: Action.ToggleBirdsEyeView,
      r: Action.ReloadEnv,
    };
    const action = keyAction[ev.sourceEvent.key];
    if (action !== undefined) {
      this.accumFrameActions.push(action);
    }
  }
  onKeyUp(ev: ActionEvent) {
    const setFromKey = this.stickKeyReleaseFunc[(ev.sourceEvent.key as string).toLowerCase()];
    if (setFromKey) {
      setFromKey();
    }
    this.shiftKey = ev.sourceEvent.shiftKey as boolean;
    const keyAction: { [key: string]: Action } = {
      e: Action.ActivateRelease,
    };
    const action = keyAction[ev.sourceEvent.key];
    if (action !== undefined) {
      this.accumFrameActions.push(action);
    }
  }
}

export class BattleRing implements Component {
  cyl?: Mesh
  mat?: ShaderMaterial
  startTime=0
  // closest others, deformations, etc
  constructor() {}
}

export class PlayerDebug implements Component {
  debugNavHit?: ShowSegment;
  debugNavRay?: ShowSegment;
  debugCurNavFace?: ShowPoint[];
  constructor() {}
}
