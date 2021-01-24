import { customElement, html, LitElement, PropertyValues } from "lit-element";
import {
  Color3,
  Color4,
  DirectionalLight,
  Engine,
  FreeCamera,
  HemisphericLight,
  Mesh,
  Scene,
  SceneLoader,
  ShadowGenerator,
  StandardMaterial,
  Texture,
  Vector3,
} from "@babylonjs/core";
// import { Schema, type, MapSchema } from "@colyseus/schema";
import * as Colyseus from "colyseus.js"; 

@customElement("game-page")
export class GamePage extends LitElement {
  firstUpdated(changedProperties: PropertyValues) {
    console.log('connect C client')
    const client = new Colyseus.Client("wss://bigasterisk.com/megasecond/");

    // class StateHandler extends Schema {}

    client.joinOrCreate("game").then((room) => {
      const playerViews: { [id: string]: Mesh } = {};

    // room.state.players.onAdd = function(player, key) {
    //     // Our built-in 'sphere' shape. Params: name, subdivs, size, scene
    //     playerViews[key] = BABYLON.Mesh.CreateSphere("sphere1", 16, 2, scene);

    //     // Move the sphere upward 1/2 its height
    //     playerViews[key].position.set(player.position.x, player.position.y, player.position.z);

    //     // Update player position based on changes from the server.
    //     player.position.onChange = () => {
    //         playerViews[key].position.set(player.position.x, player.position.y, player.position.z);
    //     };

    //     // Set camera to follow current player
    //     if (key === room.sessionId) {
    //         camera.setTarget(playerViews[key].position);
    //     }
    //     room.send('key', 'hi');
    // };

    // room.state.players.onRemove = function(player, key) {
    //     scene.removeMesh(playerViews[key]);
    //     delete playerViews[key];
    // };

    // room.onStateChange((state) => {
    //   console.log("New room state:", state.toJSON());
    // });
    });

    const canvas = this.shadowRoot?.getElementById("renderCanvas") as HTMLCanvasElement;
    const engine = new Engine(canvas, true);
    const scene = new Scene(engine);
    scene.clearColor = new Color4(0, 0, 0, 0);

    const camera = new FreeCamera("maincam", new Vector3(0, 190, 0), scene);
    camera.setTarget(Vector3.Zero());
    camera.upVector.copyFromFloats(0, 0, -1);
    camera.fov = 0.42;

    const light = new HemisphericLight("light1", new Vector3(0, 1, 0), scene);
    light.intensity = 0.4;

    const sun = new DirectionalLight("sun", new Vector3(-0.296, -0.7, -0), scene);
    sun.intensity = 0.68;
    sun.autoCalcShadowZBounds = true;

    SceneLoader.Append("./asset/", "track.glb", scene, (scene) => {
      console.log("loaded gltf");
      try {
        const gen = new ShadowGenerator(2048, sun);
        gen.bias = 0.01;
        gen.addShadowCaster(scene.meshes[0], true);
        scene.getMeshByName("gnd")!.receiveShadows = true;
        scene.meshes.forEach((m) => {
          try {
            m.receiveShadows = true;
          } catch (e) {
            // some objs can't
          }
        });
      } catch (err) {
        console.log("babylon won't say the error was", err);
        throw err;
      }
    });

    engine.runRenderLoop(() => {
      scene.render();
    });
  }

  render() {
    return html` <div><img src="asset/logo1.png" style="width: 70%" /></div>
      <div id="game"><canvas id="renderCanvas"></canvas></div>`;
  }
}
