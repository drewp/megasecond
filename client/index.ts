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
import { InitJump, PlayerDebug, PlayerJump, PlayerMovement, PlayerTransform } from "./PlayerMotion";
import { CreateNametag, InitNametag, Nametag, PlayerView, PlayerViewMovement, RepaintNametag } from "./PlayerView";
import { WorldRunOptions } from "./types";
import { Actions, UserInput } from "./UserInput";

const log = createLogger("WorldRoom");

type PlayerMap = Map<playerSessionId, NetPlayer>;

class Net {
  client: Colyseus.Client;
  world?: Colyseus.Room<WorldState>;
  worldState?: WorldState;
  private lastSent: { x: number; y: number; z: number; facingX: number; facingY: number; facingZ: number } | undefined;
  constructor(private status: StatusLine) {
    this.status.setPlayer("...");
    this.status.setConnection("connecting...");
    this.client = new Colyseus.Client("wss://megasecond.club/");
    // this.status.setPlayer(this.myDisplayName);
  }
  async joinWorld() {
    const world = await this.client.joinOrCreate<WorldState>("world", {});
    this.world = world;
    (window as any).world = world;

    this.status.setConnection("connected...");

    this.world.listen("/players/:id/nick", (cur: any, prev: any) => log.info("cb /players", cur, prev));

    return new Promise<{ me: NetPlayer; others: PlayerMap }>((resolve, reject) => {
      world.onStateChange.once((state) => {
        this.status.setConnection(`connected (${Array.from(state.players.keys()).length} players)`);
        log.info("players are", Array.from(state.players.entries()));
        const me = state.players.get(world.sessionId);
        if (!me) {
          reject("player list didn't include me");
          return;
        }
        const others: PlayerMap = new Map();
        state.players.forEach((pl, id) => {
          if (id != world.sessionId) {
            others.set(id, pl);
          }
        });
        resolve({ me, others });
      });
    });
  }
  players(): MapSchema<NetPlayer> {
    return this.world!.state.players;
  }
  uploadMe(me: IdEntity) {
    // todo System
    const pos = me.components.get(PlayerTransform).pos;
    const facing = me.components.get(PlayerTransform).facing;
    if (
      this.lastSent !== undefined && //
      this.lastSent.x == pos.x &&
      this.lastSent.y == pos.y &&
      this.lastSent.z == pos.z &&
      this.lastSent.facingX == facing.x &&
      this.lastSent.facingY == facing.y &&
      this.lastSent.facingZ == facing.z
    ) {
      return;
    }
    this.lastSent = { x: pos.x, y: pos.y, z: pos.z, facingX: facing.x, facingY: facing.y, facingZ: facing.z };
    this.world!.send("playerMove", this.lastSent);
  }
}

type playerSessionId = string;
class PlayerSession implements Component {
  constructor(public id: playerSessionId) {}
}

