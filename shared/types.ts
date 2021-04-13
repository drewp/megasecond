import { Scene } from "babylonjs";
import { Room } from "colyseus.js";
import { World3d } from "../client/Env";
import { WorldState } from "./SyncTypes";

export type CommonWorldRunOptions = {
  dt: number;
};

export type ClientWorldRunOptions = CommonWorldRunOptions & {
  scene: Scene;
  room: Room<WorldState>;
  world3d: World3d
};
export type ServerWorldRunOptions = CommonWorldRunOptions & {};

export type playerSessionId = string;
