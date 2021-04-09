import { Scene } from "babylonjs";
import { Room } from "colyseus.js";
import { WorldState } from "./WorldRoom";

export type CommonWorldRunOptions = {
  dt: number;
};

export type ClientWorldRunOptions = CommonWorldRunOptions & {
  scene: Scene;
  room: Room<WorldState>;
};
export type ServerWorldRunOptions = CommonWorldRunOptions & {};

export type playerSessionId = string;
