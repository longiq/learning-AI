import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  treeshake: true,
  external: [
    "@llm-series/chunker",
    "@llm-series/embedder",
    "@llm-series/vector-store-lite",
  ],
});
