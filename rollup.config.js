import copy from 'rollup-plugin-copy';
import resolve from "@rollup/plugin-node-resolve";
import serve from 'rollup-plugin-serve'
import typescript from "rollup-plugin-typescript2";
import commonjs from "@rollup/plugin-commonjs";
import json from '@rollup/plugin-json';

unused?

export default [
    {
        input: 'src/index.ts',
        output: {
            file: 'dist/bundle.js',
            format: 'iife',
            name: 'bundle',
            globals: { "@babylonjs/core": "BABYLON" },
        },
        external: ["@babylonjs/core"],
        plugins: [
            copy({
                targets: [
                    { src: 'src/index.html', dest: 'dist' },
                    { src: 'src/asset', dest: 'dist' },
                ]
            }),
            resolve({
                extensions: [".js", ".ts"],
                browser: true,
                preferBuiltins: true,
            }),
            typescript(),
        ]
    }
]