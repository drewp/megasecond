import { MapSchema } from "@colyseus/schema";
import { AbstractEntitySystem, Component, Engine } from "@trixt0r/ecs";
import { AbstractMesh, Color3, Mesh, MeshBuilder, Scene, StandardMaterial, Vector3 } from "babylonjs";
import * as Colyseus from "colyseus.js";
import createLogger from "logging";
import { Player as NetPlayer, WorldState } from "../shared/WorldRoom";
import { setupScene, StatusLine } from "./BrowserWindow";
import * as Env from "./Env";
import { LocalCam, LocalCamFollow } from "./FollowCam";
import { IdEntity } from "./IdEntity";
import { getOrCreateNick } from "./nick";
import { InitJump, LocalMovement, PlayerDebug, PlayerJump, PlayerTransform, UsesNav } from "./PlayerMotion";
import { CreateNametag, InitNametag, Nametag, PlayerView, PlayerViewMovement, RepaintNametag } from "./PlayerView";
import { WorldRunOptions } from "./types";
import { Actions, UserInput } from "./UserInput";

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

    return new Promise<{ me: IdEntity }>((resolve, _reject) => {
      worldRoom.onStateChange.once((state) => {
        this.trackPlayers(state, nav);
        if (!this.me) {
          throw new Error("player list didn't include me");
        }
        resolve({ me: this.me });
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
      log.info(`\nnet onAdd ${sessionId} ${this.worldRoom!.sessionId}`);
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
    const p = new IdEntity();
    this.world.entities.add(p);

    p.components.add(new ServerRepresented(this.worldRoom!, netPlayer));

    p.components.add(new PlayerTransform(this.scene, Vector3.Zero(), Vector3.Zero(), Vector3.Forward()));
    p.components.add(new PlayerDebug(this.scene));

    const pv = new PlayerView(this.scene, netPlayer.sessionId);
    p.components.add(pv);
    //p.components.addListener({onRemoved: pv.dispose.bind(pv)})// doesn't work

    p.components.add(new InitNametag(this.scene, 20, netPlayer.sessionId));

    const repaint = () => {
      const nt = p.components.get(Nametag);
      if (!nt) return;
      const painter = new RepaintNametag();

      painter.repaint(nt.tx, netPlayer.nick);
    };
    netPlayer.listen("nick", repaint);
    // at the moment, p still has InitNametag, not Nametag
    setTimeout(repaint, 1000);

    if (isMe) {
      this.me = p;
      p.components.add(new LocallyDriven());
      p.components.add(new UsesNav(nav));
      p.components.add(new LocalCam(this.scene));
      p.components.get(LocalCam).cam.lockedTarget = p.components.get(PlayerView).aimAt as AbstractMesh;
      p.components.get(PlayerTransform).pos = new Vector3(-2.3, 0, -2);
      p.components.get(PlayerTransform).facing = new Vector3(0, 0, 1);
    }
  }
  removePlayerEntity(netPlayer: NetPlayer) {
    const e = this.world.entities.find((e) => e.components.get(ServerRepresented)?.netPlayer == netPlayer);
    if (e) {
      e.components.get(PlayerView).dispose(); // haven't found how to listen for this yet
      const nt = e.components.get(Nametag);
      nt.plane.dispose();
      nt.tx.dispose();
      this.world.entities.remove(e);
    }
  }
}

type playerSessionId = string;
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
    const pt = entity.components.get(PlayerTransform);
    const sr = entity.components.get(ServerRepresented);
    pt.pos = sr.receivedPos;
    pt.facing = sr.receivedFacing;
  }
}

// - to replace with input commands
class SendUntrustedLocalPos extends AbstractEntitySystem<IdEntity> {
  processEntity(entity: IdEntity, _index: number, _entities: unknown, _options: WorldRunOptions) {
    const pt = entity.components.get(PlayerTransform);
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

class BjsMesh implements Component {
  constructor(public object: AbstractMesh) {}
}

class Twirl implements Component {
  constructor(public degPerSec = 1) {}
}

class SimpleMove extends AbstractEntitySystem<IdEntity> {
  processEntity(entity: IdEntity, _index: number, _entities: unknown, options: any) {
    const degPerSec = entity.components.get(Twirl).degPerSec;
    const object: AbstractMesh = entity.components.get(BjsMesh).object;

    object.rotation.y += degPerSec * options.dt;
  }
}

function ecsInit(): Engine {
  const world = new Engine();
  world.systems.add(new SimpleMove(/*priority=*/ 0, /*all=*/ [Twirl, BjsMesh]));
  world.systems.add(new PlayerViewMovement(0, [PlayerTransform, PlayerView]));
  world.systems.add(new LocalCamFollow(0, [PlayerTransform, LocalCam]));
  world.systems.add(new PlayerJump(0, [PlayerTransform, InitJump]));
  world.systems.add(new CreateNametag(1, [PlayerView, InitNametag]));
  world.systems.add(new RepaintNametag(1, [Nametag]));
  world.systems.add(new LocalMovement(0, [PlayerTransform, PlayerDebug, LocallyDriven, UsesNav]));
  world.systems.add(new ServerReceive(0, [ServerRepresented, PlayerTransform]));
  world.systems.add(new CorrectLocalSimulation(1, [ServerRepresented, PlayerTransform]));
  world.systems.add(new SendUntrustedLocalPos(2, [ServerRepresented, PlayerTransform, LocallyDriven]));

  world.systems.forEach((s) => s.addListener({ onError: (e: Error) => log.error(e) }));

  return world;
}

function ecsCard(world: Engine, scene: Scene) {
  var cardMesh = MeshBuilder.CreateBox("box", { size: 3 }, scene);
  var material = new StandardMaterial("material", scene);
  material.diffuseColor = new Color3(1, 1, 1);
  cardMesh.material = material;

  const card = new IdEntity();
  card.components.add(new Twirl(/*degPerSec=*/ 1));
  card.components.add(new BjsMesh(cardMesh));

  world.entities.add(card);
}

async function go() {
  const nick = getOrCreateNick();
  const world = ecsInit();
  const status = new StatusLine();
  const scene = setupScene("renderCanvas");
  const game = new Game(status, world, scene, nick);

  {
    const env = new Env.World(scene);
    await env.load(Env.GraphicsLevel.grid);
  }

  {
    const nav = scene.getMeshByName("navmesh") as Mesh;
    nav.updateFacetData();
    status.setPlayer(nick);
    await game.joinWorld(nav);
  }

  ecsCard(world, scene);

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
