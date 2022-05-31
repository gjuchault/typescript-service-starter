import path from "node:path";
import { build as dev } from "estrella";

process.env.NODE_ENV = "development";

dev({
  entry: path.join(__dirname, "../src/index.ts"),
  outfile: path.join(__dirname, "../build/index.js"),
  bundle: true,
  run: [
    process.execPath,
    "--inspect=0.0.0.0:9229",
    path.resolve(__dirname, "../build/index.js"),
  ],
  watch: true,
  clear: false,
  quiet: true,
  minify: false,

  platform: "node",
  target: "esnext",
  nodePaths: [path.join(__dirname, "../src")],
  sourcemap: true,
  external: ["pg-native"],
  format: "cjs",
});
