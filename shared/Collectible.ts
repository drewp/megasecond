import { Vector3 } from "babylonjs";
import { S_Model, S_Touchable, S_Transform, S_Twirl } from "./Components";
import { IdEntity } from "./IdEntity";
import createLogger from "./logsetup";
const log = createLogger("system");

export function CreateCard(pos: Vector3): IdEntity {
  const card = new IdEntity();
  card.components.add(new S_Transform(pos, new Vector3(Math.random() - 0.5, 0, Math.random() - 0.5)));
  card.components.add(new S_Touchable());
  // of interest to client only:
  card.components.add(new S_Model("model/prop/card.glb"));
  card.components.add(new S_Twirl(/*degPerSec=*/ 1));

  return card;
}
