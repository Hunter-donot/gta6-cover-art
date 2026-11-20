// VICE TIDE Cover Studio — entry program (Node 22 standard library only).
//
// Copies app/ and screenshots/ from this repository into the output
// directory, then writes /output/dossier.json with buildDossier from
// vendor/makefun-app.ts. Outside the grader, MAKEFUN_OUTPUT_DIR stands in
// for /output.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoRoot = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';

mkdirSync(outDir, { recursive: true });

const appDir = join(repoRoot, 'app');
const shotsDir = join(repoRoot, 'screenshots');
if (!existsSync(appDir)) throw new Error('app/ is missing from ' + repoRoot);
if (!existsSync(shotsDir)) throw new Error('screenshots/ is missing from ' + repoRoot);

cpSync(appDir, join(outDir, 'app'), { recursive: true });
cpSync(shotsDir, join(outDir, 'screenshots'), { recursive: true });

const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);

console.log('VICE TIDE handed in: app/ + screenshots/ copied to ' + outDir);
console.log('dossier.json written (' + dossier.length + ' bytes).');
