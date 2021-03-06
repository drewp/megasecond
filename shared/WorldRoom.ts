import { MapSchema, Schema, type } from "@colyseus/schema";
import { Client, Room } from "colyseus";
import createLogger from "./logsetup";

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

export class WorldState extends Schema {
  @type({ map: Player })
  public players = new MapSchema<Player>();
}

export class WorldRoom extends Room<WorldState> {
  public allowReconnectionTime: number = 2;

  public onCreate() {
    log.info("WorldRoom.onCreate");
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
  }

  public onJoin(client: Client, options: any = {}) {
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
