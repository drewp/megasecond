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

const dir = (name: string) =>  path.join(__dirname, "..", name);

app.use("/asset_build",             express.static(dir("asset_build")));
app.use("/rollup_build/src/client", express.static(dir("client")));
app.use("/rollup_build",            express.static(dir("rollup_build")));
app.use("/lib/colyseus.js/",        express.static(dir("node_modules/colyseus.js/dist")));
app.use("/",                        express.static(dir("client_root")));

const server = http.createServer(app);

const gameServer = new Server({ server });
gameServer.define('lobby', LobbyRoom);
gameServer.define('world', WorldRoom).enableRealtimeListing();


app.use("/colyseus", monitor());
gameServer.listen(port);
console.log(`Listening on ${port}`);
