import { Engine } from "@trixt0r/ecs";
import { BjsLoadUnload } from "../client/system/BjsLoadUnload";
import { CorrectLocalSimulation } from "../client/system/CorrectLocalSimulation";
import { CreateNametag } from "../client/system/CreateNametag";
import { LocalCamFollow } from "../client/system/LocalCamFollow";
import { LocalMovement } from "../client/system/LocalMovement";
import { PlayerJump } from "../client/system/PlayerJump";
import { RepaintNametag } from "../client/system/RepaintNametag";
import { SendUntrustedLocalPos } from "../client/system/SendUntrustedLocalPos";
import { ServerReceive } from "../client/system/ServerReceive";
import { SimpleMove } from "../client/system/SimpleMove";
import { TransformMesh } from "../client/system/TransformMesh";
import createLogger from "./logsetup";
import { Pickup } from "./system/Pickup";
import { TouchItem } from "./system/TouchItem";

const log = createLogger("PlayerView");

export function InitSystems(isClient = false): Engine {
  const world = new Engine();

  world.systems.add(new TouchItem(0));
  world.systems.add(new Pickup(0));

  if (isClient) {
    world.systems.add(new PlayerJump(0)); // todo server

    world.systems.add(new BjsLoadUnload(0));
    world.systems.add(new TransformMesh(0));
    world.systems.add(new LocalCamFollow(0));
    world.systems.add(new CreateNametag(1));
    world.systems.add(new RepaintNametag(1));
    world.systems.add(new SimpleMove(0));
    world.systems.add(new LocalMovement(0));
    world.systems.add(new ServerReceive(0));
    world.systems.add(new CorrectLocalSimulation(1));
    world.systems.add(new SendUntrustedLocalPos(2));
  }
  world.systems.forEach((s) => s.addListener({ onError: (e: Error) => log.error(e) }));

  return world;
}
