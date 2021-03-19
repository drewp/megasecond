import { AbstractEntity } from "@trixt0r/ecs";

let id = 1;

export class IdEntity extends AbstractEntity {
  constructor() {
    super(id++);
  }

  localName(name: string): string {
    return name + "_e" + this.id;
  }
}
