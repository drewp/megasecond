import { MapSchema, Schema, type } from "@colyseus/schema";
import { Engine } from "@trixt0r/ecs";
import { Vector3 } from "babylonjs";
import { Client, Room } from "colyseus";
import { CreateCard } from "./Collectible";
import { ServerEntity } from "./ColyTypesForEntities";
import { AimAt, Model, NetworkSession, Toucher, Transform } from "./Components";
import { IdEntity } from "./IdEntity";
import { InitSystems } from "./InitSystems";
import createLogger from "./logsetup";
import { TrackEcsEntities } from "./SyncEcsToColyseus";
import { ServerWorldRunOptions } from "./types";

export const log = createLogger("WorldRoom");

export class Player extends Schema {
  @type("boolean")
  connected = false;
  @type("string")
  nick = "unnamed";
  @type("string")
  sessionId = "";
  @type("float64") x = 0;
  @type("float64") y = 0;
  @type("float64") z = 0;
  @type("float64") facingX = 0;
  @type("float64") facingY = 0;
  @type("float64") facingZ = 0;
}

export class WorldState extends Schema {
  @type({ map: Player })
  public players = new MapSchema<Player>();
  @type({ map: ServerEntity })
  public entities = new MapSchema<ServerEntity>();
}

export class WorldRoom extends Room<WorldState> {
  public world?: Engine;
  public allowReconnectionTime: number = 2;

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
    this.onMessage("setNick", (client: Client, message: string | number) => {
      // log.info("recv nick", message);
      // const pl = this.state.players.get(client.sessionId);
      // if (!pl) {
      //   throw new Error("unknown player");
      // }
      // pl.nick = message as string;
    });
    this.onMessage("playerMove", (client: Client, message: any) => {
      log.info("must write move to entities", client.sessionId, message);
      return;
      // const pl = this.state.players.get(client.sessionId);
      // if (!pl) {
      //   throw new Error("unknown player");
      // }
      // pl.x = message.x;
      // pl.y = message.y;
      // pl.z = message.z;
      // pl.facingX = message.facingX;
      // pl.facingY = message.facingY;
      // pl.facingZ = message.facingZ;
    });

    for (let z = 2; z < 20; z += 5) {
      this.world.entities.add(CreateCard(new Vector3(2, 1.2, z)));
    }

    log.info("created cards", this.world.entities.length);

    this.setSimulationInterval((dmillis: number) => {
      this.world?.run({ dt: dmillis / 1000 } as ServerWorldRunOptions);
    }, 100);
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
    p.components.add(new NetworkSession(sessionId));

    p.components.add(new Model("model/player/player"));
    p.components.add(new Transform(Vector3.Zero(), Vector3.Zero(), Vector3.Forward()));
    p.components.add(new AimAt("player_aim"));
    // p.components.add(new Toucher(/*posOffset=*/ new Vector3(0, 1.2, 0), /*radius=*/ 0.3, new Set()));

    return p;
  }

  public async onLeave(client: Client, consented: boolean) {
    log.info("WorldRoom.onLeave", client.id, { consented });
    if (this.allowReconnectionTime > 0) {
      const player = this.state.players.get(client.sessionId)!;
      player.connected = false;

      try {
        if (consented) {
          throw new Error("consented leave");
        }

        await this.allowReconnection(client, this.allowReconnectionTime);
        player.connected = true;
      } catch (e) {
        this.state.players.delete(client.sessionId);
      }
    }
  }
}
