import { Engine } from "@trixt0r/ecs";
import { BattleRingAnim, BattleRingLoad, BattleRingPresence } from "../client/system/BattleProps";
import { BjsLoadUnload } from "../client/system/BjsLoadUnload";
import { CorrectLocalSimulation } from "../client/system/CorrectLocalSimulation";
import { EnvConfig } from "../client/system/EnvConfig";
import { LocalCamFollow } from "../client/system/LocalCamFollow";
import { LocalCamLoadUnload } from "../client/system/LocalCamLoadUnload";
import { LocalMovement } from "../client/system/LocalMovement";
import { NametagLoadUnload } from "../client/system/NametagLoadUnload";
import { PlayerDebugLoadUnload } from "../client/system/PlayerDebugLoadUnload";
import { PlayerJump } from "../client/system/PlayerJump";
import { PlayerSetup } from "../client/system/PlayerSetup";
import { SendUntrustedLocalPos } from "../client/system/SendUntrustedLocalPos";
import { SimpleMove } from "../client/system/SimpleMove";
import { TransformMesh } from "../client/system/TransformMesh";
import { UserInput } from "../client/system/UserInput";
import createLogger from "./logsetup";
import { Pickup } from "./system/Pickup";
import { TouchItem } from "./system/TouchItem";

const log = createLogger("systems");

class GameEngine extends Engine {
  // todo: still need a place to share numPlayers and a simple way to know who
  // local player is (if LocallyDriven stops being enough). This subclass was an
  // idea for storing some well-known entities for those purposes.
  constructor() {
    super();
  }
}

export function InitSystems(isClient = false): Engine {
  const world = new Engine();

  if (!isClient) {
    world.systems.add(new TouchItem(0));
    world.systems.add(new Pickup(0));
  }

  if (isClient) {
    world.systems.add(new PlayerJump(0)); // todo server

    world.systems.add(new BjsLoadUnload(0));
    world.systems.add(new PlayerSetup(0));
    world.systems.add(new TransformMesh(0));
    world.systems.add(new LocalCamLoadUnload(0));
    world.systems.add(new PlayerDebugLoadUnload(0));
    world.systems.add(new LocalCamFollow(1));
    world.systems.add(new NametagLoadUnload(1));
    world.systems.add(new SimpleMove(0));
    world.systems.add(new LocalMovement(0));
    world.systems.add(new UserInput(0));
    world.systems.add(new CorrectLocalSimulation(1));
    world.systems.add(new SendUntrustedLocalPos(2));
    world.systems.add(new EnvConfig(2));
    world.systems.add(new BattleRingPresence(2));
    world.systems.add(new BattleRingLoad(2));
    world.systems.add(new BattleRingAnim(2));

  }
  world.systems.forEach((s) => s.addListener({ onError: (e: Error) => log.error(e) }));

  return world;
}
