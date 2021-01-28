import {
  AbstractMesh,
  ActionEvent,
  ActionManager,
  Color4,
  DirectionalLight,
  Engine,
  ExecuteCodeAction,
  FollowCamera,
  InstancedMesh,
  Mesh,
  Scene,
  SceneLoader,
  ShadowGenerator,
  SpotLight,
  TransformNode,
  Vector3,
} from "babylonjs";
import * as Colyseus from "colyseus.js";
import { WorldRoom, WorldState } from "../shared/WorldRoom";

class StatusLine {
  setPlayer(player: string) {
    (document.querySelector("#me")! as HTMLElement).innerText = player;
  }
  setConnection(c: string) {
    (document.querySelector("#connection")! as HTMLElement).innerText = c;
  }
}

class Net {
  client: Colyseus.Client;
  world?: Colyseus.Room<WorldRoom>;
  worldState?: WorldState;
  myDisplayName: string;
  private lastSent: { x: number; z: number } | undefined;
  constructor(private status: StatusLine) {
    this.status.setPlayer("...");
    this.status.setConnection("connecting...");
    this.client = new Colyseus.Client("wss://bigasterisk.com/megasecond/");
    this.myDisplayName = "p" + Math.round(Math.random() * 10000);
    this.status.setPlayer(this.myDisplayName);
  }
  async joinWorld() {
    this.world = await this.client.joinOrCreate<WorldRoom>("world", { name: this.myDisplayName });
    this.status.setConnection("connected.");

    (window as any).world = this.world;
    this.worldState = (this.world.state as unknown) as any;
  }
  uploadMe(me: PlayerMotion) {
    if (this.lastSent !== undefined && this.lastSent.x == me.pos.x && this.lastSent.z == me.pos.z) {
      return;
    }
    this.lastSent = { x: me.pos.x, z: me.pos.z };
    this.world!.send("playerMove", this.lastSent);
  }
}

class FollowCam {
  private cam: FollowCamera;
  constructor(scene: Scene) {
    this.cam = new FollowCamera("cam", new Vector3(-1.4, 1.5, -4), scene);
    this.cam.inputs.clear();
    this.cam.radius = 2;
    this.cam.heightOffset = 1;
    this.cam.fov = 1.2;
    this.cam.rotationOffset = 180;
    scene.switchActiveCamera(this.cam);
  }
  setTarget(me: TransformNode) {
    this.cam.lockedTarget = me as AbstractMesh;
  }
  step(dt: number) {
    // try to get behind player, don't crash walls
  }
}

function AddBabylonExplorer(scene: Scene) {
  scene.debugLayer
    .show({
      overlay: true,
      handleResize: true,
      globalRoot: document.querySelector("#game")! as HTMLElement,
    })
    .then(() => {
      scene.debugLayer.onPropertyChangedObservable.add((result: any) => {
        console.log(result.object.name, result.property, result.value);
      });
    });
}

class UserInput {
  constructor(
    private scene: Scene,
    private onMouse: (dx: number, dy: number) => void,
    private onStick: (x: number, y: number) => void,
    private onAction: (name: "jump" | "activate") => void
  ) {
    let kx = 0,
      ky = 0;
    scene.actionManager = new ActionManager(scene);
    scene.actionManager.registerAction(
      new ExecuteCodeAction({ trigger: ActionManager.OnKeyDownTrigger }, function (ev: ActionEvent) {
        if (ev.sourceEvent.key == "ArrowUp") {
          ky = -1;
          onStick(kx, ky);
        }
        if (ev.sourceEvent.key == "ArrowDown") {
          ky = 1;
          onStick(kx, ky);
        }
        if (ev.sourceEvent.key == "ArrowLeft") {
          kx = -1;
          onStick(kx, ky);
        }
        if (ev.sourceEvent.key == "ArrowRight") {
          kx = 1;
          onStick(kx, ky);
        }
        if (ev.sourceEvent.key == "space") {
          onAction("jump");
        }
        if (ev.sourceEvent.key == "e") {
          onAction("activate");
        }
      })
    );
    scene.actionManager.registerAction(
      new ExecuteCodeAction({ trigger: ActionManager.OnKeyUpTrigger }, function (ev: ActionEvent) {
        if (ev.sourceEvent.key == "ArrowUp") {
          ky = 0;
          onStick(kx, ky);
        }
        if (ev.sourceEvent.key == "ArrowDown") {
          ky = 0;
          onStick(kx, ky);
        }
        if (ev.sourceEvent.key == "ArrowLeft") {
          kx = 0;
          onStick(kx, ky);
        }
        if (ev.sourceEvent.key == "ArrowRight") {
          kx = 0;
          onStick(kx, ky);
        }
      })
    );
  }
}

class PlayerView {
  // makes one player from base models. owns scene objects. low-level controls.
  //
  // X=left, Y=up, Z=fwd
  private body?: InstancedMesh;
  private aimAt?: TransformNode;
  constructor(private scene: Scene, private name: string) {
    this.makeInstance();
  }
  makeInstance() {
    const playerReferenceModel = this.scene.getMeshByName("player");
    const refAim = this.scene.getTransformNodeByName("player_aim")!;
    if (!playerReferenceModel || !refAim) {
      throw new Error("no ref yet");
    }
    this.body = (playerReferenceModel as Mesh).createInstance(`${this.name}-body`);
    this.aimAt = new TransformNode(`${this.name}-aim`);
    this.aimAt.parent = this.body;

    const refOffset = refAim.position.subtract(playerReferenceModel.position);
    this.aimAt.position = this.body.position.add(refOffset);
    const sunCaster = (window as any).gen as ShadowGenerator; // todo
    sunCaster.addShadowCaster(this.body);
  }
  dispose() {
    this.body?.dispose();
  }
  setPose(pos: Vector3, facing: Vector3) {
    const b = this.body!;
    b.position.copyFrom(pos);
    b.lookAt(b.position.add(facing)); // todo: maybe with animation
  }
  getCamTarget(): TransformNode {
    return this.aimAt!;
  }
}

