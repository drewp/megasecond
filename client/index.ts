import {
  // Color3,
  Color4,
  DirectionalLight,
  Engine,
  FreeCamera,
  HemisphericLight,
  // Mesh,
  Scene,
  SceneLoader,
  ShadowGenerator,
  SpotLight,
  // StandardMaterial,
  // Texture,
  Vector3,
} from "babylonjs";
// import { Schema, type, MapSchema } from "@colyseus/schema";
import * as Colyseus from "colyseus.js";
import { WorldRoom, WorldState } from "../shared/WorldRoom";

function statusPlayer(player: string) {
  (document.querySelector("#me")! as HTMLElement).innerText = player;
}
function statusConnection(c: string) {
  (document.querySelector("#connection")! as HTMLElement).innerText = c;
}

async function go() {
  console.log("connect C client");
  statusPlayer("...");
  statusConnection("connecting...");
  const client = new Colyseus.Client("wss://bigasterisk.com/megasecond/");

  const world = await client.joinOrCreate<WorldRoom>("world", { name: "p" + Math.round(Math.random() * 10000) });
  statusConnection("connected.");

  world.onMessage("*", (a, b) => {
    console.log("world msg", a, b);
  });
  (window as any).world = world;

  const worldState: WorldState = (world.state as unknown) as any;

  worldState.players.onAdd = (player: any, sessionId: any) => {
    if (world.sessionId === sessionId) {
      statusPlayer(player.name);
      statusConnection(`connected (${Array.from(worldState.players.keys()).length} players)`);
      world.send("playerMove", { x: 5, y: 6 });
    } else {
      console.log("It's an opponent", player.name, sessionId);
      statusConnection(`connected (${Array.from(worldState.players.keys()).length} players)`);
    }
  };

  worldState.players.onRemove = function (player: any, sessionId: any) {
    console.log("bye", player, sessionId);
    statusConnection(`connected (${Array.from(worldState.players.keys()).length} players)`);
  };

  //     // const playerViews: { [id: string]: Mesh } = {};

  //     room.state.players.onAdd = function(player: any, key:any) {
  //       console.log('add', player, key);
  //     //     // Our built-in 'sphere' shape. Params: name, subdivs, size, scene
  //     //     playerViews[key] = BABYLON.Mesh.CreateSphere("sphere1", 16, 2, scene);

  //     //     // Move the sphere upward 1/2 its height
  //     //     playerViews[key].position.set(player.position.x, player.position.y, player.position.z);

  //     //     // Update player position based on changes from the server.
  //     //     player.position.onChange = () => {
  //     //         playerViews[key].position.set(player.position.x, player.position.y, player.position.z);
  //     //     };

  //     //     // Set camera to follow current player
  //     //     if (key === room.sessionId) {
  //     //         camera.setTarget(playerViews[key].position);
  //     //     }
  //     //     room.send('key', 'hi');
  //     };

  //     // room.state.players.onRemove = function(player, key) {
  //     //     scene.removeMesh(playerViews[key]);
  //     //     delete playerViews[key];
  //     // };

  //     // room.onStateChange((state) => {
  //     //   console.log("New room state:", state.toJSON());
  //     // });
  //   })
  //   .catch((err) => {
  //     console.log(err);
  //   });

  const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;
  const engine = new Engine(canvas, /*antialias=*/ true);
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0, 0, 0, 0);

  SceneLoader.Append("./asset/", "mystery_door.glb", scene, (scene) => {
    (window as any).scene = scene;
    scene.switchActiveCamera(scene.cameras[0]);
    console.log("loaded gltf");
    try {
      const light = scene.getLightByName("Light")!;
      const gen = new ShadowGenerator(2048, light as SpotLight);
      gen.bias = 0.01;
      gen.addShadowCaster(scene.getMeshByName("mysterious_house")!, true);
      scene.meshes.forEach((m) => {
        try {
          m.receiveShadows = true;
        } catch (e) {
          // some objs can't
        }
      });

      const inner = scene.getLightByName("Spot");
      const gen2 = new ShadowGenerator(1024, inner as SpotLight);
      for (let name of ["mysterious_house", "doorframe", "Text"]) {
        gen2.addShadowCaster(scene.getMeshByName(name)!, true);
      }
    } catch (err) {
      console.log("babylon won't say the error was", err);
      throw err;
    }
    engine.runRenderLoop(() => {
      scene.render();
    });
  });
}

go();
