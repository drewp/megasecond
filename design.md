# new build dirs

should be something like:

    asset/
        model/
            player/
            
            env/
                building_022.blend
                sign.blend (multiple objs ok)
            prop/
                card.blend
        layout/
            env.blend (links the model/env files)
        material/
            wood.blend
        map/
            wood_dif.png

    build/
        stage/
            env_edit.blend (split materials, etc)
            (maybe env_edit needs to be in sections too)
            bake/
                {obj}_shad.png
        serve/      
            model/
                env.glb
                in regions, LOD, etc
            material/
                some babylon format?
            map/
                many res, quality
            bake/
                {obj}_shad.jpg

# system profiler debug pane idea

    name    calls/fr   ms/fr
    ----    --------   -----
    System1 1          0.3
    System2 40         1.1

and maybe move bjs render into a system too

