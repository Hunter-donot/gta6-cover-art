# VICE TIDE Cover Studio

![GTA 6 Cover Art](https://make.fun/badge/gta6-cover-art-01.svg)
![Rank](https://make.fun/badge/gta6-cover-art-01/Hunter-donot/gta6-cover-art/rank.svg)
![Reward](https://make.fun/badge/gta6-cover-art-01/Hunter-donot/gta6-cover-art/reward.svg)

Turn any photo and caption into a GTA 6-style cover — a golden-hour
7-panel collage with a huge sunset-gradient title, pink script subtitle,
and full collector badges. Runs entirely offline in your browser.

## Run it

```bash
npx serve app
```

Open http://localhost:3000, pick a photo, type a title and a script line,
choose a layout and a grade, then export a PNG.

## Export sizes

- 1080 x 1080 (square)
- 1080 x 1350 (portrait)
- 1920 x 1080 (landscape)

## How it works

- `app/index.html` — editor skeleton
- `app/src/main.js` — the editor (photo picker, layout/grade/size,
  text inputs, strength slider, PNG export)
- `app/src/cover.js` — the cover renderer (layouts, grades, title,
  script, chips, badges, barcode)
- `app/src/shots.js` — screenshot mode (`?shot=cover` / `?shot=editor`)
- `app/style.css` — dark editor theme, vendored fonts
- `app/samples/` — starter photos (boulevard, pier)
- `shots.json` — the 4 screenshots
- `main.ts` — copies app + screenshots into the submission output
- `serve.ts` — static dev server on port 8123

## Fonts

Anton, Bebas Neue and Pacifico, vendored as woff2 in `app/fonts/`.
No network calls at runtime — the app works fully offline.

## License

MIT — see LICENSE.
