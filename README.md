# VICE TIDE Cover Studio

Turn a photo and a caption into GTA 6-style cover art, then export it as a PNG.

[![gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/Hunter-donot/gta6-cover-art/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/Hunter-donot/gta6-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

## What it does

Pick a photo, pick a layout and a grade, type a caption, and VICE TIDE builds a
golden-hour cover: a multi-panel photo collage, a huge sunset-gradient title,
a pink script subtitle, and the full badge set (EST. 2026, VOL. 06,
COLLECTOR'S EDITION, WANTED ★★★★★, HEAT ★★★★★, barcode).

## Run it

```sh
node serve.ts
```

Then open the app in your browser. Everything runs offline — the fonts
(Anton, Bebas Neue, Pacifico) are vendored in `app/fonts/`.

## Export

One click exports a PNG in any of three sizes:

- 1080 × 1080 (square)
- 1080 × 1350 (portrait)
- 1920 × 1080 (landscape)

## Layout

- `main.ts` — entrypoint: copies `app/` and `screenshots/` into `/output` and
  writes `/output/dossier.json`.
- `serve.ts` — static dev server.
- `shots.json` — the four screenshots (the first one is the cover).
- `app/` — the web app: `index.html`, `style.css`, `src/main.js` (editor),
  `src/shots.js` (shot mode), `src/cover.js` (the cover renderer),
  `samples/` (photos), `fonts/` (vendored fonts).
- `screenshots/` — the cover and editor screenshots.
- `vendor/makefun-app.ts` — the dossier builder (do not edit).

VICE TIDE is fan fiction. Not affiliated with or endorsed by any game studio.
All photos were made for make.fun.
