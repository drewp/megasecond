import "jest";
import { Engine } from "@trixt0r/ecs";
import { WorldState } from "../shared/SyncTypes";
import { TrackEcsEntities } from "./SyncEcsToColyseus";
import { IdEntity } from "../shared/IdEntity";

describe("sync", () => {
  describe("TrackEcsEntities", () => {
    let world: Engine;
    let roomState: WorldState;
    beforeEach(() => {
      world = new Engine();
      roomState = new WorldState();
      new TrackEcsEntities(world, roomState);
    });
    it("should add target entities to match source", () => {
      expect(roomState.entities.size).toBe(0);
      world.entities.add(new IdEntity());
      expect(roomState.entities.size).toBe(1);
    });
  });
});
