import commonjs from "@rollup/plugin-commonjs";
import copy from "rollup-plugin-copy";
import resolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";


const production = !process.env.ROLLUP_WATCH;
const staticSourceFiles = ["client/index.html", "client/asset"];
const destDir = "dist";

export default {
    external: ["@babylonjs/core", "colyseus.js"],
    input: "client/index.ts",
    output: {
        sourcemap: !production,
        format: "iife",
        name: "bundle",
        file: `${destDir}/bundle.js`,
        globals: { "@babylonjs/core": "BABYLON", "colyseus.js": "Colyseus" }
    },
    plugins: [
        resolve({
            extensions: [".js", ".ts"],

            browser: true, preferBuiltins: true,

        }),
        commonjs(),
        typescript({
            sourceMap: !production,
            inlineSources: !production,
        }),
        copy({
            targets: [
                ...staticSourceFiles.map((f) => ({ src: f, dest: destDir })), //
                { src: "node_modules/colyseus.js/dist/colyseus.js", dest: `${destDir}/lib/` },
            ],
        }),
    ],
};
