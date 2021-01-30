import { ShadowOnlyMaterial } from "babylonjs-materials";

import {
  AbstractMesh,
  ActionEvent,
  ActionManager,
  AddBlock,
  AnimatedInputBlockTypes,
  Color4,
  DirectionalLight,
  Engine,
  ExecuteCodeAction,
  FollowCamera,
  FragmentOutputBlock,
  InputBlock,
  InstancedMesh,
  Mesh,
  ModBlock,
  NodeMaterial,
  NodeMaterialSystemValues,
  PickingInfo,
  PointerEventTypes,
  Quaternion,
  RawTexture2DArray,
  ScaleBlock,
  Scene,
  SceneLoader,
  ShaderMaterial,
  ShadowDepthWrapper,
  ShadowGenerator,
  SpotLight,
  TransformBlock,
  TransformNode,
  TrigonometryBlock,
  TrigonometryBlockOperations,
  Vector3,
  VectorSplitterBlock,
  VertexOutputBlock,
} from "babylonjs";
import * as Colyseus from "colyseus.js";
import { WorldRoom, WorldState } from "../shared/WorldRoom";
import { throws } from "assert";

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
    this.cam.cameraAcceleration = 0.5;
    scene.switchActiveCamera(this.cam);
  }
  setTarget(me: TransformNode) {
    this.cam.lockedTarget = me as AbstractMesh;
  }
  onMouseY(movementY: number) {
    this.cam.heightOffset += 0.001 * movementY;
  }
  step(dt: number, pos: Vector3, facing: Vector3) {
    // try to get behind player, don't crash walls
    let heading = (360 / 6.28) * Math.atan2(-facing.z, facing.x) + 270;
    while (Math.abs(heading - 360 - this.cam.rotationOffset) < Math.abs(heading - this.cam.rotationOffset)) {
      heading -= 360;
    }
    this.cam.rotationOffset += (dt * 20 * (heading - this.cam.rotationOffset)) % 360;
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

enum Actions {
  Jump,
  Activate,
}

class UserInput {
  private stickX = 0;
  private stickY = 0;
  private stickPressFunc: { [keyName: string]: () => void };
  private stickReleaseFunc: { [keyName: string]: () => void };

  constructor(
    private scene: Scene,
    private onMouse: (dx: number, dy: number) => void,
    private onStick: (x: number, y: number) => void,
    private onAction: (name: Actions) => void
  ) {
    this.stickPressFunc = {
      ArrowUp: () => (this.stickY = -1),
      w: () => (this.stickY = -1),
      ArrowDown: () => (this.stickY = 1),
      s: () => (this.stickY = 1),
      ArrowLeft: () => (this.stickX = -1),
      a: () => (this.stickX = -1),
      ArrowRight: () => (this.stickX = 1),
      d: () => (this.stickX = 1),
    };
    this.stickReleaseFunc = {
      ArrowUp: () => (this.stickY = 0),
      w: () => (this.stickY = 0),
      ArrowDown: () => (this.stickY = 0),
      s: () => (this.stickY = 0),
      ArrowLeft: () => (this.stickX = 0),
      a: () => (this.stickX = 0),
      ArrowRight: () => (this.stickX = 0),
      d: () => (this.stickX = 0),
    };
    scene.actionManager = new ActionManager(scene);
    scene.actionManager.registerAction(new ExecuteCodeAction({ trigger: ActionManager.OnKeyDownTrigger }, this.onKeyDown.bind(this)));
    scene.actionManager.registerAction(new ExecuteCodeAction({ trigger: ActionManager.OnKeyUpTrigger }, this.onKeyUp.bind(this)));
    scene.onPointerMove = this.onMove.bind(this);
  }
  onMove(ev: PointerEvent, pickInfo: PickingInfo, type: PointerEventTypes) {
    if (!document.pointerLockElement) {
      return;
    }
    this.onMouse(ev.movementX, ev.movementY);
  }
  onKeyDown(ev: ActionEvent) {
    const func = this.stickPressFunc[ev.sourceEvent.key as string];
    if (func) {
      func();
      this.onStick(this.stickX, this.stickY);
    }
    if (ev.sourceEvent.key == " ") {
      this.onAction(Actions.Jump);
    }
    if (ev.sourceEvent.key == "e") {
      this.onAction(Actions.Activate);
    }
  }
  onKeyUp(ev: ActionEvent) {
    const func = this.stickReleaseFunc[ev.sourceEvent.key as string];
    if (func) {
      func();
      this.onStick(this.stickX, this.stickY);
    }
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
  step(dt: number, pos: Vector3, facing: Vector3, fcam: FollowCam | undefined) {
    const b = this.body!;
    b.position.copyFrom(pos);
    b.lookAt(b.position.add(facing)); // todo: maybe with animation
    if (fcam) {
      fcam.step(dt, pos, facing);
    }
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
  canvas.addEventListener("pointerdown", (ev) => {
    engine.enterPointerlock();
  });

  return scene;
}

class PlayerMotion {
  // inputs->motion, physics, etc. Might move to server side.

  pos = Vector3.Zero();
  vel = Vector3.Zero();
  facing = Vector3.Forward(); // unit
  step(dt: number) {
    this.pos.addInPlace(this.vel.scale(dt));
    if (this.pos.y > 0) {
      this.vel.y -= dt * 9.8;
    } else this.vel.y = 0;
    // fric, grav, coll
  }
  onMouseX(movementX: number) {
    const nf = Vector3.Zero();
    const rot = Quaternion.RotationAxis(Vector3.Up(), movementX * 0.001);
    this.facing.rotateByQuaternionAroundPointToRef(rot, Vector3.Zero(), nf);
    this.facing.copyFrom(nf);

    this.vel.rotateByQuaternionAroundPointToRef(rot, Vector3.Zero(), nf);
    this.vel.copyFrom(nf);
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
        this.scene.clearColor = new Color4(0.419, 0.517, 0.545, 1);
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

        BABYLON.Effect.ShadersStore["aVertexShader"] = `
        precision highp float;

        attribute vec3 position;
        attribute vec2 uv;
        
        uniform mat4 world;
        uniform mat4 worldViewProjection;
        
        varying vec2 v_uv;
        void main(void) {
            vec4 output1 = world * vec4(position, 1.0);
            vec4 output0 = worldViewProjection * output1;
            gl_Position = output0;
            v_uv = position.xz;
        }
        
        `;

        BABYLON.Effect.ShadersStore["aFragmentShader"] = `
        precision highp float;
       
        uniform mat4 world;
        uniform mat4 worldViewProjection;
        varying vec2 v_uv;

 
        void main(void) {
            float sz= 3.;
            float v  = (mod(v_uv.x, sz) > sz/2. ^^ mod(v_uv.y, sz) > sz/2.) ? .3 : .5;
            gl_FragColor = vec4(v, v, v, 1.0);
        }
        
    `;

        var shaderMaterial = new ShaderMaterial("a", this.scene, "a", {
          attributes: ["position", "uv"],
          uniforms: ["world", "worldViewProjection"],
        });

        shaderMaterial.backFaceCulling = false;

        const gnd = this.scene.getMeshByName("gnd")!;
        gnd.material = shaderMaterial;

        const shadow = gnd.clone("shad", null) as Mesh;
        shadow.position.y += 0.01;
        shadow.material = new ShadowOnlyMaterial("g", this.scene);
        shadow.receiveShadows = true;

        // const shadowDepthWrapper = new ShadowDepthWrapper(shaderMaterial, this.scene);
        // shaderMaterial.shadowDepthWrapper = shadowDepthWrapper;

        // gen.getShadowMap()?.renderList?.push(gnd);

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
  updatePlayerViews(dt: number) {
    for (let [name, pm] of this.playerMotions.entries()) {
      const pv = this.playerViews.get(name);
      if (pv === undefined) continue; //throw new Error("missing view for " + name);
      pv.step(dt, pm.pos, pm.facing, pm === this.me ? this.fcam : undefined);
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

  const userInput = new UserInput(
    scene,
    function onMouse(dx, dy) {
      game.getMe().onMouseX(dx);
      game.fcam.onMouseY(dy);
    },
    function onStick(x, y) {
      const me = game.getMe();
      me.vel = me.facing.scale(-2.5 * y).add(me.facing.cross(Vector3.Up()).scale(-2 * x));
    },
    function onAction(name: Actions) {
      if (name == Actions.Jump) {
        const me = game.getMe();
        me.vel.y = 3;
      }
    }
  );

  scene.getEngine().runRenderLoop(() => {
    const dt = scene.getEngine().getDeltaTime() / 1000.0;
    const me = game.getMe();
    me.step(dt);
    net.uploadMe(me);

    game.updatePlayerViews(dt);

    scene.render();
  });
}

go();
