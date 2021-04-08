precision highp float;
uniform float time;

varying vec3 vWorldPos;

void main(void) {
  float y = vWorldPos.y;
  float fade = mix(1., 0., clamp(y / .6, 0., 1.));

  float noise = sin(vWorldPos.x * 14.4 + 8.*time) + sin(vWorldPos.z * 13.3 + 8.*time);

  float c = clamp(fade + noise * .1, 0., 1.);
  vec3 color = vec3(.5 + .5 * sin(c*3.), c * .6, c);

  gl_FragColor = vec4(color, c);
}