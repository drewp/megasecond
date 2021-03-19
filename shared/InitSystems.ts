import { Engine } from "@trixt0r/ecs";
import { CorrectLocalSimulation, SendUntrustedLocalPos, ServerReceive } from "../client/ClientNet";
import { LocalCamFollow } from "../client/FollowCam";
import { InitJump, PlayerJump } from "../client/jump";
import { LocalMovement, SimpleMove } from "../client/Motion";
import { CreateNametag, RepaintNametag } from "../client/Nametag";
import { BjsLoadUnload, TransformMesh } from "../client/PlayerView";
import createLogger from "./logsetup";
import { Pickup, TouchItem } from "./TouchItem";
import { Transform } from "./Transform";

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
