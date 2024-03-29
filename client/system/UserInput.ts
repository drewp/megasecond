import { AbstractEntitySystem } from "@trixt0r/ecs";
import { ActionEvent, ActionManager, ExecuteCodeAction, IPointerEvent, PickingInfo, PointerEventTypes, Scene, Vector2, VirtualJoystick } from "babylonjs";
import { action, makeObservable } from "mobx";
import { IdEntity } from "../../shared/IdEntity";
import createLogger from "../../shared/logsetup";
import { ClientWorldRunOptions } from "../../shared/types";
import { Action, C_PlayerPose, LocallyDriven } from "../Components";

const log = createLogger("system");

export class MobileSticks {
  walk: VirtualJoystick;
  look: VirtualJoystick;
  constructor(private out: LocallyDriven) {
    this.walk = new VirtualJoystick(true);
    this.look = new VirtualJoystick(false);
  }
  step(dt: number) {
    if (this.walk.pressed) {
      this.out.stick = new Vector2(this.walk.deltaPosition.x * 3, -this.walk.deltaPosition.y * 3);
    } else {
      this.out.stick = Vector2.Zero();
    }
    if (this.look.pressed) {
      this.out.mouseAccumX = this.look.deltaPosition.x * 4;
      this.out.mouseAccumY = -this.look.deltaPosition.y * 4;
    }
  }
}

export class UserInput extends AbstractEntitySystem<IdEntity> {
  // collect inputs into LocallyDriven and PlayerPose (and maybe some debug components)
  constructor(priority: number) {
    super(priority, [LocallyDriven, C_PlayerPose]);
    makeObservable(this, { processEntity: action }); // todo- move to a system subclass and apply everywhere?
  }
  processEntity<U>(entity: IdEntity, index?: number | undefined, entities?: IdEntity[] | undefined, options?: U | undefined): void {
    this.processEntity2(entity, index, entities, options as unknown as ClientWorldRunOptions);
  }
  processEntity2(entity: IdEntity, index?: number | undefined, entities?: IdEntity[] | undefined, options?: ClientWorldRunOptions): void {
    if (!options) throw 'options';
    const ld = entity.components.get(LocallyDriven);
    const pp = entity.components.get(C_PlayerPose);
    if (!ld.sceneIsInit) {
      this.connectToScene(options.scene, ld);
      ld.sceneIsInit = true;
    }
    const dt = options.dt;

    if (ld.mobileInput) {
      ld.mobileInput.step(dt);
    }
    const runMult = ld.shiftKey ? 8 : 1;
    ld.stick.addInPlace(
      ld.stickKey
        .scale(runMult)
        .subtract(ld.stick)
        .scale(6 * dt)
    );
    if (ld.stick.length() < 0.0000001) {
      ld.stick.set(0, 0);
    }

    ld.mouseX = dt == 0 ? 0 : ld.mouseAccumX / dt;
    ld.mouseY = dt == 0 ? 0 : ld.mouseAccumY / dt;
    ld.mouseAccumX = ld.mouseAccumY = 0;

    ld.frameActions = Array.from(ld.accumFrameActions);
    ld.accumFrameActions = [];

    if (pp.waving) {
      // workaround for key repeat making repeated server msgs. Why am I even seeing key repeat?
      ld.frameActions = ld.frameActions.filter((a: Action) => a != Action.Activate);
    }
    ld.forAction(Action.Activate, () => {
      if (pp.waving) return;
      pp.waving = true;
    });
    ld.forAction(Action.ActivateRelease, () => {
      if (!pp.waving) return;
      pp.waving = false;
    });
  }

  connectToScene(scene: Scene, ld: LocallyDriven) {
    // this will sneak values into our Component outside of processEntity
    scene.actionManager = new ActionManager(scene);
    scene.actionManager.registerAction(new ExecuteCodeAction({ trigger: ActionManager.OnKeyDownTrigger }, this.onKeyDown.bind(this, ld)));
    scene.actionManager.registerAction(new ExecuteCodeAction({ trigger: ActionManager.OnKeyUpTrigger }, this.onKeyUp.bind(this, ld)));
    scene.onPointerMove = this.onMove.bind(this, ld);
  }

  // not called during processEntity
  onMove(ld: LocallyDriven, ev: IPointerEvent, pickInfo: PickingInfo, type: PointerEventTypes) {
    if (!document.pointerLockElement) {
      return;
    }
    ld.mouseAccumX += ev.movementX;
    ld.mouseAccumY += ev.movementY;
  }

  // not called during processEntity
  onKeyDown(ld: LocallyDriven, ev: ActionEvent) {
    const stickKeyPressFunc: { [keyName: string]: () => void } = {
      arrowup: () => (ld.stickKey.y = -1),
      w: () => (ld.stickKey.y = -1),
      arrowdown: () => (ld.stickKey.y = 1),
      s: () => (ld.stickKey.y = 1),
      arrowleft: () => (ld.stickKey.x = -1),
      a: () => (ld.stickKey.x = -1),
      arrowright: () => (ld.stickKey.x = 1),
      d: () => (ld.stickKey.x = 1),
    };
    const setFromKey = stickKeyPressFunc[(ev.sourceEvent.key as string).toLowerCase()];
    if (setFromKey) {
      setFromKey();
    }
    ld.shiftKey = ev.sourceEvent.shiftKey as boolean;
    const keyAction: { [key: string]: Action } = {
      " ": Action.Jump,
      e: Action.Activate,
      n: Action.ToggleNavmeshView,
      b: Action.ToggleBirdsEyeView,
      r: Action.ReloadEnv,
    };
    const action = keyAction[ev.sourceEvent.key];
    if (action !== undefined) {
      ld.accumFrameActions.push(action);
    }
  }

  // not called during processEntity
  onKeyUp(ld: LocallyDriven, ev: ActionEvent) {
    const stickKeyReleaseFunc: { [keyName: string]: () => void } = {
      arrowup: () => (ld.stickKey.y = 0),
      w: () => (ld.stickKey.y = 0),
      arrowdown: () => (ld.stickKey.y = 0),
      s: () => (ld.stickKey.y = 0),
      arrowleft: () => (ld.stickKey.x = 0),
      a: () => (ld.stickKey.x = 0),
      arrowright: () => (ld.stickKey.x = 0),
      d: () => (ld.stickKey.x = 0),
    };
    const setFromKey = stickKeyReleaseFunc[(ev.sourceEvent.key as string).toLowerCase()];
    if (setFromKey) {
      setFromKey();
    }
    ld.shiftKey = ev.sourceEvent.shiftKey as boolean;
    const keyAction: { [key: string]: Action } = {
      e: Action.ActivateRelease,
    };
    const action = keyAction[ev.sourceEvent.key];
    if (action !== undefined) {
      ld.accumFrameActions.push(action);
    }
  }
}
