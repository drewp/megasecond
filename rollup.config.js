import commonjs from "@rollup/plugin-commonjs";
import resolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";


const destDir = "rollup_build";
const sourcemap = true;

export default {
    external: ["babylonjs", "colyseus.js", "miski"],
    input: "client/index.ts",
    output: {
        sourcemap: sourcemap,
        sourcemapPathTransform: (p) => p.replace(/^.../, "src/"),
        format: "iife",
        name: "bundle",
        file: `${destDir}/bundle.js`,
        globals: { "babylonjs": "BABYLON", "colyseus.js": "Colyseus", "miski": "miski" }
    },
    plugins: [
        resolve({
            extensions: [".js", ".ts"],
            browser: true,
            preferBuiltins: true,

        }),
        commonjs(),
        typescript({
            sourceMap: sourcemap,
            inlineSources: false,
        }),
    ],
    watch: {
        include: "client/**"
    }
};
