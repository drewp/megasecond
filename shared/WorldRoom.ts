import { MapSchema, Schema, type } from "@colyseus/schema";
import { Component, Engine } from "@trixt0r/ecs";
import { Vector3 } from "babylonjs";
import { Client, Room } from "colyseus";
import { CreateCard } from "./Collectible";
import { Model, Touchable, Transform, Twirl } from "./Components";
import { InitSystems } from "./InitSystems";
import createLogger from "./logsetup";
import { ServerWorldRunOptions } from "./types";

const log = createLogger("WorldRoom");

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
export class PropV3 extends Schema {
  @type("float64") x = 0;
  @type("float64") y = 0;
  @type("float64") z = 0;
}
export class ServerComponent extends Schema {
  @type({ map: PropV3 }) propV3 = new MapSchema<PropV3>();
  @type({ map: "string" }) propString = new MapSchema<string>();
  @type({ map: "int8" }) propInt8 = new MapSchema<number>();
  @type({ map: "float32" }) propFloat32 = new MapSchema<number>();
}

export class ServerEntity extends Schema {
  @type("int64") id = 0;
  @type({ map: ServerComponent }) components = new MapSchema<ServerComponent>();
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

    (global as any).currentRoom = this;
    this.setState(new WorldState());

    this.maxClients = 100;

    // this.onMessage("*", (client: Client, type: string | number, message: any) => {
    //   this.broadcast(type, [client.sessionId, message], { except: client });
    // });
    this.onMessage("setNick", (client: Client, message: string | number) => {
      log.info("recv nick", message);
      const pl = this.state.players.get(client.sessionId);
      if (!pl) {
        throw new Error("unknown player");
      }
      pl.nick = message as string;
    });
    this.onMessage("playerMove", (client: Client, message: any) => {
      const pl = this.state.players.get(client.sessionId);
      if (!pl) {
        throw new Error("unknown player");
      }
      pl.x = message.x;
      pl.y = message.y;
      pl.z = message.z;
      pl.facingX = message.facingX;
      pl.facingY = message.facingY;
      pl.facingZ = message.facingZ;
    });

    this.world = InitSystems();
    this.world.addListener({
      onAddedEntities: (...entities) => {
        entities.forEach((ent) => {
          const se = new ServerEntity();
          log.info(`new server ent ${ent.id} already has ${ent.components.length} comps`);
          this.state.entities.set("" + ent.id, se);

          function propFromVector3(v3: Vector3): PropV3 {
            const ret = new PropV3();
            ret.x = v3.x;
            ret.y = v3.y;
            ret.z = v3.z;
            return ret;
          }

          function onCompAdd(...comps: Component[]) {
            comps.forEach((comp: any) => {
              if (comp.constructor === Model) {
                const sc = new ServerComponent();
                se.components.set(comp.constructor.name, sc);

                sc.propString.set("modelPath", comp.modelPath);
              } else if (comp.constructor == Touchable) {
                const sc = new ServerComponent();
                se.components.set(comp.constructor.name, sc);
              } else if (comp.constructor == Transform) {
                const sc = new ServerComponent();
                se.components.set(comp.constructor.name, sc);
                sc.propV3.set("pos", propFromVector3(comp.pos));
                sc.propV3.set("vel", propFromVector3(comp.vel));
                sc.propV3.set("facing", propFromVector3(comp.facing));
              } else if (comp.constructor == Twirl) {
                const sc = new ServerComponent();
                se.components.set(comp.constructor.name, sc);
                sc.propFloat32.set("degPerSec", comp.degPerSec);
              }
            });
          }
          onCompAdd(...ent.components);
          ent.components.addListener({
            onAdded: onCompAdd,
          });
        });
      },
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
    const player = new Player();

    player.connected = true;
    player.sessionId = client.sessionId;

    this.state.players.set(client.sessionId, player);
    log.info("server players are now", JSON.stringify(this.state.players));
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
