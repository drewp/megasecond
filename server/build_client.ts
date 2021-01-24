import { OutputOptions, RollupWatcherEvent, watch as rollup_watch } from "rollup";
import commonjs from "@rollup/plugin-commonjs";
import copy from "rollup-plugin-copy";
import path from "path";
import resolve from "@rollup/plugin-node-resolve";
import svelte from "rollup-plugin-svelte";
import sveltePreprocess from "svelte-preprocess";
import typescript from '@rollup/plugin-typescript';

export function watchAndRebuildClientBundle() {
  const sourceRoot = "client/main.ts";
  const staticSourceFiles = ["client/index.html", "client/asset"];
  const destDir = "dist";

  const outOptions: OutputOptions = {
    file: path.join(__dirname, "..", destDir, "bundle.js"),
    format: "iife",
    name: "bundle",
    globals: { "@babylonjs/core": "BABYLON" },
  };

  const watchOptions = {
    input: path.join(__dirname, "..", sourceRoot),
    output: outOptions,
    external: ["@babylonjs/core"],
    plugins: [
      copy({
        targets: staticSourceFiles.map((f) => ({ src: f, dest: destDir })),
      }),

      svelte({
        preprocess: sveltePreprocess({}),
        customElement: false,
      }),

      resolve({
        extensions: [".js", ".ts"],
        browser: true,
        preferBuiltins: true,
        dedupe: ["svelte"],
      }),
      commonjs(),
      typescript({
        "moduleResolution": "node",
        "target": "es2017",
        /** 
          Svelte Preprocess cannot figure out whether you have a value or a type, so tell TypeScript
          to enforce using `import type` instead of `import` for Types.
         */
        "importsNotUsedAsValues": "error",

        "isolatedModules": true,
        "sourceMap": true,

        /** Requests the runtime types from the svelte modules by default. Needed for TS files or else you get errors. */
        "types": ["svelte"],
    
        "esModuleInterop": true,
        "forceConsistentCasingInFileNames": true,    
        "module": "ESNEXT",    
        "noEmit": true,
        "skipLibCheck": true,
        "strict": true,
        "strictNullChecks": true
      }),
    ],
  };

  const watcher = rollup_watch(watchOptions);
  let lastBuildStart = 0;
  watcher.on("event", async (ev: RollupWatcherEvent) => {
    console.log(`rollup watcher: event=${ev.code}`);
    if (ev.code === "ERROR") {
      console.log("rollup watcher:", ev.error.message);
    } else if (ev.code === "BUNDLE_START") {
      console.log(`rollup watcher: files changed; rebuilding from ${ev.input} ...`);
      lastBuildStart = Date.now();
    } else if (ev.code === "BUNDLE_END") {
      await ev.result.write(outOptions);
      await ev.result.close();
      console.log(`rollup watcher: bundled in ${(Date.now() - lastBuildStart) / 1000} sec; wrote ${outOptions.file}`);
    }
  });
}
