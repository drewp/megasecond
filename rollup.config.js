import commonjs from "@rollup/plugin-commonjs";
import copy from 'rollup-plugin-copy';
import resolve from "@rollup/plugin-node-resolve";
import serve from 'rollup-plugin-serve'
import typescript from "rollup-plugin-typescript2";

export default {
    input: 'src/index.ts',
    output: {
        file: 'dist/bundle.js',
        format: 'iife',
        name: 'bundle'
    },
    plugins: [
        copy({ targets: [{ src: 'src/index.html', dest: 'dist' }] }),
        resolve({
            extensions: [".js", ".ts"],
            browser: true,
            preferBuiltins: true,
        }),
        typescript(),
        commonjs({}),
        serve('dist')
    ]
}