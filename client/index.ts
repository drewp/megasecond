import { Component, Engine } from "@trixt0r/ecs";
import { Mesh, Scene, Vector3 } from "babylonjs";
import * as Colyseus from "colyseus.js";
import { AimAt, BjsModel, InitJump, Model, Touchable, Toucher, Transform, Twirl, UsesNav } from "../shared/Components";
import { dump } from "../shared/EcsOps";
import { IdEntity } from "../shared/IdEntity";
import { InitSystems as InitWorld } from "../shared/InitSystems";
import createLogger from "../shared/logsetup";
import { TrackServerEntities } from "../shared/TrackServerEntities";
import { ClientWorldRunOptions, playerSessionId } from "../shared/types";
import { Player as NetPlayer, PropV3, ServerComponent, ServerEntity, WorldState } from "../shared/WorldRoom";
import { setupScene, StatusLine } from "./BrowserWindow";
import { LocalCam, LocallyDriven, Nametag, PlayerDebug, ServerRepresented } from "./Components";
import * as Env from "./Env";
import { getOrCreateNick } from "./nick";
import { Actions, UserInput } from "./UserInput";

const log = createLogger("WorldRoom");

log.info("hello log");

type PlayerMap = Map<playerSessionId, NetPlayer>;

type PlayerMoveMsg = { x: number; y: number; z: number; facingX: number; facingY: number; facingZ: number };

// remove when server can do this work:
function CreatePlayer() {
  // X=left, Y=up, Z=fwd
  const p = new IdEntity();

  // const sunCaster = (window as any).gen as ShadowGenerator; // todo
  // if (sunCaster) {
  //   sunCaster.addShadowCaster(body);
  // }
  p.components.add(new Model("model/player/player"));
  p.components.add(new BjsModel());
  p.components.add(new AimAt("player_aim"));
  p.components.add(new Toucher(/*posOffset=*/ new Vector3(0, 1.2, 0), /*radius=*/ 0.3, new Set()));

  return p;
}

class Game {
  client: Colyseus.Client;
  worldRoom?: Colyseus.Room<WorldState>;
  me?: IdEntity;
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
        this.trackPlayers(state, nav);
        const tse = new TrackServerEntities(this.world);
        tse.trackEntities(state);
        resolve();
      });
    });
  }

  private trackPlayers(state: WorldState, nav: Mesh) {
    this.status.setConnection(`connected (${Array.from(state.players.keys()).length} players)`);
    const playerRows = Array.from(state.players.entries());
    playerRows.forEach((row: [string, NetPlayer]) => {
      this.addPlayerEntity(row[1], row[0] == this.worldRoom!.sessionId, nav);
    });

    this.worldRoom!.state.players.onAdd = (player: NetPlayer, sessionId: string) => {
      log.info(`net onAdd ${sessionId} ${this.worldRoom!.sessionId}`);
      this.addPlayerEntity(player, /*isMe=*/ sessionId == this.worldRoom!.sessionId, nav);
      this.status.setConnection(`connected (${Array.from(this.worldRoom!.state.players.keys()).length} players)`);
    };

    this.worldRoom!.state.players.onRemove = (player: NetPlayer, _sessionId: string) => {
      console.log("player rm", player.sessionId);
      this.removePlayerEntity(player);
      this.status.setConnection(`connected (${Array.from(this.worldRoom!.state.players.keys()).length} players)`);
    };

    const others: PlayerMap = new Map();
    state.players.forEach((pl, id) => {
      if (id != this.worldRoom!.sessionId) {
        others.set(id, pl);
      }
    });
  }

  addPlayerEntity(netPlayer: NetPlayer, isMe: boolean, nav: Mesh) {
    log.info("addPlayer", netPlayer.sessionId);

    const p = CreatePlayer();

    p.components.add(new ServerRepresented(this.worldRoom!, netPlayer));

    p.components.add(new Transform(Vector3.Zero(), Vector3.Zero(), Vector3.Forward()));
    p.components.add(new PlayerDebug(this.scene));
    p.components.add(new Nametag(/*offsetY=*/ 0.2, netPlayer));

    if (isMe) {
      this.me = p;
      p.components.add(new LocallyDriven());
      p.components.add(new UsesNav(nav));
      p.components.add(new LocalCam(this.scene));
      p.components.get(Transform).pos = new Vector3(1, 0, -2);
      p.components.get(Transform).facing = new Vector3(0, 0, 1);
    }
    this.world.entities.add(p);
  }

  removePlayerEntity(netPlayer: NetPlayer) {
    const e = this.world.entities.find((e) => e.components.get(ServerRepresented)?.netPlayer == netPlayer);
    if (e) {
      //e.components.get(BjsMesh).dispose(); // haven't found how to listen for this yet
      const nt = e.components.get(Nametag);
      // nt.plane.dispose();
      // nt.tx.dispose();
      this.world.entities.remove(e);
    }
  }
}

async function go() {
  const nick = getOrCreateNick();
  const world = InitWorld(/*isClient=*/ true);

  (window as any).ecsDump = () => {
    dump(world);
    return world;
  };

  const status = new StatusLine();
  const scene = setupScene("renderCanvas");
  const game = new Game(status, world, scene, nick);

  const env = new Env.World(scene, Env.GraphicsLevel.texture);
  await env.load();
  await env.reloadLayoutInstances();

  {
    const nav = scene.getMeshByName("navmesh") as Mesh;
    nav.updateFacetData();
    status.setPlayer(nick);
    await game.joinWorld(nav);
    // game.me is not guaranteed yet (or maybe if it's missing then the server is borked)
  }

  const userInput = new UserInput(scene, function onAction(name: Actions) {
    if (name == Actions.Jump) {
      game.me!.components.add(new InitJump());
    } else if (name == Actions.ToggleNavmeshView) {
      Env.toggleNavmeshView(scene);
    } else if (name == Actions.ToggleBirdsEyeView) {
      game.me!.components.get(LocalCam).toggleBirdsEyeView();
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
    scene.render();
  });
}

go();
