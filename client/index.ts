import { Engine } from "@trixt0r/ecs";
import { Mesh, Scene } from "babylonjs";
import * as Colyseus from "colyseus.js";
import { InitJump } from "../shared/Components";
import { dumpWorld } from "../shared/EcsOps";
import { InitSystems as InitWorld } from "../shared/InitSystems";
import createLogger from "../shared/logsetup";
import { TrackServerEntities } from "../shared/SyncColyseusToEcs";
import { ClientWorldRunOptions } from "../shared/types";
import { WorldState } from "../shared/WorldRoom";
import { setupScene, StatusLine } from "./BrowserWindow";
import { LocalCam, LocallyDriven } from "./Components";
import * as Env from "./Env";
import { getOrCreateNick } from "./nick";
import { Actions, UserInput } from "./UserInput";

const log = createLogger("WorldRoom");

class Game {
  client: Colyseus.Client;
  worldRoom?: Colyseus.Room<WorldState>;
  constructor(private status: StatusLine, private world: Engine, private scene: Scene, private nick: string) {
    this.status.setPlayer("...");
    this.status.setConnection("connecting...");
    this.client = new Colyseus.Client("wss://megasecond.club/");
  }
  async joinWorld(nav: Mesh) {
    const worldRoom = await this.client.joinOrCreate<WorldState>("world", {});
    this.worldRoom = worldRoom;
    (window as any).room = worldRoom;
    this.status.setConnection("connected...");
    worldRoom.send("setNick", this.nick);

    return new Promise<void>((resolve, _reject) => {
      worldRoom.onStateChange.once((state) => {
        const tse = new TrackServerEntities(this.world);
        tse.trackEntities(state, this.worldRoom!.sessionId, this.worldRoom!);
        resolve();
      });
    });
  }

  // global component of status line? system that updates num players and your nick
  //     this.status.setConnection(`connected (${Array.from(this.worldRoom!.state.players.keys()).length} players)`);
}

function initWorldDebug(world: Engine) {
  const debug = document.querySelector("#debug")!;
  const updateDebug = () => {
    debug.innerHTML = "";
    const write = (line: string) => {
      const div = document.createElement("div");
      div.innerText = line;
      debug.appendChild(div);
    };
    dumpWorld(world, write);
  };
  setInterval(updateDebug, 2000);
}

async function go() {
  const nick = getOrCreateNick();
  const world = InitWorld(/*isClient=*/ true);
  (window as any).world = world;
  initWorldDebug(world);

  const status = new StatusLine();
  const scene = setupScene("renderCanvas");

  const game = new Game(status, world, scene, nick);

  const env = new Env.World(scene, Env.GraphicsLevel.texture);
  const envDone1 = env.load();
  await envDone1;
  const envDone2 = env.reloadLayoutInstances();
  await envDone2;

  {
    const nav = scene.getMeshByName("navmesh") as Mesh;
    nav.updateFacetData();
    status.setPlayer(nick);
    await game.joinWorld(nav);
  }
  const userInput = new UserInput(scene, function onAction(name: Actions) {
    const me = world.entities.find((e) => e.components.get(LocallyDriven));
    if (!me) throw new Error("no LocallyDriven player");
    if (name == Actions.Jump) {
      me.components.add(new InitJump());
    } else if (name == Actions.ToggleNavmeshView) {
      Env.toggleNavmeshView(scene);
    } else if (name == Actions.ToggleBirdsEyeView) {
      me.components.get(LocalCam).toggleBirdsEyeView();
    } else if (name == Actions.ReloadEnv) {
      env.reloadLayoutInstances();
    }
  });

  const slowStep = false;

  const gameStep = (dt: number) => {
    world.run({
      dt,
      scene,
      userInput, // todo get this out of here
    } as ClientWorldRunOptions);

    userInput.step(dt);
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

go();
