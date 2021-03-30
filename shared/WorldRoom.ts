import { MapSchema, Schema, type } from "@colyseus/schema";
import { Engine } from "@trixt0r/ecs";
import { Vector3 } from "babylonjs";
import { Client, Room } from "colyseus";
import { action, makeObservable } from "mobx";
import { CreateCard } from "./Collectible";
import { ServerEntity } from "./SyncTypes";
import { AimAt, Model, Nametag, NetworkSession, Sim, Toucher, Transform } from "./Components";
import { IdEntity } from "./IdEntity";
import { InitSystems } from "./InitSystems";
import createLogger from "./logsetup";
import { TrackEcsEntities } from "./SyncEcsToColyseus";
import { ServerWorldRunOptions } from "./types";

export const log = createLogger("WorldRoom");

export class WorldState extends Schema {
  @type({ map: ServerEntity })
  public entities = new MapSchema<ServerEntity>();
}

export class WorldRoom extends Room<WorldState> {
  public world?: Engine;
  public allowReconnectionTime: number = 2;
  constructor() {
    super();
    makeObservable(this, { onPlayerMove: action, onSetNick: action });
  }
  public onCreate() {
    log.info("WorldRoom.onCreate");
    this.maxClients = 100;

    (global as any).currentRoom = this;
    this.setState(new WorldState());
    this.world = InitSystems();
    new TrackEcsEntities(this.state, this.world);

    // this.onMessage("*", (client: Client, type: string | number, message: any) => {
    //   this.broadcast(type, [client.sessionId, message], { except: client });
    // });
    this.onMessage("setNick", this.onSetNick.bind(this));
    this.onMessage("playerMove", this.onPlayerMove.bind(this));

    // for (let z = 2; z < 20; z += 5) {
    //   this.world.entities.add(CreateCard(new Vector3(2, 1.2, z)));
    // }
    // log.info("created cards", this.world.entities.length);

    this.setSimulationInterval((dmillis: number) => {
      this.world?.run({ dt: dmillis / 1000 } as ServerWorldRunOptions);
    }, 100);
  }

  playerSendingMessage(client: Client): IdEntity {
    const player = this.world!.entities.find((ent) => ent.components.get(NetworkSession).sessionId == client.sessionId);
    if (!player) {
      throw new Error(`message came for unknown player sessionId=${client.sessionId}`);
    }
    return player as IdEntity;
  }

  onPlayerMove(client: Client, message: any) {
    log.info("incoming move", client.sessionId, message);
    const player = this.playerSendingMessage(client);
    const tr = player.components.get(Transform);
    tr.pos = new Vector3(message.x, message.y, message.z);
    tr.facing = new Vector3(message.facingX, message.facingY, message.facingZ);
  }

  onSetNick(client: Client, message: string | number) {
    const player = this.playerSendingMessage(client);
    const nt = player.components.get(Nametag);
    nt.text = message as string;
  }

  public onJoin(client: Client, _options: any = {}) {
    log.info("WorldRoom.onJoin", client.sessionId);
    const player = this.createPlayer(client.sessionId);
    this.world?.entities.add(player);
  }

  createPlayer(sessionId: string) {
    // X=left, Y=up, Z=fwd
    const p = new IdEntity();

    // const sunCaster = (window as any).gen as ShadowGenerator; // todo
    // if (sunCaster) {
    //   sunCaster.addShadowCaster(body);
    // }
    p.components.add(new NetworkSession(sessionId, p.id));

    p.components.add(new Model("model/player/player"));
    p.components.add(new Transform(Vector3.Zero(), Vector3.Forward()));
    p.components.add(new Sim(Vector3.Zero()));
    p.components.add(new AimAt("player_aim"));
    p.components.add(new Toucher(/*posOffset=*/ new Vector3(0, 1.2, 0), /*radius=*/ 0.3));
    p.components.add(new Nametag(/*offset=*/ new Vector3(0, 0.2, 0)));
    log.info(`created player e${p.id} session=${sessionId}`);
    return p;
  }

  public async onLeave(client: Client, consented: boolean) {
    log.info("WorldRoom.onLeave", client.id, { consented });
    const player = this.playerSendingMessage(client);
    const ns = player.components.get(NetworkSession);
    ns.connected = false;
    if (this.allowReconnectionTime > 0) {
      try {
        if (consented) {
          throw new Error("consented leave");
        }

        await this.allowReconnection(client, this.allowReconnectionTime);
        ns.connected = false;
      } catch (e) {
        log.info(`remove player entity ${player.id}`);
        this.world!.entities.remove(player);
      }
    }
  }
}
