import commonjs from "@rollup/plugin-commonjs";
import resolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";


const destDir = "rollup_build";
const sourcemap = true;

export default {
    external: ["babylonjs", "colyseus.js", "mobx", "babylonjs-materials"],
    input: "client/index.ts",
    output: {
        sourcemap: sourcemap,
        sourcemapPathTransform: (p) => p.replace(/^.../, "src/"),
        format: "iife",
        name: "bundle",
        file: `${destDir}/bundle.js`,
        globals: { "babylonjs": "BABYLON", "colyseus.js": "Colyseus", "mobx": "mobx", "babylonjs-materials": 'BABYLON' }
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

// look at https://vitejs.dev/guide/ fo doing this even faster and getting HMR!