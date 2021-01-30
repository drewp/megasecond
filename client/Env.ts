// game environment, not code environment

import { AbstractMesh, Color4, DirectionalLight, Effect, Mesh, Scene, SceneLoader, ShaderMaterial, ShadowGenerator } from "babylonjs";
import { ShadowOnlyMaterial } from "babylonjs-materials";

export async function loadEnv(scene: Scene) {
  return new Promise<void>((resolve, reject) => {
    SceneLoader.Append("./asset/wrap/", "wrap.glb", scene, (_scene) => {
      console.log("loaded gltf");
      scene.clearColor = new Color4(0.419, 0.517, 0.545, 1);
      hideReferencePlayer(scene); //hide
      scene.getMeshByName("navmesh")!.visibility = 0;
      setupSunShadows(scene);

      const gnd = scene.getMeshByName("gnd")!;
      gnd.material = checkerboardMaterial(scene);
      addGndOverlayShadow(scene, gnd);
      // const shadowDepthWrapper = new ShadowDepthWrapper(shaderMaterial, scene);
      // shaderMaterial.shadowDepthWrapper = shadowDepthWrapper;

      // gen.getShadowMap()?.renderList?.push(gnd);

      resolve();
    });
  });
}

function addGndOverlayShadow(scene: Scene, gnd: AbstractMesh) {
  const shadow = gnd.clone("shad", null) as Mesh;
  shadow.position.y += 0.01;
  shadow.material = new ShadowOnlyMaterial("g", scene);
  shadow.receiveShadows = true;
}

function checkerboardMaterial(scene: Scene) {
  Effect.ShadersStore["aVertexShader"] = `
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

  Effect.ShadersStore["aFragmentShader"] = `
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

  var shaderMaterial = new ShaderMaterial("a", scene, "a", {
    attributes: ["position", "uv"],
    uniforms: ["world", "worldViewProjection"],
  });

  shaderMaterial.backFaceCulling = false;
  return shaderMaterial;
}

function setupSunShadows(scene: Scene) {
  const light = scene.getLightByName("Light") as DirectionalLight;
  light.autoCalcShadowZBounds = true;
  const gen = new ShadowGenerator(4096, light);
  (window as any).gen = gen;
  gen.bias = 0.001;
  gen.filter = 4;
  scene.meshes.forEach((m) => {
    try {
      m.receiveShadows = true;
    } catch (e) {
      // some objs can't
    }
  });
}

function hideReferencePlayer(scene: Scene) {
  const playerRefModel = scene.getMeshByName("player") as Mesh;
  playerRefModel.position.y = -100;
}