class Game {
  me?: IdEntity;
  constructor(private scene: Scene, private world: Engine) {}
  trackServerPlayers(net: Net, mePlayer: NetPlayer, others: PlayerMap, status: StatusLine) {
    // this is not right- misses some cases

    this.addPlayer(net.world!.sessionId, mePlayer, true);
    others.forEach((pl, id) => {
      log.info(`initial others onadd ${id}`);

      this.addPlayer(id, pl, false);
    });

    net.players().onAdd = (player: NetPlayer, sessionId: string) => {
      log.info(`\nnet onAdd ${sessionId} ${net.world!.sessionId}`);
      if (net.world!.sessionId == sessionId) {
        log.error("another player with my session");
      } else {
        console.log("player add", player.sessionId);
        if (this.playersWithSession(sessionId).length == 0) {
          this.addPlayer(sessionId, player, /*me=*/ false);
        }
      }
      status.setConnection(`connected (${Array.from(net.world!.state.players.keys()).length} players)`);
    };

    net.players().onRemove = (player: NetPlayer, sessionId: string) => {
      console.log("player rm", player.sessionId);
      this.removePlayer(sessionId);
      status.setConnection(`connected (${Array.from(net.world!.state.players.keys()).length} players)`);
    };
  }
  playersWithSession(sessionId: playerSessionId): IdEntity[] {
    //    hopefully 0 or 1!
    const ret: IdEntity[] = [];
    this.world.entities.forEach((e: IdEntity) => {
      const sess = e.components.get(PlayerSession);
      if (sess) {
        if (sess.id == sessionId) {
          ret.push(e);
        }
      }
    });
    return ret;
  }
  addPlayer(sessionId: playerSessionId, player: NetPlayer, me: boolean) {
    log.info("addPlayer", sessionId);
    const p = new IdEntity();
    this.world.entities.add(p);
    p.components.add(new PlayerSession(sessionId));
    const nav = this.scene.getMeshByName("navmesh") as Mesh;
    nav.updateFacetData(); // only once- move to env?
    const rootTransform = nav.getWorldMatrix()!;

    p.components.add(new PlayerTransform(this.scene, Vector3.Zero(), Vector3.Zero(), Vector3.Forward(), nav, rootTransform));
    p.components.add(new PlayerDebug(this.scene));
    p.components.add(new PlayerView(this.scene, sessionId));
    p.components.add(new InitNametag(this.scene, 20, sessionId));

    const repaint = () => {
      const nt = p.components.get(Nametag);
      if (!nt) return;
      const painter = new RepaintNametag();

      painter.repaint(nt.tx, player.nick);
    };
    player.listen("nick", repaint);
    // at the moment, p still has InitNametag, not Nametag
    setTimeout(repaint, 1000);

    if (me) {
      p.components.add(new LocalCam(this.scene));
      p.components.get(LocalCam).cam.lockedTarget = p.components.get(PlayerView).aimAt as AbstractMesh;
      this.me = p;
      p.components.get(PlayerTransform).pos = new Vector3(-2.3, 0, -2);
      p.components.get(PlayerTransform).facing = new Vector3(0, 0, 1);
    }
  }
  removePlayer(sessionId: playerSessionId) {
    this.playersWithSession(sessionId).forEach((e: IdEntity) => {
      log.info("rm entity", e.id);
      this.world.entities.remove(e);
    });
  }
  getMe(): IdEntity {
    return this.me!;
  }
  setPlayerPosFromNet(name: string, pos: Vector3) {
    const pls = this.playersWithSession(name);
    const pl = pls[0];
    pl.components.get(PlayerTransform).pos = pos;
  }
  setAll(players: PlayerMap) {
    players.forEach((pl, id) => {
      const pents = this.playersWithSession(id);
      const p = pents[0];
      if (!p) {
        log.error(`net update for id=${id}, not found`);
        return;
      }
      p.components.get(PlayerTransform).pos = new Vector3(pl.x, pl.y, pl.z);
      p.components.get(PlayerTransform).facing = new Vector3(pl.facingX, pl.facingY, pl.facingZ);
      // log.info(`facing update for ${id} to ${pm.facing.toString()}`)
    });
  }
}

class BjsMesh implements Component {
  constructor(public object: AbstractMesh) {}
}

class Twirl implements Component {
  constructor(public degPerSec = 1) {}
}

function ecsInit(): Engine {
  const world = new Engine();

  class SimpleMove extends AbstractEntitySystem<IdEntity> {
    processEntity(entity: IdEntity, index: number, entities: unknown, options: any) {
      const degPerSec = entity.components.get(Twirl).degPerSec;
      const object: AbstractMesh = entity.components.get(BjsMesh).object;

      object.rotation.y += degPerSec * options.dt;
    }
  }
  world.systems.add(new SimpleMove(/*priority=*/ 0, /*all=*/ [Twirl, BjsMesh]));

  world.systems.add(new PlayerViewMovement(0, [PlayerTransform, PlayerView]));
  world.systems.add(new PlayerMovement(0, [PlayerTransform, PlayerDebug]));
  world.systems.add(new LocalCamFollow(0, [PlayerTransform, LocalCam]));
  world.systems.add(new PlayerJump(0, [PlayerTransform, InitJump]));
  world.systems.add(new CreateNametag(1, [PlayerView, InitNametag]));
  world.systems.add(new RepaintNametag(1, [Nametag]));

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
  status.setPlayer(nick);

  const net = new Net(status);
  const ret = await net.joinWorld();
  const mePlayer = ret.me;
  const others = ret.others;

  net.world!.send("setNick", nick);

  const scene = setupScene("renderCanvas");
  ecsCard(world, scene);
  const game = new Game(scene, world);
  const env = new Env.World(scene);
  await env.load(Env.GraphicsLevel.texture);
  game.trackServerPlayers(net, mePlayer, others, status);

  net.world!.onStateChange((state) => {
    game.setAll(net.world!.state.players);
  });

  const userInput = new UserInput(scene, function onAction(name: Actions) {
    if (name == Actions.Jump) {
      game.getMe().components.add(new InitJump());
    } else if (name == Actions.ToggleNavmeshView) {
      Env.toggleNavmeshView(scene);
    } else if (name == Actions.ToggleBirdsEyeView) {
      game.getMe().components.get(LocalCam).toggleBirdsEyeView();
    }
  });

  const slowStep = false;

  const gameStep = (dt: number) => {
    world.run({
      dt,
      userInput, // todo get this out of here
    } as WorldRunOptions);

    userInput.step(dt);

    net.uploadMe(game.getMe());
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
