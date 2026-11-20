// main.ts — VICE TIDE entry program (Node 22, stdlib only).
// Copies app/ + screenshots/ into the output dir and writes dossier.json
// via the vendored make.fun library. Run: node main.ts

import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildDossier } from "./vendor/makefun-app.ts";

const out = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
const here = new URL(".", import.meta.url).pathname;

mkdirSync(out, { recursive: true });
for (const name of ["app", "screenshots"]) {
  const dest = join(out, name);
  rmSync(dest, { recursive: true, force: true });
  cpSync(join(here, name), dest, { recursive: true });
}
if (!existsSync(join(out, "app", "index.html"))) {
  throw new Error("main.ts: app/index.html missing after copy");
}

const dossier = buildDossier(out, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
});
writeFileSync(join(out, "dossier.json"), dossier);
console.log(`main.ts: wrote ${join(out, "dossier.json")} (${dossier.length} bytes)`);
