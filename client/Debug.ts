import { Scene } from "babylonjs";

export function AddBabylonExplorer(scene: Scene) {
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
