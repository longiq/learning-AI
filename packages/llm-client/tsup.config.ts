import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  treeshake: true,
  external: ["openai", "@anthropic-ai/sdk"],
  esbuildOptions(options) {
    options.conditions = ["module"];
  },
});
