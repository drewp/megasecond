import { ActionManager, ExecuteCodeAction, PickingInfo, PointerEventTypes, ActionEvent, Scene, VirtualJoystick } from "babylonjs";

export enum Actions {
  Jump,
  Activate,
  ToggleNavmeshView,
  ToggleBirdsEyeView,
  ReloadEnv,
}

class MobileSticks {
  walk: VirtualJoystick;
  look: VirtualJoystick;
  constructor(private out: UserInput) {
    this.walk = new VirtualJoystick(true);
    this.look = new VirtualJoystick(false);
  }
  step(dt: number) {
    if (this.walk.pressed) {
      this.out.stickX = this.walk.deltaPosition.x * 3;
      this.out.stickY = -this.walk.deltaPosition.y * 3;
    } else {
      this.out.stickX = this.out.stickY = 0;
    }
    if (this.look.pressed) {
      this.out.mouseAccumX = this.look.deltaPosition.x * 4;
      this.out.mouseAccumY = -this.look.deltaPosition.y * 4;
    }
  }
}

export class UserInput {
  private stickKeyX = 0; // exact state of up/down l/r keys
  private stickKeyY = 0;
  public stickX = 0; // analog input to game
  public stickY = 0;
  public shiftKey = false;
  private stickKeyPressFunc: { [keyName: string]: () => void };
  private stickKeyReleaseFunc: { [keyName: string]: () => void };
  public mouseAccumX = 0;
  public mouseAccumY = 0;
  public mouseX = 0;
  public mouseY = 0;
  private mobileInput: MobileSticks | undefined;

  constructor(private scene: Scene, private onAction: (name: Actions) => void) {
    (window as any).ui = this;
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
    scene.actionManager = new ActionManager(scene);
    scene.actionManager.registerAction(new ExecuteCodeAction({ trigger: ActionManager.OnKeyDownTrigger }, this.onKeyDown.bind(this)));
    scene.actionManager.registerAction(new ExecuteCodeAction({ trigger: ActionManager.OnKeyUpTrigger }, this.onKeyUp.bind(this)));
    scene.onPointerMove = this.onMove.bind(this);

    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) {
      this.mobileInput = new MobileSticks(this);
    }
  }
  step(dt: number) {
    if (this.mobileInput) {
      this.mobileInput.step(dt);
    }
    const runMult = this.shiftKey ? 8 : 1;
    this.stickX += (this.stickKeyX * runMult - this.stickX) * 6 * dt;
    this.stickY += (this.stickKeyY * runMult - this.stickY) * 6 * dt;

    this.mouseX = dt == 0 ? 0 : this.mouseAccumX / dt;
    this.mouseY = dt == 0 ? 0 : this.mouseAccumY / dt;
    this.mouseAccumX = this.mouseAccumY = 0;
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
    switch (ev.sourceEvent.key) {
      case " ":
        this.onAction(Actions.Jump);
        break;
      case "e":
        this.onAction(Actions.Activate);
        break;
      case "n":
        this.onAction(Actions.ToggleNavmeshView);
        break;
      case "b":
        this.onAction(Actions.ToggleBirdsEyeView);
        break;
      case "r":
        this.onAction(Actions.ReloadEnv);
        break;
    }
  }
  onKeyUp(ev: ActionEvent) {
    const setFromKey = this.stickKeyReleaseFunc[(ev.sourceEvent.key as string).toLowerCase()];
    if (setFromKey) {
      setFromKey();
    }
    this.shiftKey = ev.sourceEvent.shiftKey as boolean;
  }
}
