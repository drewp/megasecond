import { Component, ComponentCollection } from "@trixt0r/ecs";
import { FollowCamera, Vector3 } from "babylonjs";
import { IdEntity } from "../../shared/IdEntity";
import { KeepProcessing, LoadUnloadSystem } from "../../shared/LoadUnloadSystem";
import { ClientWorldRunOptions } from "../../shared/types";
import { LocalCam } from "../Components";

export class LocalCamLoadUnload extends LoadUnloadSystem {
  requiredComponentTypes = [LocalCam];
  processAdded(entity: IdEntity, options: ClientWorldRunOptions): KeepProcessing {
    const lc = entity.components.get(LocalCam);
    lc.cam = new FollowCamera("cam", new Vector3(-1.4, 1.5, -4), options.scene);
    lc.cam.inputs.clear();
    lc.cam.radius = 2;
    lc.cam.heightOffset = 1;
    lc.cam.fov = 1.2;
    lc.cam.rotationOffset = 180;
    lc.cam.cameraAcceleration = 0.5;
    options.scene.switchActiveCamera(lc.cam);
    return KeepProcessing.STOP_PROCESSING;
  }
  onRemoved(entity: IdEntity, components: ComponentCollection<Component>) {
    const lc = components.get("LocalCam");
    lc.cam.dispose();
  }
}
