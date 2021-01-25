import { monitor } from "@colyseus/monitor";
import { Server } from "colyseus";
import express from "express";
import http from "http";
import path from "path";

 import { WorldRoom } from "../shared/WorldRoom";
import { LobbyRoom } from "colyseus";

const port = 10001;
const app = express();
app.use(express.json());
app.use("/", express.static(path.join(__dirname, "..", "dist")));
const server = http.createServer(app);

const gameServer = new Server({ server });
gameServer.define('lobby', LobbyRoom);
gameServer.define('world', WorldRoom).enableRealtimeListing();


app.use("/colyseus", monitor());
gameServer.listen(port);
console.log(`Listening on ${port}`);
