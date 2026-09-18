import { build } from "esbuild";
import { mkdir, copyFile } from "node:fs/promises";
await build({
  entryPoints: ["server/index.ts"],
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2022",
  outfile: "dist/server/index.js",
  loader: { ".html": "text" },
});
await mkdir("dist/.openai", { recursive: true });
await copyFile(".openai/hosting.json", "dist/.openai/hosting.json");
