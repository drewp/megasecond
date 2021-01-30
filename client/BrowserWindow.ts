import { Color4, Engine, Scene } from "babylonjs";
import { AddBabylonExplorer } from "./Debug";

export function setupScene(canvasId: string): Scene {
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

export class StatusLine {
  setPlayer(player: string) {
    (document.querySelector("#me")! as HTMLElement).innerText = player;
  }
  setConnection(c: string) {
    (document.querySelector("#connection")! as HTMLElement).innerText = c;
  }
}