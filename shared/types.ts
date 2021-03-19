import { Scene } from "babylonjs";
import { UserInput } from "../client/UserInput";


export type CommonWorldRunOptions = {
  dt: number;
}

export type ClientWorldRunOptions = CommonWorldRunOptions & {
  userInput: UserInput;
  scene: Scene;
};
export type ServerWorldRunOptions = CommonWorldRunOptions & {
};

export type playerSessionId = string;
