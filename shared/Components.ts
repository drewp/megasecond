import { Component } from "@trixt0r/ecs";
import { AssetContainer, Mesh, Scene, TransformNode, Vector3 } from "babylonjs";
import { IdEntity } from "./IdEntity";
import createLogger from "./logsetup";
import { Player as NetPlayer } from "./WorldRoom";

const log = createLogger("component");

export class InitJump implements Component {
  constructor() {}
}

export class Toucher implements Component {
  // e.g. a player
  constructor(public posOffset: Vector3, public radius: number, public currentlyTouching: Set<IdEntity>) {}
}

export class Touchable implements Component {
  // e.g. a prize
  constructor() {}
}

export class Transform implements Component {
  constructor(public pos: Vector3, public vel: Vector3, public facing: Vector3) {}
  get heading(): number {
    return (360 / (2 * Math.PI)) * Math.atan2(-this.facing.z, this.facing.x) + 270;
  }
}

export class Twirl implements Component {
  constructor(public degPerSec = 1) {}
}

export class InitNametag implements Component {
  // i want a nametag
  constructor(public offsetY = 20, public netPlayer: NetPlayer) {}
}

export class AimAt implements Component {
  // aim camera at this (child) object, e.g. player's torso instead of feet
  constructor(public objName: string) {
    // objName is some obj in the BjsMesh hierarchy
  }
  getAimObj(entity: IdEntity, scene: Scene): TransformNode | null {
    const instancedName = entity.localName(this.objName);
    return scene.getTransformNodeByName(instancedName);
  }
}

export enum LoadState {
  NONE,
  STARTED_GET,
  LOADED,
}

export class BjsMesh implements Component {
  public root?: TransformNode;
  public loadState = LoadState.NONE;
  public container?: AssetContainer;
  constructor(public objName: string) {}
  dispose() {
    this.root?.dispose();
  }
}

export class UsesNav implements Component {
  public currentNavFaceId = 0;
  public grounded = false;
  constructor(public nav: Mesh) {}
}
