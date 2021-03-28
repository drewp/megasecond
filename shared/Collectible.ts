import { Vector3 } from "babylonjs";
import { Model, Touchable, Transform, Twirl } from "./Components";
import { IdEntity } from "./IdEntity";
import createLogger from "./logsetup";
const log = createLogger("system");

export function CreateCard(pos: Vector3): IdEntity {
  const card = new IdEntity();
  card.components.add(new Transform(pos, new Vector3(Math.random() - 0.5, 0, Math.random() - 0.5)));
  card.components.add(new Touchable());
  // of interest to client only:
  card.components.add(new Model("model/prop/card"));
  card.components.add(new Twirl(/*degPerSec=*/ 1));

  return card;
}
