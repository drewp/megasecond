import { ComponentClass } from "@trixt0r/ecs";
import { Component } from "@trixt0r/ecs";
import { AbstractEntity } from "@trixt0r/ecs";
import createLogger from "./logsetup";
const log = createLogger("entity");

let id = 1;

export class IdEntity extends AbstractEntity {
  constructor() {
    super(id++); /// prob need different id spaces for server and client-local
  }

  localName(name: string): string {
    return name + "_e" + this.id;
  }

  getComponentReadonly<C extends Component, T extends C>(compClass: ComponentClass<T>): Readonly<T> {
    return this.components.get(compClass);
  }
}
