import { Engine } from "@trixt0r/ecs";
import { Scene } from "babylonjs/scene";
import * as Colyseus from "colyseus.js";
import { EventEmitter } from "golden-layout";
import { InitSystems as InitWorld } from "../shared/InitSystems";
import createLogger from "../shared/logsetup";
import { TrackServerEntities } from "./SyncColyseusToEcs";
import { ClientWorldRunOptions } from "../shared/types";
import { WorldState } from "../shared/SyncTypes";
import { initPanesLayout, setupScene, StatusLine } from "./BrowserWindow";
import * as Env from "./Env";
import { getOrCreateNick } from "./nick";

const log = createLogger("WorldRoom");

class Game {
  client: Colyseus.Client;
  worldRoom?: Colyseus.Room<WorldState>;
  constructor(private status: StatusLine, private world: Engine, private nick: string) {
    this.status.setConnection("connecting...");
    this.client = new Colyseus.Client("wss://megasecond.club/server/");
  }
  async joinWorld() {
    const worldRoom = await this.client.joinOrCreate<WorldState>("world", {});
    this.worldRoom = worldRoom;
    (window as any).room = worldRoom;
    this.status.setConnection("connected...");
    worldRoom.send("setNick", this.nick);

    return new Promise<void>((resolve, _reject) => {
      worldRoom.onStateChange.once((state) => {
        const tse = new TrackServerEntities(this.world);
        tse.trackEntities(state);
        resolve();
      });
    });
  }

  // global component of status line? system that updates num players and your nick
  //     this.status.setConnection(`connected (${Array.from(this.worldRoom!.state.players.keys()).length} players)`);
}

function queryParamGraphicsLevel() {
  const qparams = new URL(window.location.href).searchParams;
  let graphicsLevel = Env.GraphicsLevel.texture;
  if (qparams.has("gl")) {
    if (qparams.get("gl") == "wire") graphicsLevel = Env.GraphicsLevel.wire;
    if (qparams.get("gl") == "grid") graphicsLevel = Env.GraphicsLevel.grid;
    if (qparams.get("gl") == "texture") graphicsLevel = Env.GraphicsLevel.texture;
  }
  return graphicsLevel;
}

function runGameLoop(world: Engine, scene: Scene, room: Colyseus.Room<WorldState>, world3d: Env.World3d, slowStep: boolean) {
  const gameStep = (dt: number) => {
    world.run({
      dt,
      scene,
      room,
      world3d
    } as ClientWorldRunOptions);
  };
  if (slowStep) {
    setInterval(() => gameStep(0.1), 100);
  }
  scene.getEngine().runRenderLoop(() => {
    if (!slowStep) {
      const dt = scene.getEngine().getDeltaTime() / 1000.0;
      gameStep(dt);
    }
    if (scene.activeCamera) {
      scene.render();
    }
  });
}

async function go() {
  const nick = getOrCreateNick();
  const world = InitWorld(/*isClient=*/ true);
  (window as any).world = world;

  const gamePaneResizeEvents = new EventEmitter();

  initPanesLayout(document.body, world, gamePaneResizeEvents);

  const status = new StatusLine();
  status.setPlayer(nick);
  const scene = setupScene("renderCanvas", gamePaneResizeEvents);

  const game = new Game(status, world, nick);

  const world3d = new Env.World3d(scene, queryParamGraphicsLevel());
  const envDone1 = world3d.loadNavmesh();
  const envDone2 = world3d.reloadLayoutInstances();
  const joinDone = game.joinWorld();
  await envDone1;
  await envDone2;
  await joinDone;

  runGameLoop(world, scene, game.worldRoom!, world3d, /*slowStep=*/ false);
}

go();
