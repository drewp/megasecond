import { monitor } from "@colyseus/monitor";
import { LobbyRoom, Server } from "colyseus";
import express from "express";
import { encode } from "html-entities";
import http from "http";
import path from "path";
import { dumpWorld, LineType } from "../shared/EcsOps";
import createLogger from "../shared/logsetup";
import { WorldRoom } from "./WorldRoom";

const log = createLogger("server");

const port = 10002;
const app = express();
app.use(express.json());

const dir = (name: string) => path.join(__dirname, "..", name);

const entitiesViewer = (_req: express.Request, res: express.Response) => {
  const currentRoom: WorldRoom = (global as any).currentRoom;
  if (!currentRoom) {
    res.send("no current room");
    return;
  }
  res.write("<pre>");
  const write = (_lineType: LineType, s: string) => res.write(encode(s + "\n"));
  dumpWorld(currentRoom.world!, write);
  res.write("</pre>");
  res.send();
};

const root = "/server/";
app.get(root + "entities/", entitiesViewer);
app.use(root + "asset_build", express.static(dir("asset_build")));
app.use(root + "lib/@trixt0r/ecs/", express.static(dir("node_modules/@trixt0r/ecs/build")));
app.use(root + "lib/babylonjs-loaders/", express.static(dir("node_modules/babylonjs-loaders")));
app.use(root + "lib/babylonjs-materials/", express.static(dir("node_modules/babylonjs-materials")));
app.use(root + "lib/babylonjs/", express.static(dir("node_modules/babylonjs")));
app.use(root + "lib/colyseus.js/", express.static(dir("node_modules/colyseus.js/dist")));
app.use(root + "lib/golden-layout/", express.static(dir("node_modules/golden-layout/dist")));
app.use(root + "lib/mobx/", express.static(dir("node_modules/mobx/dist")));

app.get(root, (_, res) => {
  res.write("megasecond server");
  res.send();
});

const server = http.createServer(app);

const gameServer = new Server({ server });
gameServer.define("lobby", LobbyRoom);
gameServer.define("world", WorldRoom).enableRealtimeListing();
log.info("defined game world");

app.use(root + "colyseus", monitor());
gameServer.listen(port);
log.info(`Listening on ${port}`);
