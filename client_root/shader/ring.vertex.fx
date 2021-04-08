precision highp float;

// Attributes
attribute vec3 position;
attribute vec2 uv;

// Uniforms
uniform mat4 worldViewProjection;
uniform mat4 world;

// Varying
varying vec3 vWorldPos;

void main(void) {
    gl_Position = worldViewProjection * vec4(position, 1.0);

    vWorldPos = vec3(world * vec4(position, 1.0));
}