import { Scene } from "babylonjs";

export type CommonWorldRunOptions = {
  dt: number;
};

export type ClientWorldRunOptions = CommonWorldRunOptions & {
  scene: Scene;
};
export type ServerWorldRunOptions = CommonWorldRunOptions & {};

export type playerSessionId = string;
