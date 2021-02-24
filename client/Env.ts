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
  Vector3,
} from "babylonjs";
import { GridMaterial, ShadowOnlyMaterial, SkyMaterial } from "babylonjs-materials";

export enum GraphicsLevel {
  wire,
  grid,
  texture,
}

export class World {
  buildData: any;
  groundBump: Texture | undefined;
  constructor(public scene: Scene) {}
  async load(graphicsLevel: GraphicsLevel) {
    const scene = this.scene;
    this.buildData = await (await fetch("./asset_build/world.json")).json();

    await SceneLoader.AppendAsync("./asset_build/", "wrap.glb", scene);
    console.log("loaded gltf");

    scene.clearColor = new Color4(0.419, 0.517, 0.545, 1);

    scene.getMeshByName("player")!.isVisible = false;
    this.setupNavMesh();

    if (graphicsLevel == GraphicsLevel.wire) {
      scene.forceWireframe = true;
      return;
    }
    setupSunShadows(scene);

    scene.getLightByName("Spot")!.intensity /= 1000;
    scene.getLightByName("Spot.001")!.intensity /= 1000;
    scene.getLightByName("Spot")!.diffuse = Color3.FromHexString("#68534D");
    scene.getLightByName("Spot.001")!.diffuse = Color3.FromHexString("#730F4C");

    this.groundBump = new Texture("./asset_build/normal1.png", scene);
    this.groundBump.level = 0.43;
    this.groundBump.uScale = this.groundBump.vScale = 400;

    if (graphicsLevel == GraphicsLevel.grid) {
      const grid = new GridMaterial("grid", this.scene);
      grid.gridRatio = 0.1;
      grid.majorUnitFrequency = 5;
      grid.mainColor = new Color3(0.3, 0.3, 0.3);
      grid.backFaceCulling = false;

      for (let m of Object.keys(this.buildData.objs)) {
        try {
          this.scene.getMeshByName(m)!.material = grid;
        } catch (err) {}
      }
    } else {
      this.loadMaps(Vector3.Zero(), 100);
    }
    // this.setupSkybox(scene);
  }

  loadMaps(center: Vector3, maxDist: number) {
    for (let m of Object.keys(this.buildData.objs)) {
      if (m == "navmesh" || m == "__root__" || m == "player") {
        continue;
      }
      const obj = this.scene.getMeshByName(m);
      if (!obj) {
        console.log(`data said ${m} but no mesh found in scene`);
        continue;
      }
      const d = this.distToObject(obj, center);
      console.log(`obj ${m} is ${d} away`);
      if (d > maxDist) {
        continue;
      }

      try {
        this.assignTx(m);
      } catch (err) {
        console.log("no tx for mesh", m, err);
        continue;
      }
      if (m.startsWith("gnd.")) {
        (obj.material as PBRMaterial).bumpTexture = this.groundBump!;
      }
    }
  }

  private distToObject(m: AbstractMesh, center: Vector3) {
    const bb = this.buildData.objs[m.name].worldBbox;
    const objCenter = Vector3.FromArray(bb.center);
    return Math.max(0, objCenter.subtract(center).length() - bb.radius);
  }

  private setupSkybox(scene: Scene) {
    var skyboxMaterial = new SkyMaterial("skyMaterial", scene);
    skyboxMaterial.backFaceCulling = false;

    var skybox = Mesh.CreateBox("skyBox", 1000.0, scene);
    skybox.material = skyboxMaterial;
    skyboxMaterial.inclination = 0;
    skyboxMaterial.luminance = 1;
    skyboxMaterial.turbidity = 40;
  }

  bakedTx(name: string): Texture {
    const tx = new Texture(`./asset_build/` + name, this.scene);
    tx.vScale = -1;
    tx.coordinatesIndex = 0;
    return tx;
  }
  assignTx(objName: string) {
    const obj = this.scene.getMeshByName(objName);
    if (!obj) {
      return;
    }
    const mat = new PBRMaterial("pbr_" + objName, this.scene); //obj.material as PBRMaterial;
    obj.material = mat;
    mat.unlit = true;
    mat.albedoTexture = this.bakedTx(`bake_${objName}_dif.jpg`);
    // mat.lightmapTexture = bakedTx(`bake_${objName}_shad.jpg`);
    // mat.useLightmapAsShadowmap = true;
  }

  private setupNavMesh() {
    this.scene.getMeshByName("navmesh")!.isVisible = false;
    const grid = new GridMaterial("grid", this.scene);
    grid.gridRatio = 0.1;
    grid.majorUnitFrequency = 5;
    grid.mainColor = new Color3(0.3, 0.3, 0.3);
    grid.backFaceCulling = false;
    grid.wireframe = true; // maybe
    this.scene.getMeshByName("navmesh")!.material = grid;
  }
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
