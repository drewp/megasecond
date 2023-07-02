// game environment, not code environment

import {
  AbstractMesh,
  Color3,
  Color4,
  DirectionalLight,
  InstancedMesh,
  Matrix,
  Mesh,
  PBRMaterial,
  Scene,
  SceneLoader,
  ShadowGenerator,
  Texture,
  TransformNode,
  Vector3,
} from "babylonjs";
import { GridMaterial, SkyMaterial } from "babylonjs-materials";
import { AssetContainer } from "babylonjs/assetContainer";
import createLogger from "../shared/logsetup";

const log = createLogger("Env");
log.info = () => {};

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

export class Instance {
  // like an BABYLON.AssetContainer but with a TransformNode at the root, and async loading (child objects may not be there yet)
  public root: TransformNode;
  constructor(private owner: Collection, public name: string, public loaded: Promise<void>, public scene: Scene) {
    this.root = new TransformNode(name, scene);
    loaded.then(() => this.onContainerLoaded(this.owner.container!));
  }
  toString() {
    return `Instance ${this.name} of ${this.owner.path}`;
  }
  private makeName(s: string) {
    return this.name + "_" + s;
  }
  onContainerLoaded(ctr: AssetContainer) {
    const newInstances = ctr.instantiateModelsToScene(this.makeName.bind(this));
    newInstances.rootNodes.forEach((m) => {
      if (m.name == this.makeName("__root__")) {
        m.name = m.id = this.makeName("blender_coords");
        m.parent = this.root;
      }
    });
    // see assetContainer.ts addAllToScene for these other object types
    ctr.lights.forEach((o) => {
      this.scene.addLight(o);
      // light seems to work, though its hierarchy doesn't make it into bjs inspector
    });

    if (this.owner.graphicsLevel == GraphicsLevel.texture) {
      this.applyShadowmaps();
    }
  }
  dispose() {
    // todo- kill any unfired onContainerLoaded callbacks (we could get disposed
    // before being loaded)
    this.root.dispose();
    //   inst.node.getDescendants().forEach((obj) => obj.dispose()); // needed?

    this.owner._instanceDisposed(this);
  }

  setTransform(mat: Matrix) {
    this.root.setPreTransformMatrix(mat);
  }

  getChildTransformNode(objName: string) {
    return this.scene.getTransformNodeByName(this.makeName(objName));
  }

  applyShadowmaps() {
    // todo- this really is a per-instance thing, even if the code doesn't work that
    // way yet.

    // a src/Materials/effect.ts gets to munge the glsl code, so that could be a
    // way to jam in a separate-lightmap-tx-per-instance feature.

    for (let m of this.root.getDescendants() as InstancedMesh[]) {
      // todo- this is the bug- the material is shared across instances, but the shadow maps will vary
      const mat = m.material as PBRMaterial | null;
      if (!mat) continue;

      const path = this.owner.path;
      const instances = this.owner.owner;
      const sourceName = (m.sourceMesh ? m.sourceMesh.name : m.name).replace(new RegExp("^" + this.name + "_"), "");
      if (path == "model/env/gnd.glb" && sourceName != "gnd.023") continue;

      mat.emissiveTexture = instances.bakedTx(`map/bake/${this.name}/${sourceName}_dif.jpg`);
      mat.emissiveTexture.coordinatesIndex = 1; // lightmap
      mat.emissiveColor = Color3.White();

      mat.lightmapTexture = instances.bakedTx(`map/bake/${this.name}/${sourceName}_shad.jpg`);
      if (this.name == "sign.001") (window as any).lm = mat.lightmapTexture;
      mat.lightmapTexture.coordinatesIndex = 1; // lightmap
      mat.lightmapTexture.gammaSpace = true;

      // https://github.com/BabylonJS/Babylon.js/blob/master/src/Shaders/ShadersInclude/pbrBlockFinalColorComposition.fx
      // false: add lightmapcolor; true: multiply lightmapcolor
      mat.useLightmapAsShadowmap = true;
    }
  }
}

class Collection {
  // 1 blender scene, 1 blender collection, multiple objects. Can be instanced multiple times in bjs scene.
  container?: AssetContainer;
  collectionLoaded: Promise<void>;
  private insts: Map<string, Instance> = new Map(); // by instance name
  constructor(public owner: Instances, public path: string, public scene: Scene, public graphicsLevel: GraphicsLevel) {
    this.collectionLoaded = new Promise((res, _rej) => {
      SceneLoader.LoadAssetContainerAsync("./asset_build/", path, scene).then((ctr) => {
        this.container = ctr;
        res();
      });
    });
  }

  makeInstance(name: string): Instance {
    log.info(`    Collection(${this.path}).makeInstance(${name})`);
    const inst = new Instance(this, name, this.collectionLoaded, this.scene);
    // this.instsWaitingForAssets.add(inst);
    return inst;
  }

  _instanceDisposed(inst: Instance) {
    this.insts.delete(inst.name);
  }

  getInstance(name: string): Instance | undefined {
    return this.insts.get(name);
  }
}

class Instances {
  // owns all the Collections and Instances and Textures in the scene
  private collsByPath: Map<string, Collection> = new Map();
  private collsByInstance: Map<string, Collection> = new Map();
  private textures: Map<string, Texture> = new Map();
  constructor(public scene: Scene, public graphicsLevel: GraphicsLevel) {}

