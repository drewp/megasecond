import { Component } from "@trixt0r/ecs";
import { Engine } from "@trixt0r/ecs";
import { Mesh, Scene, Vector3 } from "babylonjs";
import * as Colyseus from "colyseus.js";
import { IdEntity } from "../shared/IdEntity";
import { InitSystems as InitWorld } from "../shared/InitSystems";
import createLogger from "../shared/logsetup";
import { Touchable } from "../shared/TouchItem";
import { Transform } from "../shared/Transform";
import { ClientWorldRunOptions, playerSessionId } from "../shared/types";
import { Player as NetPlayer, PropV3, ServerComponent, ServerEntity, WorldState } from "../shared/WorldRoom";
import { setupScene, StatusLine } from "./BrowserWindow";
import { LocallyDriven, ServerRepresented } from "./ClientNet";
import * as Env from "./Env";
import { LocalCam } from "./FollowCam";
import { InitJump } from "./jump";
import { Twirl } from "./Motion";
import { InitNametag, Nametag } from "./Nametag";
import { getOrCreateNick } from "./nick";
import { BjsMesh, CreatePlayer } from "./PlayerView";
import { Actions, UserInput } from "./UserInput";
import { PlayerDebug, UsesNav } from "./walkAlongNavMesh";

const log = createLogger("WorldRoom");

log.info("hello log");

type PlayerMap = Map<playerSessionId, NetPlayer>;

type PlayerMoveMsg = { x: number; y: number; z: number; facingX: number; facingY: number; facingZ: number };

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
        this.trackEntities(state);
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
    p.components.add(new InitNametag(/*offsetY=*/ 0.2, netPlayer));

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
      e.components.get(BjsMesh).dispose(); // haven't found how to listen for this yet
      const nt = e.components.get(Nametag);
      nt.plane.dispose();
      nt.tx.dispose();
      this.world.entities.remove(e);
    }
  }

  private trackEntities(state: WorldState) {
    // make world entities for the ones in state
    state.entities.forEach((se: ServerEntity) => {
      this.addServerEntity(se);
    });
    state.entities.onAdd = (se: ServerEntity) => this.addServerEntity(se);
  }

  private addServerEntity(se: ServerEntity) {
    const ent = new IdEntity();
    this.world.entities.add(ent);

    function vector3FromProp(p: PropV3): Vector3 {
      return new Vector3(p.x, p.y, p.z);
    }

    function addComp(sc: ServerComponent, compName: string) {
      let lc: Component;
      if (compName == "Touchable") {
        lc = new Touchable();
      } else if (compName == "Twirl") {
        lc = new Twirl(sc.propFloat32.get("degPerSec"));
      } else if (compName == "Transform") {
        lc = new Transform(
          vector3FromProp(
            //
            sc.propV3.get("pos")!
          ),
          vector3FromProp(sc.propV3.get("vel")!),
          vector3FromProp(sc.propV3.get("facing")!)
        ); //
      } else if (compName == "BjsMesh") {
        lc = new BjsMesh(sc.propString.get("objName")!);
      } else {
        throw new Error(`server sent unknown ${compName} component`);
      }
      ent.components.add(lc);
    }
    se.components.forEach(addComp);
    se.components.onAdd = addComp;
  }
}

async function go() {
  const nick = getOrCreateNick();
  const world = InitWorld(/*isClient=*/ true);

  (window as any).ecsDump = () => {
    world.entities.forEach((e) => {
      log.info("entity", e.id);
      e.components.sort((a, b) => (a.constructor.name < b.constructor.name ? -1 : 1));
      e.components.forEach((comp) => {
        log.info("  component", comp.constructor.name);
        for (let prop in comp) {
          const v = comp[prop].toString();
          if (v.match(/\[object/)) {
            log.info(`    ${prop}`, comp[prop]);
          } else {
            log.info(`    ${prop} ${v}`);
          }
        }
      });
    });
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

  const card = await env.loadObj("card");
  //on new entity with Model, associate card clone

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
