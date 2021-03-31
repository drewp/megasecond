import { Engine as EcsEngine } from "@trixt0r/ecs";
import { Color4, Engine as BabylonEngine, Scene } from "babylonjs";
import { EventEmitter, GoldenLayout, LayoutConfig } from "golden-layout";
import { dumpWorld } from "../shared/EcsOps";
import { AddBabylonExplorer } from "./Debug";

export function setupScene(canvasId: string, resizeEvents: EventEmitter): Scene {
  const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
  const engine = new BabylonEngine(canvas, /*antialias=*/ true);
  const scene = new Scene(engine);
  (window as any).scene = scene;
  scene.clearColor = new Color4(0, 0, 0, 0);
  const handleResize = engine.resize.bind(engine);
  window.addEventListener("resize", handleResize);
  resizeEvents.addEventListener("resize", handleResize);
  if (location.hash.indexOf("explor") != -1) {
    AddBabylonExplorer(scene);
  }
  canvas.addEventListener("pointerdown", engine.enterPointerlock.bind(engine));

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

export function initPanesLayout(parent: HTMLElement, world: EcsEngine, resizeEvents: EventEmitter) {
  const layout = new GoldenLayout(parent);
  layout.getComponentEvent = (container, itemConfig) => {
    switch (itemConfig.componentType) {
      case "game": {
        const c = document.createElement("canvas");
        c.setAttribute("id", "renderCanvas");
        container.element.appendChild(c);
        container.addEventListener("resize", () => {
          resizeEvents.emit("resize");
        });
        break;
      }
      case "ecs": {
        const debug = document.createElement("div");
        debug.setAttribute("id", "debug");
        container.element.appendChild(debug);
        initEcsDebugPane(debug, world);
        // todo- on removeComponent (or it's out of sight), stop the updating
        break;
      }
    }
  };

  layout.loadLayout({
    settings: {
      showPopoutIcon: false,
    },
    root: {
      type: "row",
      content: [
        { type: "component", componentType: "game" },
        { type: "component", componentType: "ecs", width: 20 },
      ],
    },
  });
}

function initEcsDebugPane(debug: HTMLDivElement, world: EcsEngine) {
  const updateDebug = () => {
    debug.innerHTML = "";
    const write = (line: string) => {
      const div = document.createElement("div");
      div.innerText = line;
      debug.appendChild(div);
    };
    dumpWorld(world, write);
  };
  setInterval(updateDebug, 2000);
}