function setupScene(canvasId: string): Scene {
  const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
  const engine = new Engine(canvas, /*antialias=*/ true);
  const scene = new Scene(engine);
  (window as any).scene = scene;
  scene.clearColor = new Color4(0, 0, 0, 0);
  window.addEventListener("resize", function () {
    engine.resize();
  });

  if (location.hash.indexOf("explor") != -1) {
    AddBabylonExplorer(scene);
  }

  return scene;
}

class PlayerMotion {
  // inputs->motion, physics, etc. Might move to server side.

  pos = Vector3.Zero();
  vel = Vector3.Zero();
  facing = Vector3.Forward(); // unit
  step(dt: number) {
    this.pos.addInPlace(this.vel.scale(dt));
    // fric, grav, coll
  }
}

class Game {
  playerViews = new Map<string, PlayerView>();
  playerMotions = new Map<string, PlayerMotion>();
  fcam: FollowCam;
  me?: PlayerMotion;
  constructor(private scene: Scene) {
    this.fcam = new FollowCam(scene);
  }
  async loadEnv() {
    return new Promise<void>((resolve, reject) => {
      SceneLoader.Append("./asset/wrap/", "wrap.glb", this.scene, (_scene) => {
        console.log("loaded gltf");
        const playerRefModel = this.scene.getMeshByName("player") as Mesh;
        playerRefModel.position.y = -100; //hide
        this.scene.getMeshByName("navmesh")!.visibility = 0;
        const light = this.scene.getLightByName("Light") as DirectionalLight;
        light.autoCalcShadowZBounds = true;
        const gen = new ShadowGenerator(4096, light);
        (window as any).gen = gen;
        gen.bias = 0.001;
        gen.filter = 4;
        this.scene.meshes.forEach((m) => {
          try {
            m.receiveShadows = true;
          } catch (e) {
            // some objs can't
          }
        });
        resolve();
      });
    });
  }
  addPlayer(name: string, me: boolean) {
    const pv = new PlayerView(this.scene, name);
    this.playerViews.set(name, pv);
    const pm = new PlayerMotion();
    this.playerMotions.set(name, pm);
    if (me) {
      this.fcam.setTarget(pv.getCamTarget());
      (window as any).me = pv;
      this.me = pm;
    }
  }
  removePlayer(name: string) {
    const pv = this.playerViews.get(name);
    if (pv === undefined) {
      return;
    }
    pv.dispose();
    this.playerViews.delete(name);
  }
  getMe(): PlayerMotion {
    return this.me!;
  }
  setPlayerPos(name: string, pos: Vector3) {
    const pm = this.playerMotions.get(name);
    if (pm === undefined) {
      return;
    }
    pm.pos = pos;
  }
  updatePlayerViews() {
    for (let [name, pm] of this.playerMotions.entries()) {
      const pv = this.playerViews.get(name);
      if (pv === undefined) continue;//throw new Error("missing view for " + name);
      pv.setPose(pm.pos, pm.facing);
    }
  }
}

async function go() {
  const status = new StatusLine();
  const net = new Net(status);

  await net.joinWorld();

  const scene = setupScene("renderCanvas");
  const game = new Game(scene);
  await game.loadEnv();

  for (let [sess, data] of net.worldState!.players.entries()) {
    console.log("ws player", sess, "and i  am", net.world?.sessionId);
    game.addPlayer(sess, /*me=*/ sess == net.world?.sessionId);
  }

  net.worldState!.players.onAdd = (player: any, sessionId: any) => {
    if (net.world!.sessionId === sessionId) {
      status.setPlayer(player.name);
      status.setConnection(`connected (${Array.from(net.worldState!.players.keys()).length} players)`);
    } else {
      console.log("It's an opponent", player.name, sessionId);
      status.setConnection(`connected (${Array.from(net.worldState!.players.keys()).length} players)`);
      game.addPlayer(sessionId, /*me=*/ false); // todo: this isnt happening for existing players
    }
  };

  net.worldState!.players.onRemove = function (player: any, sessionId: any) {
    console.log("bye", player, sessionId);
    status.setConnection(`connected (${Array.from(net.worldState!.players.keys()).length} players)`);
    game.removePlayer(sessionId);
  };

  net.world!.onMessage("playerMove", (msg: any) => {
    const pl = game.setPlayerPos(msg[0], new Vector3(msg[1].x, 0, msg[1].z));
  });

  // fcam.attachControl(true);
  // see https://github.com/mrdoob/three.js/blob/master/examples/js/controls/PointerLockControls.js
  // or https://repl.it/talk/learn/3D-Games-with-BabylonJS-A-Starter-Guide/15957
  // or engine.enterPointerlock(); which doesn't work
  // https://playground.babylonjs.com/#5X4KX2#11 kind of works

  const userInput = new UserInput(
    scene,
    function onMouse(dx, dy) {},
    function onStick(x, y) {
      game.getMe().vel = new Vector3(x, 0, -y);
      // console.log(x, y, game.getMe().vel.toString())
    },
    function onAction(name) {}
  );

  scene.getEngine().runRenderLoop(() => {
    const dt = scene.getEngine().getDeltaTime() / 1000.0;
    const me = game.getMe();
    me.step(dt);
    net.uploadMe(me);

    game.updatePlayerViews();

    scene.render();
  });
}

go();
