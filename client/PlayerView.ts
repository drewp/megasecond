import { Engine } from "@trixt0r/ecs";
import { AbstractEntitySystem, Component } from "@trixt0r/ecs";
import { AbstractMesh, Color3, Mesh, MeshBuilder, Scene, ShadowGenerator, StandardMaterial, TransformNode, Vector3 } from "babylonjs";
import createLogger from "../shared/logsetup";
import { IdEntity } from "./IdEntity";
import { Transform, Twirl } from "./Motion";
import { WorldRunOptions } from "./types";

const log = createLogger("PlayerView");

export class BjsMesh implements Component {
  public aimAt: AbstractMesh;
  constructor(public root: AbstractMesh, aimAt?: AbstractMesh) {
    log.info("made bjsmesh with", root, this.root);
    this.aimAt = aimAt || root;
  }
  dispose() {
    this.root.dispose();
  }
}

// merge this into a Bjs lifecycle system? not sure
export class BjsDispose extends AbstractEntitySystem<IdEntity> {
  processEntity() {
    //nothing
  }
  onRemovedComponents?(entity: IdEntity, ...components: Component[]): void {
    components.forEach((bm: Component) => {
      if (!bm.root) return; //  might be some other comp!
      (bm as BjsMesh).root.dispose();
    });
  }
  // or killed entity too
}

// e.g. a player
export class Toucher implements Component {
  constructor(
    public posOffset: Vector3, // relative to BjsMesh.root.position
    public radius: number,
    public currentlyTouching: Set<IdEntity>
  ) {}
}

// e.g. a prize
export class Touchable implements Component {
  constructor() {}
}

export function CreatePlayer(scene: Scene, prefix: string) {
  // X=left, Y=up, Z=fwd
  const p = new IdEntity();

  const playerReferenceModel = scene.getMeshByName("player");
  const refAim = scene.getTransformNodeByName("player_aim")!;
  if (!playerReferenceModel || !refAim) {
    throw new Error("no ref yet");
  }
  const body = (playerReferenceModel as Mesh).createInstance(`${prefix}-body`);
  const aimAt = new TransformNode(`${prefix}-aim`);
  aimAt.parent = body;

  const refOffset = refAim.position.subtract(playerReferenceModel.position);
  aimAt.position = body.position.add(refOffset);

  const sunCaster = (window as any).gen as ShadowGenerator; // todo
  if (sunCaster) {
    sunCaster.addShadowCaster(body);
  }
  p.components.add(new BjsMesh(body, aimAt as AbstractMesh));
  p.components.add(new Toucher(/*posOffset=*/ new Vector3(0, 1.2, 0), /*radius=*/ 0.3, new Set()));

  return p;
}

export function CreateCard(scene: Scene, pos: Vector3, cardMesh: Mesh): IdEntity {
  const card = new IdEntity();
  card.components.add(new BjsMesh(cardMesh.clone()));
  card.components.add(new Transform(pos, Vector3.Zero(), new Vector3(Math.random() - 0.5, 0, Math.random() - 0.5)));
  card.components.add(new Twirl(/*degPerSec=*/ 1));
  card.components.add(new Touchable());

  return card;
}

export class TransformMesh extends AbstractEntitySystem<IdEntity> {
  processEntity(entity: IdEntity, _index: number, _entities: unknown, _options: WorldRunOptions) {
    const tr = entity.components.get(Transform);
    const root = entity.components.get(BjsMesh).root;
    root.position.copyFrom(tr.pos);
    root.lookAt(root.position.add(tr.facing));
  }
}
