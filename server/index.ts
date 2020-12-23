import { monitor } from "@colyseus/monitor";
import { Server } from "colyseus";
import express from "express";
import http from "http";
import path from "path";
import { watchAndRebuildClientBundle } from "./build_client";

// import { MyRoom } from "./rooms/MyRoom";

const port = 10001;
const app = express();
app.use(express.json());
app.use("/", express.static(path.join(__dirname, "..", "dist")));
const server = http.createServer(app);
const gameServer = new Server({ server });

// register your room handlers
// gameServer.define('my_room', MyRoom);

// register colyseus monitor AFTER registering your room handlers
app.use("/colyseus", monitor());

watchAndRebuildClientBundle();

gameServer.listen(port);
console.log(`Listening on ${port}`);
