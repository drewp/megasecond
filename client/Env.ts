// game environment, not code environment

import {
  AbstractMesh,
  Color3,
  Color4,
  DirectionalLight,
  Effect,
  Material,
  Mesh,
  PBRBaseSimpleMaterial,
  PBRMaterial,
  PBRSpecularGlossinessMaterial,
  Scene,
  SceneLoader,
  ShaderMaterial,
  ShadowGenerator,
  StandardMaterial,
  Texture,
} from "babylonjs";
import { GridMaterial, ShadowOnlyMaterial, SkyMaterial } from "babylonjs-materials";

export async function loadEnv(scene: Scene) {
  return new Promise<void>((resolve, reject) => {
    SceneLoader.Append("./asset_build/", "wrap.glb", scene, (_scene) => {
      console.log("loaded gltf");
      try {
        scene.clearColor = new Color4(0.419, 0.517, 0.545, 1);

        scene.getMeshByName("player")!.isVisible = false;
        scene.getMeshByName("navmesh")!.isVisible = false;
        const grid = new GridMaterial("grid", scene);
        grid.gridRatio = 0.1;
        grid.majorUnitFrequency = 5;
        grid.mainColor = new Color3(0.3, 0.3, 0.3);
        grid.backFaceCulling = false;
        grid.wireframe = true; // maybe
        scene.getMeshByName("navmesh")!.material = grid;

        setupSunShadows(scene);

        const gnd = scene.getMeshByName("gnd.001")!;
        const mat = gnd.material as PBRMaterial;

        const bump = new Texture("./asset_build/normal1.png", scene);
        bump.level = 0.43;
        bump.uScale = bump.vScale = 400;
        mat.bumpTexture = bump;

        gnd.material = mat;

        scene.getLightByName("Spot")!.intensity /= 1000;
        scene.getLightByName("Spot.001")!.intensity /= 1000;
        scene.getLightByName("Spot")!.diffuse = Color3.FromHexString("#68534D");
        scene.getLightByName("Spot.001")!.diffuse = Color3.FromHexString("#730F4C");

        const bakedTx = (name: string): Texture => {
          const tx = new Texture(`./asset_build/` + name, scene);
          tx.vScale = -1;
          return tx;
        };

        const assignTx = (objName: string) => {
          const obj = scene.getMeshByName(objName);
          if (!obj) {
            return;
          }
          const mat = new PBRMaterial("pbr_" + objName, scene); //obj.material as PBRMaterial;
          obj.material = mat;
          mat.unlit = true;
          mat.albedoTexture = bakedTx(`bake_${objName}_dif.jpg`);
          // mat.lightmapTexture = bakedTx(`bake_${objName}_shad.jpg`);
          // mat.useLightmapAsShadowmap = true;
        };

        for (var m of scene.meshes) {
          if (m.name == "navmesh") {
            continue;
          }
          try {
            assignTx(m.name);
          } catch (err) {
            console.log("no tx for mesh", m, err);
          }
        }

        if (0) {
          var skyboxMaterial = new SkyMaterial("skyMaterial", scene);
          skyboxMaterial.backFaceCulling = false;

          var skybox = Mesh.CreateBox("skyBox", 1000.0, scene);
          skybox.material = skyboxMaterial;
          skyboxMaterial.inclination = 0;
          skyboxMaterial.luminance = 1;
          skyboxMaterial.turbidity = 40;
        }
      } catch (err) {
        console.log("err", err);
        reject();
        return;
      }
      resolve();
    });
  });
}

export function toggleNavmeshView(scene: Scene) {
  const n = scene.getMeshByName("navmesh")!;
  n.isVisible = !n.isVisible;

  for (let m of scene.meshes) {
    if (["gnd.023", "stair", "buildings"].indexOf(m.name) != -1) {
      m.isVisible = !n.isVisible;
    }
  }
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
  const light = scene.getLightByName("light_sun_light") as DirectionalLight;
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
