import { AbstractEntitySystem } from "@trixt0r/ecs";
import { ActionManager, ExecuteCodeAction, Scene, VirtualJoystick } from "babylonjs";
import { PlayerPose } from "../../shared/Components";
import { removeComponentsOfType } from "../../shared/EcsOps";
import { IdEntity } from "../../shared/IdEntity";
import createLogger from "../../shared/logsetup";
import { ClientWorldRunOptions } from "../../shared/types";
import { Action, BattleRing, LocallyDriven } from "../Components";
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

export class UserInput extends AbstractEntitySystem<IdEntity> {
  constructor(priority: number) {
    super(priority, [LocallyDriven, PlayerPose]);
  }
  processEntity(entity: IdEntity, _index: number, _entities: unknown, options: ClientWorldRunOptions) {
    const ld = entity.components.get(LocallyDriven);
    const pp = entity.components.get(PlayerPose);
    if (!ld.sceneIsInit) {
      this.connectToScene(options.scene, ld);
      ld.sceneIsInit = true;
    }
    const dt = options.dt;

    if (ld.mobileInput) {
      ld.mobileInput.step(dt);
    }
    const runMult = ld.shiftKey ? 8 : 1;
    ld.stickX += (ld.stickKeyX * runMult - ld.stickX) * 6 * dt;
    ld.stickY += (ld.stickKeyY * runMult - ld.stickY) * 6 * dt;

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
      entity.components.add(new BattleRing()); // todo- move out of UserInput
    });
    ld.forAction(Action.ActivateRelease, () => {
      if (!pp.waving) return;
      pp.waving = false;
      const br = entity.components.get(BattleRing);
      // entity.components.remove(br);
      // removeComponentsOfType(entity, BattleRing);
    });
  }
  connectToScene(scene: Scene, ld: LocallyDriven) {
    // this will sneak values into our Component outside of processEntity
    scene.actionManager = new ActionManager(scene);
    scene.actionManager.registerAction(new ExecuteCodeAction({ trigger: ActionManager.OnKeyDownTrigger }, ld.onKeyDown.bind(ld)));
    scene.actionManager.registerAction(new ExecuteCodeAction({ trigger: ActionManager.OnKeyUpTrigger }, ld.onKeyUp.bind(ld)));
    scene.onPointerMove = ld.onMove.bind(ld);
  }
}
