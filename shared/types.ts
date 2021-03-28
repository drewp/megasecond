import { Component } from "@trixt0r/ecs";
import { Scene } from "babylonjs";
import { UserInput } from "../client/UserInput";
import { ServerComponent } from "./ColyTypesForEntities";

export type CommonWorldRunOptions = {
  dt: number;
};

export type ClientWorldRunOptions = CommonWorldRunOptions & {
  userInput: UserInput;
  scene: Scene;
};
export type ServerWorldRunOptions = CommonWorldRunOptions & {};

export type playerSessionId = string;

export interface CtorArg {
  attr: string;
  servType: keyof ServerComponent;
}
export interface UpdateGroup  {
  attrs: string[];
  servType: keyof ServerComponent;

}
export interface Convertor {
  ctor: Component;
  ctorArgs?: CtorArg[];
  localUpdatedAttrs?: UpdateGroup[];
}