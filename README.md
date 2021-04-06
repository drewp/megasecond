# Project goals:

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
- blender

Actual game TBD.

# Live game instance

<span style="display: inline-block; border: 3px outset #051d26; background: #191010; padding: 12px 12px 0 12px; margin-bottom: 40px; font-weight: bold; font-size: 20px">

https://megasecond.club/

</span>

## Dev setup:

### (optional) Use mercurial

You can optionally get this (or any other git repo) with hg:

```
hg clone git+ssh://git@github.com:drewp/megasecond.git
```

Push like this:

```
hg bookmark -r default master && hg push
```

### Build the assets

Export geometry and textures (writes to `build/`):

```
cd world_export
make docker_build
make export
```

or `make export_forever` to watch for changes and rebuild.

### Deploy

Have [skaffold](https://skaffold.dev/) and a k8s cluster (I use
[k3s](https://k3s.io/)).

```
skaffold dev
```

This launches two containers. Container 'megasecond' serves the game and
multiplayer API; 'rebuild-client' notices changes to the client code and
rebuilds. skaffold notices all changes and will rebuild/restart the containers
if you change the server code, Dockerfile, etc.

Finally, route somehow to the HTTP service at
megasecond.default.service.cluster.local:80.

## Log viewers

The server and client-rebuilder processes log to
[frontail](https://github.com/mthenw/frontail). You could run these to open
compact windows to view the logs:
```
google-chrome-stable --new-window --app='https://megasecond.club/log/server/'
google-chrome-stable --new-window --app='https://megasecond.club/log/rebuild/'
```

## Attributions

"Abandoned factory" (https://skfb.ly/6TzYN) by Rixael is licensed under Creative
Commons Attribution (http://creativecommons.org/licenses/by/4.0/).

"Illustration from The Grammar of Ornament (1910) by Owen Jones" (https://flickr.com/photos/byrawpixel/35104618923), public domain.

## Development links

- https://doc.babylonjs.com/divingDeeper/environment/environment_introduction#fog to add

- http://grideasy.github.io/ some other bjs doc

- https://playground.babylonjs.com/#E6OZX#221 sandbox for skyboxMaterial

### Blender bake code:

- https://www.reddit.com/r/blender/comments/jawtb7/my_python_batch_bake_script_for_blender_290/

### Procedural animation

- https://www.reddit.com/r/gamedev/comments/fqhp9q/procedural_animation_in_10_steps/
- https://www.youtube.com/watch?v=LNidsMesxSE Overgrowth talk
- https://www.reddit.com/r/gamedev/comments/gm6e8/procedural_walking/ more links
- https://github.com/Banbury/cartwheel-3d
- https://www.youtube.com/watch?v=MHj8RDfyqP0 video of cartwheel

Swing dance step tutorials

- https://www.youtube.com/c/ElectroSwingThing/videos

## License

MIT
