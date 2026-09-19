import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import path from "path";

// Standalone build of the Web Component wrapper (src/web-component.js).
// Unlike webpack.lib.config.js (which externalizes Vue as a peer
// dependency), this bundles Vue's runtime in: the whole point is to be
// usable from plain HTML pages that don't have Vue installed at all.
export default defineConfig({
  plugins: [vue()],
  // In lib mode Vite normally leaves `process.env.NODE_ENV` (used by Vue's
  // esm-bundler build) untouched, expecting a downstream bundler to define
  // it. This bundle is consumed directly by the browser though, so there is
  // no downstream bundler to do that — define it ourselves.
  define: {
    "process.env.NODE_ENV": JSON.stringify("production")
  },
  esbuild: {
    loader: "jsx",
    jsxFactory: "h",
    jsxFragment: "Fragment",
    jsxInject: `import { h } from "vue";`
  },
  build: {
    outDir: "dist",
    emptyOutDir: false,
    lib: {
      entry: path.resolve(__dirname, "src/web-component.js"),
      name: "MmTreeSelect",
      formats: ["es", "iife"],
      fileName: (format) => (format === "iife" ? "mm-tree-select.js" : "mm-tree-select.es.js")
    }
  }
});
