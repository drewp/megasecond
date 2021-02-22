import { Context, defineTypes, MapSchema, Schema, type } from "@colyseus/schema";

import { Room } from "colyseus";
import { Client } from "colyseus";
import createLogger from "logging";

const log = createLogger("WorldRoom");
/**
 * Create another context to avoid these types from being in the user's global `Context`
 */
const context = new Context();

export class Player extends Schema {
  @type("boolean")
  connected = false;
  @type("string")
  nick = "unnamed";
  @type("string")
  sessionId = "";
}

export class WorldState extends Schema {
  @type({ map: Player })
  public players = new MapSchema<Player>();
}

export class WorldRoom extends Room<WorldState> {
  public allowReconnectionTime: number = 10;

  public onCreate() {
    // log.info("created WorldRoom");
    this.setState(new WorldState());

    this.maxClients = 100;

    this.onMessage("*", (client: Client, type: string|number, message: any) => {
      this.broadcast(type, [client.sessionId, message], { except: client });
    });
  }

  public onJoin(client: Client, options: any = {}) {
    log.info("onjoin", client.sessionId, options);
    const player = new Player();

    player.connected = true;
    player.sessionId = client.sessionId;

    if (options.name) {
      player.nick = options.name;
    }

    this.state.players.set(client.sessionId, player);
  }

  public async onLeave(client: Client, consented: boolean) {
    log.info("onLeave", client.id, { consented });
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
