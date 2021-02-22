import { Context, defineTypes, MapSchema, Schema } from "@colyseus/schema";

import { Room } from "colyseus";
import { Client } from "colyseus";

/**
 * Create another context to avoid these types from being in the user's global `Context`
 */
const context = new Context();

class Player extends Schema {
  // tslint:disable-line
  public connected: boolean=false;
  public name: string="unnamed";
  public sessionId: string="";
}
defineTypes(
  Player,
  {
    connected: "boolean",
    name: "string",
    sessionId: "string",
  },
  context
);

export class WorldState extends Schema {
  public players = new MapSchema<Player>();
}
defineTypes(
  WorldState,
  {
    players: { map: Player },
  },
  context
);

/**
 * client.joinOrCreate("relayroom", {
 *   maxClients: 10,
 *   allowReconnectionTime: 20
 * });
 */

export class WorldRoom extends Room<WorldState> {
  public allowReconnectionTime: number = 10;

  public onCreate() {
    log.info("created WorldRoom");
    this.setState(new WorldState());

    this.maxClients = 100;

    this.onMessage("*", (client: Client, type: string|number, message: any) => {
      this.broadcast(type, [client.sessionId, message], { except: client });
    });
  }

  public onJoin(client: Client, options: any = {}) {
      console.log('onjoin', client.sessionId, options);
    const player = new Player();

    player.connected = true;
    player.sessionId = client.sessionId;

    if (options.name) {
      player.name = options.name;
    }

    this.state.players.set(client.sessionId, player);
  }

  public async onLeave(client: Client, consented: boolean) {
      console.log('onLeave', client.id, consented)
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
