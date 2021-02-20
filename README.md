Requirements:

- quick-to-join multiplayer game (trying https://github.com/colyseus/colyseus
  for this)
- no violence; school-appropriate
- quick-to-build code ~~using [buildpacks](https://buildpacks.io/)~~ (didn't
  figure this out; using vanilla skaffold)
- web-only (phone support is a plus)

Also using these:

- [pnpm](https://pnpm.js.org/en) - fast and compatible with npm
- skaffold
- rollup
- typescript
- [babylonjs](https://www.babylonjs.com/)

Actual game TBD.

## Dev setup:

`apt install blender python3-numpy`

Export geometry and textures:

`python3 world_export/run_export.py`

Have skaffold and a k8s cluster (I use k3s).

Run `skaffold dev` to launch two containers. Container 'megasecond' serves the game 
and multiplayer API; 'rebuild-client' notices changes to the client code and rebuilds.

Somehow route to the HTTP service at megasecond.default.service.cluster.local:80.

## Attributions

"Abandoned factory" (https://skfb.ly/6TzYN) by Rixael is licensed under Creative Commons Attribution (http://creativecommons.org/licenses/by/4.0/).
