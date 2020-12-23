import resolve from "@rollup/plugin-node-resolve";
import path from "path";
import { OutputOptions, RollupWatcherEvent, watch as rollup_watch } from "rollup";
import copy from "rollup-plugin-copy";
import typescript from "rollup-plugin-typescript2";

export function watchAndRebuildClientBundle() {
  const sourceRoot = "client/index.ts";
  const staticSourceFiles = ["client/index.html", "client/asset"];
  const outBundleDir = "dist";

  const outOptions: OutputOptions = {
    file: path.join(__dirname, "..", outBundleDir, "bundle.js"),
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
        targets: staticSourceFiles.map((f) => ({ src: f, dest: outBundleDir })),
      }),
      resolve({
        extensions: [".js", ".ts"],
        browser: true,
        preferBuiltins: true,
      }),
      typescript({
        tsconfigOverride: {
          compilerOptions: {
            module: "ES2015",
          },
        },
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
