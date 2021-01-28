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
  mySessionId: string;
  constructor(private status: StatusLine) {
    this.status.setPlayer("...");
    this.status.setConnection("connecting...");
    this.client = new Colyseus.Client("wss://bigasterisk.com/megasecond/");
    this.mySessionId = "p" + Math.round(Math.random() * 10000);
    this.status.setPlayer(this.mySessionId);
  }
  async joinWorld() {
    this.world = await this.client.joinOrCreate<WorldRoom>("world", { name: this.mySessionId });
    this.status.setConnection("connected.");

    (window as any).world = this.world;
    this.worldState = (this.world.state as unknown) as any;
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
  setTarget(me: AbstractMesh) {
    this.cam.lockedTarget = me;
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
  body?: InstancedMesh;
  constructor(private scene: Scene, private name: string) {
    this.makeInstance();
  }
  setPos(p: Vector3) {
    this.body?.position.copyFrom(p);
  }
  makeInstance() {
    const playerReferenceModel = this.scene.getMeshByName("player");
    if (!playerReferenceModel) {
      throw new Error("no ref yet");
    }
    this.body = (playerReferenceModel as Mesh).createInstance(`${this.name}-body`);
    const sunCaster = (window as any).gen as ShadowGenerator; // todo
    sunCaster.addShadowCaster(this.body);
  }
  dispose() {
    this.body?.dispose();
  }
  getCamTarget(): AbstractMesh {
    return this.body!;
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

class Game {
  playerViews: Map<string, PlayerView>;
  fcam: FollowCam;

  constructor(private scene: Scene) {
    this.playerViews = new Map();
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
    pv.setPos(new Vector3(1, 0, 0));
    this.playerViews.set(name, pv);
    if (me) {
      this.fcam.setTarget(pv.getCamTarget());
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

  setPlayerPos(name: string, pos: Vector3) {
    const pv = this.playerViews.get(name);
    if (pv === undefined) {
      return;
    }
    pv.setPos(pos);
  }
}

async function go() {
  const status = new StatusLine();
  const net = new Net(status);

  await net.joinWorld();

  const scene = setupScene("renderCanvas");
  const game = new Game(scene);
  await game.loadEnv();

  let me: PlayerView;
  let kx = 0,
    ky = 0;

  game.addPlayer(net.mySessionId, /*me=*/ true);

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
      kx = x;
      ky = y;
    },
    function onAction(name) {}
  );

  scene.getEngine().runRenderLoop(() => {
    const body = game.playerViews.get(net.mySessionId)!.body;
    if (!body) {
      return;
    }
    if (kx != 0 || ky != 0) {
      body.position.x += kx * 0.05;
      body.position.z += ky * 0.05;
      net.world!.send("playerMove", { x: body.position.x, z: body.position.z });
    }
    scene.render();
  });
}

go();
