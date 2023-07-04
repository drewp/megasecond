import { defineConfig } from "vite";

export default defineConfig({
  // / -> client/index.html
  root: "client",
  base: "/",
  // /layout.json -> build/serve/layout.json
  publicDir: "../build/serve",
  server: {
    host: "0.0.0.0",
    strictPort: true,
    port: 10001,
    hmr: { path: "vite-ws" },
    fs: {
      allow: [
        // these are relative to config.root
        "../client",
        "../shared",
        // /@fs/workspace/node_modules/x -> node_modules/x
        "../node_modules",
      ],
    },
  },
  build: {
    assetsDir: "client",
    target: "esnext",
    lib: {
      entry: "client/index.ts",
      formats: ["es"],
    },
  },
  define: {
    global: {},
  },
});
