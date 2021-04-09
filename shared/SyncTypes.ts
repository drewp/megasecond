import { MapSchema, Schema, SetSchema, type } from "@colyseus/schema";
import { ComponentClass } from "@trixt0r/ecs";
import { Component } from "@trixt0r/ecs";

export interface CtorArg {
  attr: string;
  servType: keyof ServerComponent;
}
export interface UpdateGroup {
  attrs: string[];
  servType: keyof ServerComponent;
}
export interface Convertor {
  ctor: ComponentClass<Component>;
  ctorArgs?: CtorArg[];
  localUpdatedAttrs?: UpdateGroup[];
}

export class PropV3 extends Schema {
  @type("float64") x = 0;
  @type("float64") y = 0;
  @type("float64") z = 0;
}

export class ServerComponent extends Schema {
  @type({ map: PropV3 }) propV3 = new MapSchema<PropV3>();
  @type({ map: "string" }) propString = new MapSchema<string>();
  @type({ map: "int8" }) propInt8 = new MapSchema<number>();
  @type({ map: "boolean" }) propBoolean = new MapSchema<boolean>();
  @type({ map: "float32" }) propFloat32 = new MapSchema<number>();
  @type({ set: "number" }) propCurrentlyTouching = new SetSchema<number>(); // generalize
}

export class ServerEntity extends Schema {
  @type("int64") id = 0;
  @type({ map: ServerComponent }) components = new MapSchema<ServerComponent>();
}
