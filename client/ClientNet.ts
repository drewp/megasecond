import { Component } from "@trixt0r/ecs";
import { Vector3 } from "babylonjs";
import { Player as NetPlayer, WorldState } from "../shared/WorldRoom";
import * as Colyseus from "colyseus.js";
import { AbstractEntitySystem } from "@trixt0r/ecs";
import { IdEntity } from "../shared/IdEntity";
import { ClientWorldRunOptions } from "../shared/types";
import { Transform } from "../shared/Transform";

export class ServerRepresented implements Component {
  public lastSentTime = 0; // ms
  public lastSent: any;
  public receivedPos = Vector3.Zero();
  public receivedFacing = Vector3.Forward();
  constructor(
    public worldRoom: Colyseus.Room<WorldState>,
    public netPlayer: NetPlayer // with latest server state
  ) {}
}

export class ServerReceive extends AbstractEntitySystem<IdEntity> {
  constructor(priority: number) {
    super(priority, [ServerRepresented, Transform]);
  }
  
  processEntity(entity: IdEntity, _index: number, _entities: unknown, _options: ClientWorldRunOptions) {
    const sr = entity.components.get(ServerRepresented);
    const np = sr.netPlayer;
    // this is rewriting a lot- we could use a watcher on the colyseus half
    sr.receivedPos = new Vector3(np.x, np.y, np.z);
    sr.receivedFacing = new Vector3(np.facingX, np.facingY, np.facingZ);
  }
}

export class CorrectLocalSimulation extends AbstractEntitySystem<IdEntity> {
  constructor(priority: number) {
    super(priority, [ServerRepresented, Transform]);
  }
  
  processEntity(entity: IdEntity, _index: number, _entities: unknown, _options: ClientWorldRunOptions) {
    if (entity.components.get(LocallyDriven)) {
      // it's me; server is not authoritative yet, and we don't have correction code
      return;
    }
    const pt = entity.components.get(Transform);
    const sr = entity.components.get(ServerRepresented);
    pt.pos = sr.receivedPos;
    pt.facing = sr.receivedFacing;
  }
}

// - to replace with input commands
export class SendUntrustedLocalPos extends AbstractEntitySystem<IdEntity> {
  constructor(priority: number) {
    super(priority, [ServerRepresented, Transform, LocallyDriven]);
  }
  
  processEntity(entity: IdEntity, _index: number, _entities: unknown, _options: ClientWorldRunOptions) {
    const pt = entity.components.get(Transform);
    const sr = entity.components.get(ServerRepresented);

    const pos = pt.pos;
    const facing = pt.facing;
    const now = Date.now();
    const minSendPeriodMs = 100;
    if (sr.lastSentTime > now - minSendPeriodMs) return;

    if (
      sr.lastSent !== undefined && //
      sr.lastSent.x == pos.x &&
      sr.lastSent.y == pos.y &&
      sr.lastSent.z == pos.z &&
      sr.lastSent.facingX == facing.x &&
      sr.lastSent.facingY == facing.y &&
      sr.lastSent.facingZ == facing.z
    ) {
      return;
    }
    sr.lastSent = { x: pos.x, y: pos.y, z: pos.z, facingX: facing.x, facingY: facing.y, facingZ: facing.z };
    sr.worldRoom.send("playerMove", sr.lastSent);
    sr.lastSentTime = now;
  }
}

export class LocallyDriven implements Component {
  // temporary tag for the local player that recvs input
  constructor() {}
}
