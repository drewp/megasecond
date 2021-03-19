import { Vector3 } from "babylonjs";
import { IdEntity } from "./IdEntity";
import { Twirl } from "../client/Motion";
import { BjsMesh } from "../client/PlayerView";
import { Touchable } from "./TouchItem";
import { Transform } from "./Transform";

export function CreateCard(pos: Vector3): IdEntity {
  const card = new IdEntity();
  card.components.add(new Transform(pos, Vector3.Zero(), new Vector3(Math.random() - 0.5, 0, Math.random() - 0.5)));
  card.components.add(new Touchable());
  // of interest to client only:
  card.components.add(new BjsMesh("card"));
  card.components.add(new Twirl(/*degPerSec=*/ 1));

  return card;
}
