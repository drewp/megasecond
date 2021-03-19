import { Component } from "@trixt0r/ecs";
import { Vector3 } from "babylonjs";


export class Transform implements Component {
    constructor(
        public pos: Vector3,
        public vel: Vector3,
        public facing: Vector3
    ) { }
    get heading(): number {
        return (360 / (2 * Math.PI)) * Math.atan2(-this.facing.z, this.facing.x) + 270;
    }
}
