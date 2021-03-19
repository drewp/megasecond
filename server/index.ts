import { monitor } from "@colyseus/monitor";
import { Engine } from "@trixt0r/ecs";
import { LobbyRoom, Server } from "colyseus";
import express from "express";
import { encode } from "html-entities";
import http from "http";
import path from "path";
import createLogger from "../shared/logsetup";
import { WorldRoom } from "../shared/WorldRoom";

const log = createLogger("server");

const port = 10001;
const app = express();
app.use(express.json());

const dir = (name: string) => path.join(__dirname, "..", name);

function ecsDump(world: Engine): string[] {
  const out: string[] = [];
  const write = (s: string) => {
    out.push(s + "\n");
  };
  world.entities.forEach((e) => {
    write(`entity ${e.id}`);
    e.components.sort((a, b) => (a.constructor.name < b.constructor.name ? -1 : 1));
    e.components.forEach((comp) => {
      write(`  component ${comp.constructor.name}`);
      for (let prop in comp) {
        const v = comp[prop].toString();
        if (v.match(/\[object/)) {
          write(`    ${prop} (obj)`); //, comp[prop]);
        } else {
          write(`    ${prop} ${v}`);
        }
      }
    });
  });
  return out;
}

const entitiesViewer = (_req: express.Request, res: express.Response) => {
  const currentRoom: WorldRoom = (global as any).currentRoom;
  if (!currentRoom) {
    res.send("no current room");
    return;
  }
  const lines = ecsDump(currentRoom.world!);

  res.write("<pre>");
  lines.forEach((line) => res.write(encode(line)));
  res.write("</pre>");
  res.send();
};

app.use("/asset_build", express.static(dir("asset_build")));
app.use("/rollup_build/src/client", express.static(dir("client")));
app.use("/rollup_build", express.static(dir("rollup_build")));
app.use("/lib/colyseus.js/", express.static(dir("node_modules/colyseus.js/dist")));
app.use("/lib/@trixt0r/ecs/", express.static(dir("node_modules/@trixt0r/ecs/build")));
app.get("/entities/", entitiesViewer);
app.use("/", express.static(dir("client_root")));

const server = http.createServer(app);

const gameServer = new Server({ server });
gameServer.define("lobby", LobbyRoom);
gameServer.define("world", WorldRoom).enableRealtimeListing();
log.info("defined game world");

app.use("/colyseus", monitor());
gameServer.listen(port);
log.info(`Listening on ${port}`);
