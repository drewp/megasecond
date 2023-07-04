import { Engine as EcsEngine } from "@trixt0r/ecs";
import { Color4, Engine as BabylonEngine, Scene } from "babylonjs";
import { EventEmitter, GoldenLayout } from "golden-layout";
import { dumpWorld, LineType } from "../shared/EcsOps";
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

  const url = new URL(window.location.href);
  const qparams = url.searchParams;
  if (qparams.get("explore")) {
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
        debug.classList.add('scrolly');
        container.element.appendChild(debug);
        initEcsDebugPane(debug, world);
        // todo- on removeComponent (or it's out of sight), stop the updating
        break;
      }
      case "links": {
        const urlWith = (k: string, v: string) => {
          const url = new URL(window.location.href);
          const qparams = url.searchParams;
          qparams.set(k, v);
          return url.toString();
        };
        container.element.innerHTML = `
        <div class="scrolly">
          <div><a href="/log/server/" target="_blank">Server log</a></div>
          <div><a href="/log/rebuild/" target="_blank">Client rebuild log</a></div>
          <div><a href="/server/colyseus/" target="_blank">Colyseus inspector</a></div>
          <div><a href="/server/entities/" target="_blank">Server entity dump</a></div>
          <div>Reload with graphicsLevel = 
            <a href="${urlWith("gl", "wire")}">wire</a> |
            <a href="${urlWith("gl", "grid")}">grid</a> |
            <a href="${urlWith("gl", "texture")}">texture</a>
          </div>
          <div>Reload with <a href="${urlWith("explore", "1")}">Babylonjs inspector</a>
        </div>
        `;
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
        {
          type: "column",
          width: 20,
          content: [
            { type: "component", componentType: "links", height: 10 },
            { type: "component", componentType: "ecs" },
          ],
        },
      ],
    },
  });
}

function initEcsDebugPane(debug: HTMLDivElement, world: EcsEngine) {
  const updateDebug = () => {
    debug.innerHTML = "";
    const write = (lineType: LineType, line: string) => {
      const div = document.createElement("div");
      div.innerText = line;
      div.classList.add("ecs" + lineType);
      debug.appendChild(div);
    };
    dumpWorld(world, write);
  };
  setInterval(updateDebug, 2000);
}
