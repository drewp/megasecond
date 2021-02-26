import { MapSchema } from "@colyseus/schema";
import { Scene, Vector2, Vector3 } from "babylonjs";
import * as Colyseus from "colyseus.js";
import { Component, Types, World } from "ecsy";
import createLogger from "logging";
import { Player, WorldState } from "../shared/WorldRoom";
import { setupScene, StatusLine } from "./BrowserWindow";
import * as Env from "./Env";
import { FollowCam } from "./FollowCam";
import { getOrCreateNick } from "./nick";
import { PlayerMotion } from "./PlayerMotion";
import { PlayerView } from "./PlayerView";
import { Actions, UserInput } from "./UserInput";

const log = createLogger("WorldRoom");

type PlayerMap = Map<playerSessionId, Player>;

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

    return new Promise<{ me: Player; others: PlayerMap }>((resolve, reject) => {
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
  players(): MapSchema<Player> {
    return this.world!.state.players;
  }
  uploadMe(me: PlayerMotion) {
    if (
      this.lastSent !== undefined && //
      this.lastSent.x == me.pos.x &&
      this.lastSent.y == me.pos.y &&
      this.lastSent.z == me.pos.z &&
      this.lastSent.facingX == me.facing.x &&
      this.lastSent.facingY == me.facing.y &&
      this.lastSent.facingZ == me.facing.z
    ) {
      return;
    }
    this.lastSent = { x: me.pos.x, y: me.pos.y, z: me.pos.z, facingX: me.facing.x, facingY: me.facing.y, facingZ: me.facing.z };
    this.world!.send("playerMove", this.lastSent);
  }
}

type playerSessionId = string;

class Game {
  playerViews = new Map<playerSessionId, PlayerView>();
  playerMotions = new Map<playerSessionId, PlayerMotion>();
  fcam: FollowCam;
  me?: PlayerMotion;
  constructor(private scene: Scene, private world: World) {
    const localPlayer = world.createEntity();
    this.fcam = new FollowCam(scene);
  }
  trackServerPlayers(net: Net, mePlayer: Player, others: PlayerMap, status: StatusLine) {
    // this is not right- misses some cases

    this.addPlayer(net.world!.sessionId, mePlayer, true);
    others.forEach((pl, id) => {
      log.info(`initial others onadd ${id}`);

      this.addPlayer(id, pl, false);
    });

    net.players().onAdd = (player: Player, sessionId: string) => {
      log.info(`\nnet onAdd ${sessionId} ${net.world!.sessionId}`);
      if (net.world!.sessionId == sessionId) {
        log.error("another player with my session");
      } else {
        console.log("player add", player.sessionId);
        if (!this.playerViews.has(sessionId)) {
          this.addPlayer(sessionId, player, /*me=*/ false);
        }
      }
      status.setConnection(`connected (${Array.from(net.world!.state.players.keys()).length} players)`);
    };

    net.players().onRemove = (player: Player, sessionId: string) => {
      console.log("player rm", player.sessionId);
      this.removePlayer(sessionId);
      status.setConnection(`connected (${Array.from(net.world!.state.players.keys()).length} players)`);
    };
  }

  addPlayer(sessionId: playerSessionId, player: Player, me: boolean) {
    log.info("addPlayer", sessionId);
    const pv = new PlayerView(this.scene, player);
    this.playerViews.set(sessionId, pv);
    const pm = new PlayerMotion(this.scene, player);
    this.playerMotions.set(sessionId, pm);
    if (me) {
      this.fcam.setTarget(pv.getCamTarget());
      (window as any).me = pv;
      this.me = pm;
      this.me.pos = new Vector3(1.8, 0, -9.5);
      this.me.facing = new Vector3(0, 0, -1);
    }
  }
  removePlayer(sessionId: playerSessionId) {
    const pv = this.playerViews.get(sessionId);
    if (pv === undefined) {
      return;
    }
    pv.dispose();
    this.playerViews.delete(sessionId);
    this.playerMotions.delete(sessionId);
  }
  getMe(): PlayerMotion {
    return this.me!;
  }
  setPlayerPosFromNet(name: string, pos: Vector3) {
    const pm = this.playerMotions.get(name);
    if (pm === undefined) {
      return;
    }
    pm.pos = pos;
  }
  setAll(players: PlayerMap) {
    players.forEach((pl, id) => {
      const pm = this.playerMotions.get(id);
      if (pm === undefined) {
        log.error(`net update for id=${id}, not found`);
        return;
      }
      pm.pos = new Vector3(pl.x, pl.y, pl.z);
      pm.facing = new Vector3(pl.facingX, pl.facingY, pl.facingZ);
      // log.info(`facing update for ${id} to ${pm.facing.toString()}`)
    });
  }
  stepPlayerViews(dt: number) {
    for (let [name, pm] of this.playerMotions.entries()) {
      const pv = this.playerViews.get(name);
      if (pv === undefined) throw new Error("missing view for " + name);
      pv.step(dt, pm.pos, pm.facing, pm.getHeading(), pm === this.me ? this.fcam : undefined);
    }
  }
}

async function go() {
  const world = new World();

  class Demo extends Component<{}> {}
  Demo.schema = {
    num: { type: Types.Number, default: 10 },
  };
  world.registerComponent(Demo);
  const meEntity = world.createEntity();
  meEntity.addComponent(Demo);

  const nick = getOrCreateNick();

  const status = new StatusLine();
  status.setPlayer(nick);

  const net = new Net(status);
  const ret = await net.joinWorld();
  const mePlayer = ret.me;
  const others = ret.others;

  net.world!.send("setNick", nick);

  const scene = setupScene("renderCanvas");
  const game = new Game(scene, world);
  const env = new Env.World(scene);
  await env.load(Env.GraphicsLevel.texture);
  game.trackServerPlayers(net, mePlayer, others, status);

  net.world!.onStateChange((state) => {
    game.setAll(net.world!.state.players);
  });

  const userInput = new UserInput(scene, function onAction(name: Actions) {
    if (name == Actions.Jump) {
      game.getMe().requestJump();
    } else if (name == Actions.ToggleNavmeshView) {
      Env.toggleNavmeshView(scene);
    } else if (name == Actions.ToggleBirdsEyeView) {
      game.fcam.toggleBirdsEyeView();
    }
  });

  const me = game.getMe();

  const slowStep = false;

  const gameStep = (dt: number) => {
    world.execute(dt, performance.now() / 1000);

    userInput.step(dt);

    me.step(dt, userInput.mouseX, new Vector2(userInput.stickX, userInput.stickY));
    game.fcam.onMouseY(userInput.mouseY);

    net.uploadMe(me);

    game.stepPlayerViews(dt);
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
