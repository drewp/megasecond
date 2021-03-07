import { AxesViewer, Color3, Mesh, MeshBuilder, Scene, StandardMaterial, TransformNode, Vector3 } from "babylonjs";
import createLogger from "logging";

const log = createLogger("Debug");

export function AddBabylonExplorer(scene: Scene) {
  scene.debugLayer
    .show({
      overlay: true,
      handleResize: true,
      globalRoot: document.querySelector("#game")! as HTMLElement,
    })
    .then(() => {
      scene.debugLayer.onPropertyChangedObservable.add((result: any) => {
        log.info(result.object.name, result.property, result.value);
      });
    });
}

export function showOrigin(scene: Scene, obj: TransformNode) {
  // not working yet
  const localOrigin = new AxesViewer(scene, /*scaleLines=*/ 0.5);
  localOrigin.xAxis.parent = obj;
  localOrigin.yAxis.parent = obj;
  localOrigin.zAxis.parent = obj;
}

export class ShowPoint {
  private m: Mesh;
  constructor(scene: Scene, color: Color3) {
    this.m = MeshBuilder.CreateSphere("debug", { segments: 5, diameter: 0.05 }, scene);
    const mat = new StandardMaterial("debug", scene);
    mat.emissiveColor = color;
    mat.disableLighting = true;
    this.m.material = mat;
  }
  set(p: Vector3) {
    this.m.isVisible = true;
    this.m.position.copyFrom(p);
  }
  unset() {
    this.m.isVisible = false;
  }
}

export class ShowSegment {
  private m: Mesh;
  private ball1: ShowPoint;
  private ball2: ShowPoint;

  constructor(scene: Scene, startBallColor: Color3, endBallColor: Color3) {
    this.ball1 = new ShowPoint(scene, startBallColor);
    this.ball2 = new ShowPoint(scene, endBallColor);
    this.m = MeshBuilder.CreateTube("debug", { path: [Vector3.Zero(), Vector3.Zero()], radius: 0.01, updatable: true }, scene);
  }
  set(p1: Vector3, p2: Vector3) {
    this.ball1.set(p1);
    this.ball2.set(p2);
    this.m.isVisible = true;
    this.m = MeshBuilder.CreateTube("debug", { path: [p1, p2], radius: 0.01, instance: this.m });
  }
  unset() {
    this.ball1.unset();
    this.ball2.unset();
    this.m.isVisible = false;
  }
}