  // returns transformable instance immediately, even if load goes async
  makeInstance(path: string, instanceName: string): Instance {
    log.info(`  makeInstance(${path}, ${instanceName})`);

    let col = this.collsByPath.get(path);
    if (!col) {
      col = new Collection(this, path, this.scene, this.graphicsLevel);
      this.collsByPath.set(path, col);
    }

    this.collsByInstance.set(instanceName, col);
    return col.makeInstance(instanceName);
  }

  bakedTx(path: string): Texture {
    let tx = this.textures.get(path);
    if (!tx) {
      tx = new Texture(`./asset_build/` + path, this.scene);
      tx.vScale = -1;
      tx.coordinatesIndex = 0;
      this.textures.set(path, tx);
    }
    return tx;
  }
  getInstance(instanceName: string): Instance | undefined {
    return this.collsByInstance.get(instanceName)?.getInstance(instanceName);
  }

  allInstanceNames(): string[] {
    // needs a tag for 'env only'
    return Array.from(this.collsByInstance.keys());
  }

  removeInstance(instanceName: string) {
    this.getInstance(instanceName)?.dispose();
    // this might make a Collection clean up, which we don't get notice in this class
  }

  reloadFile(path: string) {
    // todo- have the builder tell us (via a colyseus message) that a glb has been updated
  }
}

export class World3d {
  buildData: any;
  groundBump: Texture;
  instances: Instances;
  constructor(public scene: Scene, public graphicsLevel: GraphicsLevel) {
    this.graphicsLevel = graphicsLevel;
    this.instances = new Instances(scene, this.graphicsLevel);

    SceneLoader.ShowLoadingScreen = false;
    scene.clearColor = new Color4(0.419, 0.517, 0.545, 1);

    this.groundBump = new Texture("./asset_build/map/normal1.png", scene);
    this.groundBump.level = 0.43;
    this.groundBump.uScale = this.groundBump.vScale = 400;

    function setupSunShadows(scene: Scene, name = "light_sun_light") {
      const light = scene.getLightByName(name) as DirectionalLight;
      light.autoCalcShadowZBounds = true;
      const gen = new ShadowGenerator(4096, light);
      (window as any).gen = gen;
      gen.bias = 0.001;
      gen.filter = 6;
      gen.filteringQuality = 1;
      scene.meshes.forEach((m) => {
        try {
          m.receiveShadows = true;
        } catch (e) {
          // some objs can't
        }
      });
    }

    // this.setupSkybox(scene);
  }

  async loadNavmesh() {
    await SceneLoader.AppendAsync("./asset_build/", "model/env/navmesh.glb", this.scene);
    const nav = this.scene.getMeshByName("navmesh") as Mesh;
    nav.updateFacetData();

    nav.isVisible = false;

    const grid = new GridMaterial("grid", this.scene);
    grid.gridRatio = 0.1;
    grid.majorUnitFrequency = 5;
    grid.mainColor = new Color3(0.3, 0.3, 0.3);
    grid.backFaceCulling = false;
    grid.wireframe = true; // maybe
    nav.material = grid;
  }

  async reloadLayoutInstances() {
    // read updates from layout.json but not necessarily from model glb files
    const layout = (await (await fetch("./asset_build/layout.json")).json()) as LayoutJson;
    const noLongerPresent = new Set<string>(this.instances.allInstanceNames());
    const allLoads: Promise<void>[] = [];
    for (let instDesc of layout.instances) {
      let inst = this.instances.getInstance(instDesc.name);
      if (!inst) {
        inst = this.instances.makeInstance(instDesc.model, instDesc.name);
      }
      allLoads.push(inst.loaded);
      noLongerPresent.delete(instDesc.name);
      inst.setTransform(Matrix.FromArray(instDesc.transform_baby));
    }
    for (let name of noLongerPresent) {
      log.info(`cleaning up collection ${name}`);
      this.instances.removeInstance(name);
    }
    await Promise.all(allLoads);
    this.postEnvLoad();
  }

  private postEnvLoad() {
    // this.scene.meshes.forEach((m) => {
    //   if (m.name == "rock_arch_obj" || m.name == "stair_base" || m.name == "signpost") {
    //     const sunCaster = (window as any).gen as ShadowGenerator; // todo
    //     if (sunCaster) {
    //       sunCaster.addShadowCaster(m);
    //     }
    //   }
    // });

    switch (this.graphicsLevel) {
      case GraphicsLevel.wire:
        this.scene.forceWireframe = true;
        break;
      case GraphicsLevel.grid:
        this.gridEverything();
        break;
      case GraphicsLevel.texture:
        (this.scene.getMaterialByName("gnd") as PBRMaterial).bumpTexture = this.groundBump!;
        break;
    }
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

  private setupSkybox(scene: Scene) {
    var skyboxMaterial = new SkyMaterial("skyMaterial", scene);
    skyboxMaterial.backFaceCulling = false;

    var skybox = Mesh.CreateBox("skyBox", 1000.0, scene);
    skybox.material = skyboxMaterial;
    skyboxMaterial.inclination = 0;
    skyboxMaterial.luminance = 1;
    skyboxMaterial.turbidity = 40;
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
