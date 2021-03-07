import { AbstractEntitySystem, Component, Engine } from "@trixt0r/ecs";
import { Mesh, Scene, Vector3 } from "babylonjs";
import * as Colyseus from "colyseus.js";
import createLogger from "logging";
import { Player as NetPlayer, WorldState } from "../shared/WorldRoom";
import { setupScene, StatusLine } from "./BrowserWindow";
import * as Env from "./Env";
import { LocalCam, LocalCamFollow } from "./FollowCam";
import { IdEntity } from "./IdEntity";
import { InitJump, PlayerJump } from "./jump";
import { LocalMovement, SimpleMove, Transform, Twirl } from "./Motion";
import { CreateNametag, InitNametag, Nametag, RepaintNametag } from "./Nametag";
import { getOrCreateNick } from "./nick";
import { BjsMesh, CreateCard, CreatePlayer, TransformMesh } from "./PlayerView";
import { playerSessionId, WorldRunOptions } from "./types";
import { Actions, UserInput } from "./UserInput";
import { PlayerDebug, UsesNav } from "./walkAlongNavMesh";

const log = createLogger("WorldRoom");

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

    this.status.setConnection("connected...");
    worldRoom.send("setNick", this.nick);

    return new Promise<void>((resolve, _reject) => {
      worldRoom.onStateChange.once((state) => {
        this.trackPlayers(state, nav);
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

    const p = CreatePlayer(this.scene, netPlayer.sessionId);

    p.components.add(new ServerRepresented(this.worldRoom!, netPlayer));

    p.components.add(new Transform(Vector3.Zero(), Vector3.Zero(), Vector3.Forward()));
    p.components.add(new PlayerDebug(this.scene));
    p.components.add(new InitNametag(this.scene, /*offsetY=*/ 20, netPlayer));

    if (isMe) {
      this.me = p;
      p.components.add(new LocallyDriven());
      p.components.add(new UsesNav(nav));
      p.components.add(new LocalCam(this.scene));
      p.components.get(Transform).pos = new Vector3(-2.3, 0, -2);
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
}

class ServerRepresented implements Component {
  public lastSentTime = 0; // ms
  public lastSent: any;
  public receivedPos = Vector3.Zero();
  public receivedFacing = Vector3.Forward();
  constructor(
    public worldRoom: Colyseus.Room<WorldState>,
    public netPlayer: NetPlayer // with latest server state
  ) {}
}

class ServerReceive extends AbstractEntitySystem<IdEntity> {
  processEntity(entity: IdEntity, _index: number, _entities: unknown, _options: WorldRunOptions) {
    const sr = entity.components.get(ServerRepresented);
    const np = sr.netPlayer;
    // this is rewriting a lot- we could use a watcher on the colyseus half
    sr.receivedPos = new Vector3(np.x, np.y, np.z);
    sr.receivedFacing = new Vector3(np.facingX, np.facingY, np.facingZ);
  }
}

class CorrectLocalSimulation extends AbstractEntitySystem<IdEntity> {
  processEntity(entity: IdEntity, _index: number, _entities: unknown, _options: WorldRunOptions) {
    if (entity.components.get(LocallyDriven)) {
      // it's me; server is not authoritative yet, and we don't have correction code
      return;
    }
    const pt = entity.components.get(Transform);
    const sr = entity.components.get(ServerRepresented);
    pt.pos = sr.receivedPos;
    pt.facing = sr.receivedFacing;
  }
}

// - to replace with input commands
class SendUntrustedLocalPos extends AbstractEntitySystem<IdEntity> {
  processEntity(entity: IdEntity, _index: number, _entities: unknown, _options: WorldRunOptions) {
    const pt = entity.components.get(Transform);
    const sr = entity.components.get(ServerRepresented);

    const pos = pt.pos;
    const facing = pt.facing;
    const now = Date.now();
    const minSendPeriodMs = 100;
    if (sr.lastSentTime > now - minSendPeriodMs) return;

    if (
      sr.lastSent !== undefined && //
      sr.lastSent.x == pos.x &&
      sr.lastSent.y == pos.y &&
      sr.lastSent.z == pos.z &&
      sr.lastSent.facingX == facing.x &&
      sr.lastSent.facingY == facing.y &&
      sr.lastSent.facingZ == facing.z
    ) {
      return;
    }
    sr.lastSent = { x: pos.x, y: pos.y, z: pos.z, facingX: facing.x, facingY: facing.y, facingZ: facing.z };
    sr.worldRoom.send("playerMove", sr.lastSent);
    sr.lastSentTime = now;
  }
}

class LocallyDriven implements Component {
  // temporary tag for the local player that recvs input
  constructor() {}
}

function ecsInit(): Engine {
  const world = new Engine();
  world.systems.add(new SimpleMove(/*priority=*/ 0, /*all=*/ [BjsMesh, Transform, Twirl]));
  world.systems.add(new TransformMesh(0, [BjsMesh, Transform]));
  world.systems.add(new LocalCamFollow(0, [BjsMesh, Transform, LocalCam]));
  world.systems.add(new PlayerJump(0, [Transform, InitJump]));
  world.systems.add(new CreateNametag(1, [BjsMesh, InitNametag]));
  world.systems.add(new RepaintNametag(1, [Nametag]));
  world.systems.add(new LocalMovement(0, [Transform, PlayerDebug, LocallyDriven, UsesNav]));
  world.systems.add(new ServerReceive(0, [ServerRepresented, Transform]));
  world.systems.add(new CorrectLocalSimulation(1, [ServerRepresented, Transform]));
  world.systems.add(new SendUntrustedLocalPos(2, [ServerRepresented, Transform, LocallyDriven]));

  world.systems.forEach((s) => s.addListener({ onError: (e: Error) => log.error(e) }));

  return world;
}

async function go() {
  const nick = getOrCreateNick();
  const world = ecsInit();
  const status = new StatusLine();
  const scene = setupScene("renderCanvas");
  const game = new Game(status, world, scene, nick);

  const env = new Env.World(scene);
  await env.load(Env.GraphicsLevel.texture);
  scene.switchActiveCamera(scene.cameras[0]); // in case player cam  isn't ready
  {
    const nav = scene.getMeshByName("navmesh") as Mesh;
    nav.updateFacetData();
    status.setPlayer(nick);
    await game.joinWorld(nav);
    // game.me is not guaranteed yet (or maybe if it's missing then the server is borked)
  }

  const card = await env.loadObj("card");
  world.entities.add(CreateCard(scene, card));

  const userInput = new UserInput(scene, function onAction(name: Actions) {
    if (name == Actions.Jump) {
      game.me!.components.add(new InitJump());
    } else if (name == Actions.ToggleNavmeshView) {
      Env.toggleNavmeshView(scene);
    } else if (name == Actions.ToggleBirdsEyeView) {
      game.me!.components.get(LocalCam).toggleBirdsEyeView();
    }
  });

  const slowStep = false;

  const gameStep = (dt: number) => {
    world.run({
      dt,
      userInput, // todo get this out of here
    } as WorldRunOptions);

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
