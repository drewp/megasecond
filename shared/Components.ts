import { Component } from "@trixt0r/ecs";
import { AssetContainer, Mesh, Scene, TransformNode, Vector3 } from "babylonjs";
import { StandardMaterial } from "babylonjs/Materials/standardMaterial";
import { DynamicTexture } from "babylonjs/Materials/Textures/dynamicTexture";
import { makeObservable, observable } from "mobx";
import { IdEntity } from "./IdEntity";
import createLogger from "./logsetup";
import { Convertor } from "./SyncTypes";

const log = createLogger("component");

const isServer = typeof window === "undefined";

export class S_NetworkSession implements Component {
  public connected = true;
  constructor(public sessionId: string, public serverEntityId: string | number) {}
}
export class S_Toucher implements Component {
  // e.g. a player
  public currentlyTouching = new Set<IdEntity>();
  constructor(public posOffset: Vector3, public radius: number) {}
}

export class S_Touchable implements Component {
  // e.g. a prize
  constructor() {}
}

export class S_Sim implements Component {
  constructor(public vel: Vector3) {}
}

export class S_Transform implements Component {
  constructor(public pos: Vector3, public facing: Vector3) {
    if (isServer) {
      // need mobx to notice changes
      makeObservable(this, { pos: observable, facing: observable });
    } else {
      // dont mess up Vector3 for setting
    }
  }
  get heading(): number {
    return (360 / (2 * Math.PI)) * Math.atan2(-this.facing.z, this.facing.x) + 270;
  }
}

export class S_Twirl implements Component {
  constructor(public degPerSec = 1) {}
}

export class S_AimAt implements Component {
  // aim camera at this (child) object, e.g. player's torso instead of feet
  constructor(public objName: string) {
    // objName is some obj in the BjsModel.root hierarchy
  }
  getAimObj(entity: IdEntity, scene: Scene): TransformNode | null {
    const instancedName = entity.localName(this.objName);
    return scene.getTransformNodeByName(instancedName);
  }
}


export class S_Model implements Component {
  // this is the model to use  (e.g. says the server to the client)
  constructor(public modelPath: string) {}
}

export class S_PlayerPose implements Component {
  public waving = false;
  constructor() {
    makeObservable(this, { waving: observable });
  }
}

export class S_UsesNav implements Component {
  public currentNavFaceId = 0;
  public grounded = false;
  public nav?: string; //
  constructor() {}
}

export class S_Nametag implements Component {
  // draw nametag on this model
  public text: string = "?";
  constructor(public offset: Vector3) {
    if (isServer) {
      makeObservable(this, { text: observable, offset: observable });
    }
  }
}

export const componentConversions: { [name: string]: Convertor } = {
  S_NetworkSession: {
    ctor: S_NetworkSession,
    ctorArgs: [
      { attr: "sessionId", servType: "propString" },
      { attr: "serverEntityId", servType: "propString" },
    ],
  },
  S_Model: {
    ctor: S_Model,
    ctorArgs: [{ attr: "modelPath", servType: "propString" }],
  },
  Toucher: {
    ctor: S_Toucher,
    ctorArgs: [
      { attr: "posOffset", servType: "propV3" },
      { attr: "radius", servType: "propFloat32" },
    ],
  },
  S_AimAt: { ctor: S_AimAt, ctorArgs: [{ attr: "objName", servType: "propString" }] },
  S_Touchable: { ctor: S_Touchable },
  S_Twirl: { ctor: S_Twirl, ctorArgs: [{ attr: "degPerSec", servType: "propFloat32" }] },
  S_Transform: {
    ctor: S_Transform,
    ctorArgs: [
      { attr: "pos", servType: "propV3" },
      { attr: "facing", servType: "propV3" },
    ],
    localUpdatedAttrs: [{ servType: "propV3", attrs: ["pos", "facing"] }],
  },
  S_Sim: {
    ctor: S_Sim,
    ctorArgs: [{ attr: "vel", servType: "propV3" }],
  },
  S_Nametag: {
    ctor: S_Nametag,
    ctorArgs: [{ attr: "offset", servType: "propV3" }],
    localUpdatedAttrs: [
      { servType: "propString", attrs: ["text"] },
      { servType: "propV3", attrs: ["offset"] },
    ],
  },
  S_PlayerPose: {
    ctor: S_PlayerPose,
    localUpdatedAttrs: [{ servType: "propBoolean", attrs: ["waving"] }],
  },
};
