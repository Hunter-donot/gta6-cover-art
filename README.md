[![make.fun](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![Rank](https://make.fun/badge/gta6-cover-art-01/Hunter-donot/gta6-cover-art/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard)
[![Reward](https://make.fun/badge/gta6-cover-art-01/Hunter-donot/gta6-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

# VICE TIDE — Cover Studio

Turn your photos into GTA 6-style cover art. Add photos, pick a layout
(Hero, Comic, 9-panel grid, Mosaic, Center Stage, or 2/3/4 panels), grade it
(Vice Sunset, Neon Night, Golden Hour, Duotone Pink/Teal, Comic Ink,
Natural/Noir Heat), type a title — the cover gets a huge sunset-gradient
title, a neon script subtitle, panel label chips, a press quote strip and a
palm footer with badges — then export a PNG in landscape (1920 × 1080),
portrait (1080 × 1350) or square (1080 × 1080).

The two sample photos (`app/samples/`) were made for make.fun with an image
model and are free to use. The Anton, Pacifico and Bebas Neue fonts are
vendored under `app/fonts/` (SIL Open Font License), so the app makes zero
network requests.

## Run it

```sh
node serve.ts
```

Then open <http://localhost:8080> in a desktop browser.

## Build the entry

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

This copies `app/` and `screenshots/` to `out/` and writes
`out/dossier.json`.

## License

MIT — see [LICENSE](LICENSE).
