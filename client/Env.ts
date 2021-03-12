// game environment, not code environment

import {
  AbstractMesh,
  Color3,
  Color4,
  DirectionalLight,
  Effect,
  Matrix,
  Mesh,
  PBRMaterial,
  Scene,
  SceneLoader,
  ShaderMaterial,
  ShadowGenerator,
  Texture,
  TransformNode,
  Vector3,
} from "babylonjs";
import { GridMaterial, SkyMaterial } from "babylonjs-materials";
import createLogger from "../shared/logsetup";

const log = createLogger("Env");

export enum GraphicsLevel {
  wire,
  grid,
  texture,
}

interface LayoutInstance {
  name: string;
  model: string;
  transform_baby: number[];
}
interface LayoutJson {
  instances: LayoutInstance[];
}

function setWorldMatrix(node: TransformNode, baby_mat: Matrix) {
  // todo
  // const pos = baby_mat.getTranslation();
  // node.position = pos;

  // node.freezeWorldMatrix(baby_mat)
  node.setPivotMatrix(baby_mat, false);
}

export class World {
  buildData: any;
  groundBump: Texture | undefined;
  graphicsLevel: GraphicsLevel = GraphicsLevel.grid;
  loaded: TransformNode[] = [];
  constructor(public scene: Scene) {}
  disposeLoaded() {
    this.loaded.forEach((n) => n.dispose());
    this.loaded = [];
  }
  async reloadLayoutInstances() {
    const scene = this.scene;

    const layout = (await (await fetch("./asset_build/layout.json")).json()) as LayoutJson;
    this.disposeLoaded();
    for (let inst of layout.instances) {
      // if (inst.name != 'rock_arch') continue;
      const node = new TransformNode("inst_" + inst.name, scene);
      this.loaded.push(node);
      const mat = Matrix.FromArray(inst.transform_baby);
      log.info("mat", mat.toArray());
      const loaded = await SceneLoader.ImportMeshAsync("", "./asset_build/", inst.model, scene);
      loaded.meshes.forEach((m) => {
        if (m.name == "__root__") {
          m.name = m.id = "blender_coords";
          m.parent = node;
        }
      });
      setWorldMatrix(node, mat);
      log.info(inst.name, node.computeWorldMatrix().toArray());
    }
    this.postEnvLoad();
  }
  async load(graphicsLevel: GraphicsLevel) {
    const scene = this.scene;
    this.graphicsLevel = graphicsLevel;

    SceneLoader.ShowLoadingScreen = false;
    scene.clearColor = new Color4(0.419, 0.517, 0.545, 1);

    await SceneLoader.AppendAsync("./asset_build/", "model/player/player.glb", scene);
    scene.getMeshByName("player")!.isVisible = false;

    await SceneLoader.AppendAsync("./asset_build/", "model/env/navmesh.glb", scene);
    this.setupNavMesh();

    await this.reloadLayoutInstances();

    // setupSunShadows(scene);

    this.groundBump = new Texture("./asset_build/map/normal1.png", scene);
    this.groundBump.level = 0.43;
    this.groundBump.uScale = this.groundBump.vScale = 400;

    // this.setupSkybox(scene);
  }
  private postEnvLoad() {
    if (this.graphicsLevel == GraphicsLevel.wire) {
      this.scene.forceWireframe = true;
      return;
    }
    this.gridEverything();
    if (this.graphicsLevel == GraphicsLevel.grid) {
      // show grid first even if maps are coming
    } else {
      // to rewrite // this.loadMaps(Vector3.Zero(), 100);
    }
  }

  async loadObj(name: string): Promise<Mesh> {
    const fn = `model/prop/${name}.glb`;
    await SceneLoader.AppendAsync("./asset_build/", fn, this.scene);
    const ret = this.scene.getMeshByName(name);
    if (!ret) {
      throw new Error(`file ${fn} did not provide object ${name}`);
    }
    const junkRoot = ret.parent;
    ret.parent = null;
    junkRoot?.dispose();
    return ret as Mesh;
  }
  gridEverything() {
    const grid = new GridMaterial("grid", this.scene);
    grid.gridRatio = 0.1;
    grid.majorUnitFrequency = 5;
    grid.mainColor = new Color3(0.3, 0.3, 0.3);
    grid.backFaceCulling = false;

    for (let m of this.scene.meshes) {
      try {
        m.material = grid;
      } catch (err) {}
    }
  }

  loadMaps(center: Vector3, maxDist: number) {
    let objsInRange = 0,
      objsTooFar = 0;

    for (let m of Object.keys(this.buildData.objs)) {
      if (m == "navmesh" || m == "__root__" || m == "player") {
        continue;
      }
      const obj = this.scene.getMeshByName(m);
      if (!obj) {
        log.info(`data said ${m} but no mesh found in scene`);
        continue;
      }
      const d = this.distToObject(obj, center);
      if (d > maxDist) {
        objsTooFar += 1;
        continue;
      }
      objsInRange += 1;

      try {
        this.assignTx(m);
      } catch (err) {
        log.info("no tx for mesh", m, err);
        continue;
      }
      if (m.startsWith("gnd.")) {
        (obj.material as PBRMaterial).bumpTexture = this.groundBump!;
      }
    }
    log.info(`loaded textures for ${objsInRange}, skipped ${objsTooFar} objs`);
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
    if (!obj.material) {
      // couldn't take the grid material earlier
      return;
    }
    const mat = new PBRMaterial("pbr_" + objName, this.scene); //obj.material as PBRMaterial;
    mat.unlit = true;
    mat.albedoTexture = this.bakedTx(`bake/${objName}_dif.jpg`);
    mat.albedoTexture.coordinatesIndex = 1; // lightmap
    // mat.lightmapTexture = bakedTx(`bake_${objName}_shad.jpg`);
    // mat.useLightmapAsShadowmap = true;
    Texture.WhenAllReady([mat.albedoTexture], () => {
      // log.info("objname", objName);
      try {
        obj.material = mat;
      } catch (e) {
        log.error(e); // another instance of a repeated object?
      }
    });
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
