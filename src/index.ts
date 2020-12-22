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

@customElement("game-page")
export class GamePage extends LitElement {
  firstUpdated(changedProperties: PropertyValues) {
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
    return html` <div id="game"><canvas id="renderCanvas"></canvas></div>`;
  }
}
