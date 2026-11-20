// VICE TIDE Cover Studio — cover renderer (canvas 2D, no dependencies).
//
// Draws a GTA-style multi-panel sunset cover: a photo collage on top, a rich
// sunset-gradient title band in the middle, and a footer with a barcode,
// tagline and a palm-tree strip. Everything is drawn from a plain state
// object, so the editor, the export buttons and the screenshot mode all share
// this one code path.
//
// Public surface (window.ViceTide):
//   LAYOUTS, GRADES, EXPORT_SIZES, SAMPLE_PHOTOS, PANEL_LABELS
//   defaultState()            fresh editor state (hero7 + sunset grade)
//   layoutCells(id, w, h, g)  pixel rects for a layout inside a collage box
//   gradeFilter(id, strength)  CSS filter string for a grade at a strength
//   drawCover(canvas, state, images)  paint a cover onto a sized canvas
//   renderCover(w, h, state, images)  make a canvas and paint a cover on it
//   coverFitSource(img, w, h, focusY)  source rect for a cover-fit draw
//   drawBarcode(ctx, x, y, w, h, seed)  deterministic barcode, bars only
//   drawPalmStrip(ctx, x, y, w, h)      palm silhouettes along a strip
//
// A "photo" is a key string. The editor maps keys to loaded images: the two
// bundled samples ('boulevard', 'pier') and any photo the user uploads
// (keyed 'upload:N'). drawCover looks images up in the Map it is given.

(function () {
  'use strict';

  // ---------------------------------------------------------------- layouts
  //
  // A layout is a list of cells. Each cell is a fraction of the collage box:
  // x, y, w, h in 0..1. layoutCells() turns them into pixel rects and carves
  // a uniform gutter between neighbours (never around the outside edge).

  var LAYOUTS = [
    {
      id: 'hero7', name: 'Hero 7',
      blurb: 'Big sunset hero left, six supporting panels right.',
      cells: [
        { x: 0, y: 0, w: 0.55, h: 1 },
        { x: 0.55, y: 0, w: 0.225, h: 0.42 },
        { x: 0.775, y: 0, w: 0.225, h: 0.42 },
        { x: 0.55, y: 0.42, w: 0.1125, h: 0.58 },
        { x: 0.6625, y: 0.42, w: 0.1125, h: 0.58 },
        { x: 0.775, y: 0.42, w: 0.1125, h: 0.58 },
        { x: 0.8875, y: 0.42, w: 0.1125, h: 0.58 }
      ]
    },
    {
      id: 'hero5', name: 'Hero 5',
      blurb: 'Big hero left, one wide panel and three small ones right.',
      cells: [
        { x: 0, y: 0, w: 0.55, h: 1 },
        { x: 0.55, y: 0, w: 0.45, h: 0.5 },
        { x: 0.55, y: 0.5, w: 0.15, h: 0.5 },
        { x: 0.70, y: 0.5, w: 0.15, h: 0.5 },
        { x: 0.85, y: 0.5, w: 0.15, h: 0.5 }
      ]
    },
    {
      id: 'grid6', name: 'Grid 6',
      blurb: 'Three columns, two rows — every panel the same size.',
      cells: [
        { x: 0, y: 0, w: 1 / 3, h: 0.5 },
        { x: 1 / 3, y: 0, w: 1 / 3, h: 0.5 },
        { x: 2 / 3, y: 0, w: 1 / 3, h: 0.5 },
        { x: 0, y: 0.5, w: 1 / 3, h: 0.5 },
        { x: 1 / 3, y: 0.5, w: 1 / 3, h: 0.5 },
        { x: 2 / 3, y: 0.5, w: 1 / 3, h: 0.5 }
      ]
    },
    {
      id: 'trio', name: 'Trio',
      blurb: 'Three tall panels side by side.',
      cells: [
        { x: 0, y: 0, w: 1 / 3, h: 1 },
        { x: 1 / 3, y: 0, w: 1 / 3, h: 1 },
        { x: 2 / 3, y: 0, w: 1 / 3, h: 1 }
      ]
    },
    {
      id: 'duet', name: 'Duet',
      blurb: 'Two halves — one photo each, or one photo across both.',
      cells: [
        { x: 0, y: 0, w: 0.5, h: 1 },
        { x: 0.5, y: 0, w: 0.5, h: 1 }
      ]
    },
    {
      id: 'single', name: 'Single',
      blurb: 'One photo, full bleed, nothing in the way.',
      cells: [{ x: 0, y: 0, w: 1, h: 1 }]
    },
    {
      id: 'strip4', name: 'Strip 4',
      blurb: 'Four cinema strips stacked top to bottom.',
      cells: [
        { x: 0, y: 0, w: 1, h: 0.25 },
        { x: 0, y: 0.25, w: 1, h: 0.25 },
        { x: 0, y: 0.5, w: 1, h: 0.25 },
        { x: 0, y: 0.75, w: 1, h: 0.25 }
      ]
    }
  ];

  function layoutById(id) {
    for (var i = 0; i < LAYOUTS.length; i++) {
      if (LAYOUTS[i].id === id) return LAYOUTS[i];
    }
    return LAYOUTS[0];
  }

  // Pixel rects for a layout inside a box of w x h, with a gutter g between
  // panels. A cell that touches the box edge keeps that edge flush.
  function layoutCells(id, w, h, g) {
    var cells = layoutById(id).cells;
    var out = [];
    for (var i = 0; i < cells.length; i++) {
      var c = cells[i];
      var x0 = c.x * w + (c.x > 0 ? g / 2 : 0);
      var y0 = c.y * h + (c.y > 0 ? g / 2 : 0);
      var x1 = (c.x + c.w) * w - (c.x + c.w < 1 ? g / 2 : 0);
      var y1 = (c.y + c.h) * h - (c.y + c.h < 1 ? g / 2 : 0);
      out.push({
        x: Math.round(x0), y: Math.round(y0),
        w: Math.max(1, Math.round(x1 - x0)),
        h: Math.max(1, Math.round(y1 - y0))
      });
    }
    return out;
  }

  // ------------------------------------------------------------------ grades
  //
  // A grade is a canvas filter plus a warm tint wash. Filter numbers are the
  // strength-1.0 values; gradeFilter() scales them towards neutral (1.0 for
  // saturate/contrast/brightness, 0 for sepia/grayscale/hue-rotate) so the
  // strength slider fades the whole grade in and out smoothly.

  var GRADES = [
    {
      id: 'sunset', name: 'Vice Sunset', desc: 'Warm golden hour, sepia + orange.',
      filter: { sepia: 0.45, saturate: 1.6, contrast: 1.06, brightness: 1.04, hue: 0, gray: 0 },
      tint: { color: '255,122,26', alpha: 0.16, blend: 'overlay' },
      tint2: { color: '255,46,136', alpha: 0.07, blend: 'soft-light' }
    },
    {
      id: 'golden', name: 'Golden Hour', desc: 'Soft gold, bright and warm.',
      filter: { sepia: 0.32, saturate: 1.45, contrast: 1.03, brightness: 1.08, hue: 0, gray: 0 },
      tint: { color: '255,190,60', alpha: 0.15, blend: 'overlay' },
      tint2: null
    },
    {
      id: 'neon', name: 'Neon Nights', desc: 'Hot magenta and cyan, club lights.',
      filter: { sepia: 0, saturate: 1.85, contrast: 1.1, brightness: 1.02, hue: -12, gray: 0 },
      tint: { color: '255,0,128', alpha: 0.12, blend: 'screen' },
      tint2: { color: '0,229,255', alpha: 0.08, blend: 'screen' }
    },
    {
      id: 'noir', name: 'Noir', desc: 'Black and white, hard contrast.',
      filter: { sepia: 0, saturate: 1, contrast: 1.28, brightness: 0.96, hue: 0, gray: 1 },
      tint: { color: '0,0,0', alpha: 0.1, blend: 'multiply' },
      tint2: null
    },
    {
      id: 'teal', name: 'Teal Coast', desc: 'Teal shadows, warm skin — the film look.',
      filter: { sepia: 0.12, saturate: 1.35, contrast: 1.08, brightness: 1.02, hue: 8, gray: 0 },
      tint: { color: '0,178,178', alpha: 0.12, blend: 'overlay' },
      tint2: { color: '255,150,40', alpha: 0.08, blend: 'soft-light' }
    },
    {
      id: 'miami', name: 'Miami Pastel', desc: 'Bubblegum pink, soft and bright.',
      filter: { sepia: 0.08, saturate: 1.5, contrast: 1.02, brightness: 1.07, hue: -6, gray: 0 },
      tint: { color: '255,110,180', alpha: 0.13, blend: 'screen' },
      tint2: null
    }
  ];

  function gradeById(id) {
    for (var i = 0; i < GRADES.length; i++) {
      if (GRADES[i].id === id) return GRADES[i];
    }
    return GRADES[0];
  }

  function lerpTowardNeutral(value, neutral, s) {
    return neutral + (value - neutral) * s;
  }

  function gradeFilter(id, strength) {
    var g = gradeById(id).filter;
    var s = Math.max(0, Math.min(1, strength == null ? 1 : strength));
    var parts = [];
    var sepia = g.sepia * s;
    var gray = g.gray * s;
    var sat = lerpTowardNeutral(g.saturate, 1, s);
    var con = lerpTowardNeutral(g.contrast, 1, s);
    var bri = lerpTowardNeutral(g.brightness, 1, s);
    var hue = g.hue * s;
    if (sepia > 0.005) parts.push('sepia(' + sepia.toFixed(3) + ')');
    if (gray > 0.005) parts.push('grayscale(' + gray.toFixed(3) + ')');
    if (Math.abs(sat - 1) > 0.005) parts.push('saturate(' + sat.toFixed(3) + ')');
    if (Math.abs(con - 1) > 0.005) parts.push('contrast(' + con.toFixed(3) + ')');
    if (Math.abs(bri - 1) > 0.005) parts.push('brightness(' + bri.toFixed(3) + ')');
    if (Math.abs(hue) > 0.5) parts.push('hue-rotate(' + hue.toFixed(1) + 'deg)');
    return parts.length ? parts.join(' ') : 'none';
  }

  // ------------------------------------------------------------- export sizes
  var EXPORT_SIZES = [
    { id: 'square', label: 'Square · 1080 × 1080', w: 1080, h: 1080 },
    { id: 'portrait', label: 'Portrait · 1080 × 1350', w: 1080, h: 1350 },
    { id: 'wide', label: 'Wide · 1920 × 1080', w: 1920, h: 1080 }
  ];

  // ------------------------------------------------------------ sample photos
  var SAMPLE_PHOTOS = [
    { id: 'boulevard', src: 'samples/boulevard.jpg', name: 'Boulevard — sunset woman', focusY: 0.22 },
    { id: 'pier', src: 'samples/pier.jpg', name: 'Pier — daylight', focusY: 0.35 }
  ];

  function sampleById(id) {
    for (var i = 0; i < SAMPLE_PHOTOS.length; i++) {
      if (SAMPLE_PHOTOS[i].id === id) return SAMPLE_PHOTOS[i];
    }
    return SAMPLE_PHOTOS[0];
  }

  // ------------------------------------------------------------ panel labels
  // One label set per hero7 panel, in cell order. The daylight pier photo is
  // only ever a small supporting panel (positions 4 and 6) — never the hero.
  var PANEL_LABELS = [
    { photo: 'boulevard', focusY: 0.22, place: 'OCEAN DRIVE', time: '6:42 PM', tag: 'LOOKING FOR TROUBLE' },
    { photo: 'boulevard', focusY: 0.55, place: 'VICE BEACH', time: '7:15 PM', tag: 'SALT IN THE AIR' },
    { photo: 'boulevard', focusY: 0.10, place: 'NEON ROW', time: '8:03 PM', tag: 'NO LAST CALL' },
    { photo: 'pier', focusY: 0.35, place: 'THE PIER', time: '5:58 PM', tag: 'GOLDEN HOUR' },
    { photo: 'boulevard', focusY: 0.75, place: 'MALIBU CLUB', time: '9:47 PM', tag: 'FIVE STARS' },
    { photo: 'pier', focusY: 0.20, place: 'PALM COURT', time: '6:10 PM', tag: 'TOP DOWN' },
    { photo: 'boulevard', focusY: 0.40, place: 'SUNSET STRIP', time: '7:30 PM', tag: 'CHASING LIGHT' }
  ];

  function defaultPanels() {
    var out = [];
    for (var i = 0; i < PANEL_LABELS.length; i++) {
      var p = PANEL_LABELS[i];
      out.push({ photo: p.photo, focusY: p.focusY, place: p.place, time: p.time, tag: p.tag });
    }
    return out;
  }

  function defaultState() {
    return {
      layout: 'hero7',
      grade: 'sunset',
      gradeStrength: 1.0,
      title: 'VICE TIDE',
      script: 'Saltwater Nights',
      quote: 'NEON, SALT AND FIVE STARS OF TROUBLE',
      tagline: 'ONE COAST • NO RULES • COMING SOON',
      panels: defaultPanels()
    };
  }

  // ------------------------------------------------------------------ helpers
  function clamp(v, lo, hi) {
    return v < lo ? lo : (v > hi ? hi : v);
  }

  // Source rectangle for a cover-fit draw: the image fills the target box,
  // cropped on the long side. focusY 0 keeps the top of the photo (faces
  // first), 0.5 centres it, 1 keeps the bottom.
  function coverFitSource(img, w, h, focusY) {
    var iw = img.naturalWidth || img.width;
    var ih = img.naturalHeight || img.height;
    var scale = Math.max(w / iw, h / ih);
    var sw = w / scale;
    var sh = h / scale;
    var fy = clamp(focusY == null ? 0.3 : focusY, 0, 1);
    var sx = clamp((iw - sw) / 2, 0, Math.max(0, iw - sw));
    var sy = clamp(fy * (ih - sh), 0, Math.max(0, ih - sh));
    return { sx: sx, sy: sy, sw: sw, sh: sh };
  }

  // Rounded-rect path (own helper so the code never depends on roundRect).
  function rr(ctx, x, y, w, h, r) {
    var rad = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + rad, y);
    ctx.lineTo(x + w - rad, y);
    ctx.arcTo(x + w, y, x + w, y + rad, rad);
    ctx.lineTo(x + w, y + h - rad);
    ctx.arcTo(x + w, y + h, x + w - rad, y + h, rad);
    ctx.lineTo(x + rad, y + h);
    ctx.arcTo(x, y + h, x, y + h - rad, rad);
    ctx.lineTo(x, y + rad);
    ctx.arcTo(x, y, x + rad, y, rad);
    ctx.closePath();
  }

  // Tiny deterministic PRNG from a string seed (barcode bars, palm lean).
  function hashSeed(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ------------------------------------------------------------- panel paint
  // Paint one photo into one panel rect: cover-fit with a top-biased crop,
  // the grade filter, the grade tint wash, then a soft shade at the bottom so
  // the label chip always reads. A missing image becomes a sunset placeholder
  // so the app never draws a hole.
  function drawPanelImage(ctx, img, rect, panel, gradeId, strength) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(rect.x, rect.y, rect.w, rect.h);
    ctx.clip();
    if (img && (img.naturalWidth || img.width)) {
      var src = coverFitSource(img, rect.w, rect.h, panel.focusY);
      ctx.filter = gradeFilter(gradeId, strength);
      ctx.drawImage(img, src.sx, src.sy, src.sw, src.sh, rect.x, rect.y, rect.w, rect.h);
      ctx.filter = 'none';
    } else {
      var ph = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
      ph.addColorStop(0, '#3a1550');
      ph.addColorStop(1, '#12041c');
      ctx.fillStyle = ph;
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('ADD A PHOTO', rect.x + rect.w / 2, rect.y + rect.h / 2);
      ctx.textAlign = 'left';
    }
    var g = gradeById(gradeId);
    var s = clamp(strength == null ? 1 : strength, 0, 1);
    if (g.tint && s > 0) {
      ctx.globalCompositeOperation = g.tint.blend;
      ctx.globalAlpha = g.tint.alpha * s;
      ctx.fillStyle = 'rgb(' + g.tint.color + ')';
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
    if (g.tint2 && s > 0) {
      ctx.globalCompositeOperation = g.tint2.blend;
      ctx.globalAlpha = g.tint2.alpha * s;
      ctx.fillStyle = 'rgb(' + g.tint2.color + ')';
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
    var shade = ctx.createLinearGradient(0, rect.y + rect.h * 0.55, 0, rect.y + rect.h);
    shade.addColorStop(0, 'rgba(0,0,0,0)');
    shade.addColorStop(1, 'rgba(0,0,0,0.42)');
    ctx.fillStyle = shade;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.strokeStyle = 'rgba(255,255,255,0.28)';
    ctx.lineWidth = 1;
    ctx.strokeRect(rect.x + 0.5, rect.y + 0.5, rect.w - 1, rect.h - 1);
    ctx.restore();
  }

  // -------------------------------------------------------------- label chips
  // A label chip sits at the bottom-left of a panel: place + time on the
  // first line, tagline in gold on the second. Narrow panels get the
  // two-line fallback — place alone on line one, time and tagline on line
  // two — and the type shrinks until it fits or hits its floor.
  function chipFont(size) {
    return size + 'px "Bebas Neue", "Arial Narrow", sans-serif';
  }

  function drawLabelChip(ctx, rect, panel) {
    var inset = Math.max(4, Math.round(rect.w * 0.02));
    var pad = Math.max(4, Math.round(rect.w * 0.022));
    var avail = rect.w - inset * 2 - pad * 2;
    var line1 = (panel.place || '') + '  •  ' + (panel.time || '');
    var size1 = clamp(Math.round(rect.w * 0.058), 9, 26);
    var size2 = Math.max(8, Math.round(size1 * 0.84));
    ctx.font = chipFont(size1);
    while (size1 > 9 && ctx.measureText(line1).width > avail) {
      size1 -= 1;
      ctx.font = chipFont(size1);
    }
    var lines;
    if (ctx.measureText(line1).width <= avail) {
      lines = [
        { text: line1, size: size1, color: '#ffffff' },
        { text: panel.tag || '', size: size2, color: '#ffd166' }
      ];
    } else {
      var s2 = size2;
      ctx.font = chipFont(s2);
      var second = (panel.time || '') + ' — ' + (panel.tag || '');
      while (s2 > 8 && ctx.measureText(second).width > avail) {
        s2 -= 1;
        ctx.font = chipFont(s2);
      }
      lines = [
        { text: panel.place || '', size: size1, color: '#ffffff' },
        { text: second, size: s2, color: '#ffd166' }
      ];
    }
    var widths = [];
    var maxW = 0;
    for (var i = 0; i < lines.length; i++) {
      ctx.font = chipFont(lines[i].size);
      var w = ctx.measureText(lines[i].text).width;
      widths.push(w);
      if (w > maxW) maxW = w;
    }
    var lineH = [];
    var totalH = pad * 2;
    for (var j = 0; j < lines.length; j++) {
      var lh = Math.round(lines[j].size * 1.12);
      lineH.push(lh);
      totalH += lh;
    }
    var chipW = Math.ceil(maxW) + pad * 2;
    var chipH = totalH;
    var cx = rect.x + inset;
    var cy = rect.y + rect.h - inset - chipH;
    ctx.save();
    rr(ctx, cx, cy, chipW, chipH, Math.max(3, Math.round(chipH * 0.18)));
    ctx.fillStyle = 'rgba(10,2,16,0.66)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    var ty = cy + pad;
    for (var k = 0; k < lines.length; k++) {
      ctx.font = chipFont(lines[k].size);
      ctx.fillStyle = lines[k].color;
      ctx.fillText(lines[k].text, cx + pad, ty);
      ty += lineH[k];
    }
    ctx.restore();
  }

  // ------------------------------------------------------------------- badges
  // Small sticker chips: black fill, thin gold ring, condensed caps text.
  function drawStickerChip(ctx, x, y, text, size, gold) {
    ctx.save();
    ctx.font = size + 'px "Bebas Neue", "Arial Narrow", sans-serif';
    var padX = Math.round(size * 0.55);
    var w = Math.ceil(ctx.measureText(text).width) + padX * 2;
    var h = Math.round(size * 1.7);
    rr(ctx, x, y, w, h, Math.round(h * 0.28));
    ctx.fillStyle = 'rgba(12,2,18,0.88)';
    ctx.fill();
    ctx.strokeStyle = gold ? '#ffd166' : 'rgba(255,255,255,0.35)';
    ctx.lineWidth = Math.max(1, Math.round(size * 0.07));
    ctx.stroke();
    ctx.fillStyle = gold ? '#ffd166' : '#ffffff';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillText(text, x + padX, y + h / 2 + 1);
    ctx.restore();
    return { x: x, y: y, w: w, h: h };
  }

  // Five-star row drawn with the star glyph in a plain sans face (Bebas has
  // no star glyph, so the stars get their own font run).
  function drawStars(ctx, x, y, size, color) {
    ctx.save();
    ctx.font = size + 'px sans-serif';
    ctx.fillStyle = color;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillText('★★★★★', x, y);
    var w = ctx.measureText('★★★★★').width;
    ctx.restore();
    return w;
  }

  // Measure a star chip without drawing it, so the caller can place it.
  // The star row is measured for real — the ★ glyph is ~1em wide in a sans
  // face, far wider than a 0.62em guess, and a guessed width clips stars.
  function measureStarChip(label, size) {
    var padX = Math.round(size * 0.55);
    var starSize = Math.round(size * 1.05);
    var gap = Math.round(size * 0.35);
    var labelW = label.length * size * 0.55;
    var starW = starSize * 5;
    try {
      var probe = document.createElement('canvas').getContext('2d');
      probe.font = size + 'px "Bebas Neue", "Arial Narrow", sans-serif';
      labelW = probe.measureText(label).width;
      probe.font = starSize + 'px sans-serif';
      starW = probe.measureText('★★★★★').width;
    } catch (e) { /* keep the estimates */ }
    return {
      w: Math.ceil(labelW) + gap + Math.ceil(starW) + padX * 2,
      h: Math.round(size * 1.7)
    };
  }

  // Sticker chip with a star row: label text, then five stars.
  function drawStarChip(ctx, x, y, label, size) {
    ctx.save();
    ctx.font = size + 'px "Bebas Neue", "Arial Narrow", sans-serif';
    var padX = Math.round(size * 0.55);
    var labelW = ctx.measureText(label).width;
    var starSize = Math.round(size * 1.05);
    var gap = Math.round(size * 0.35);
    ctx.font = starSize + 'px sans-serif';
    var starW = ctx.measureText('★★★★★').width;
    var w = Math.ceil(labelW) + gap + Math.ceil(starW) + padX * 2;
    var h = Math.round(size * 1.7);
    rr(ctx, x, y, w, h, Math.round(h * 0.28));
    ctx.fillStyle = 'rgba(12,2,18,0.88)';
    ctx.fill();
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = Math.max(1, Math.round(size * 0.07));
    ctx.stroke();
    ctx.font = size + 'px "Bebas Neue", "Arial Narrow", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillText(label, x + padX, y + h / 2 + 1);
    drawStars(ctx, x + padX + labelW + gap, y + h / 2 + 1, starSize, '#ffd166');
    ctx.restore();
    return { x: x, y: y, w: w, h: h };
  }

  // Circular EST. 2026 seal, tilted like a sticker, on the hero's corner.
  function drawEstSeal(ctx, cx, cy, r) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-0.14);
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(16,3,24,0.92)';
    ctx.fill();
    ctx.lineWidth = Math.max(2, r * 0.07);
    ctx.strokeStyle = '#ffd166';
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.82, 0, Math.PI * 2);
    ctx.lineWidth = Math.max(1, r * 0.035);
    ctx.strokeStyle = 'rgba(255,209,102,0.75)';
    ctx.stroke();
    ctx.fillStyle = '#ffd166';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = Math.round(r * 0.30) + 'px "Bebas Neue", sans-serif';
    ctx.fillText('EST.', 0, -r * 0.52);
    ctx.font = Math.round(r * 0.52) + 'px Anton, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('2026', 0, r * 0.02);
    ctx.font = Math.round(r * 0.24) + 'px "Bebas Neue", sans-serif';
    ctx.fillStyle = '#ffd166';
    ctx.fillText('VICE CITY', 0, r * 0.52);
    ctx.restore();
  }

  // ------------------------------------------------------------------ barcode
  // Deterministic barcode: bars only, no number line underneath. The pattern
  // comes from the seed string so the same cover always draws the same code.
  function drawBarcode(ctx, x, y, w, h, seed) {
    var rnd = mulberry32(hashSeed(seed || 'VICE TIDE'));
    ctx.save();
    rr(ctx, x, y, w, h, Math.max(2, Math.round(h * 0.08)));
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    var bx = x + w * 0.06;
    var right = x + w * 0.94;
    var top = y + h * 0.14;
    var bottom = y + h * 0.86;
    ctx.fillStyle = '#111111';
    while (bx < right) {
      var bw = 1 + rnd() * Math.max(2, w * 0.018);
      var gap = 1 + rnd() * Math.max(2, w * 0.012);
      if (rnd() > 0.28) ctx.fillRect(bx, top, bw, bottom - top);
      bx += bw + gap;
    }
    ctx.restore();
  }

  // --------------------------------------------------------------- palm strip
  // A row of simple palm silhouettes along the very bottom edge of the cover.
  function drawPalm(ctx, x, baseY, h, lean) {
    var topY = baseY - h;
    ctx.save();
    ctx.strokeStyle = '#2c0d42';
    ctx.fillStyle = '#2c0d42';
    ctx.lineWidth = Math.max(2, h * 0.07);
    ctx.beginPath();
    ctx.moveTo(x, baseY);
    ctx.quadraticCurveTo(x + lean * h * 0.25, baseY - h * 0.55, x + lean * h * 0.35, topY);
    ctx.stroke();
    var cx = x + lean * h * 0.35;
    var cy = topY;
    ctx.lineWidth = Math.max(1.5, h * 0.045);
    var fronds = 5;
    for (var i = 0; i < fronds; i++) {
      var ang = Math.PI * (0.08 + (i / (fronds - 1)) * 0.84);
      var fx = cx + Math.cos(ang) * h * 0.62;
      var fy = cy + Math.sin(ang) * h * 0.34 - h * 0.10;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.quadraticCurveTo(cx + (fx - cx) * 0.5, cy - h * 0.28, fx, fy);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawPalmStrip(ctx, x, y, w, h) {
    var rnd = mulberry32(hashSeed('palm-strip'));
    var count = Math.max(3, Math.floor(w / Math.max(90, h * 3.2)));
    for (var i = 0; i < count; i++) {
      var px = x + ((i + 0.5) / count) * w + (rnd() - 0.5) * h * 0.5;
      var ph = h * (0.75 + rnd() * 0.45);
      drawPalm(ctx, px, y + h, ph, rnd() > 0.5 ? 1 : -1);
    }
  }

  // Cover geometry: the collage, title band and footer share of the height.
  // One helper so drawCover, panelAt and the editor's selection outline can
  // never disagree about where the collage ends.
  function coverGeometry(H) {
    var collageH = Math.round(H * 0.60);
    var bandH = Math.round(H * 0.29);
    var footY = collageH + bandH;
    return { collageH: collageH, bandH: bandH, footY: footY, footH: H - footY };
  }

  // --------------------------------------------------------------- title band
  // The title grows until it fills ~88% of the band width or hits the
  // band-height cap, whichever comes first. The script overlaps the title's
  // lower edge in hot pink with a white outline; the quote sits under it.
  function titleFont(size) {
    return size + 'px Anton, "Arial Black", sans-serif';
  }

  function fitTitleSize(ctx, title, maxWidth, bandH) {
    var cap = Math.floor(bandH * 0.60);
    var size = Math.max(12, Math.floor(bandH * 0.26));
    ctx.save();
    try { ctx.letterSpacing = '0.03em'; } catch (e) { /* older canvas */ }
    ctx.font = titleFont(size);
    while (size < cap) {
      var next = size + 2;
      ctx.font = titleFont(next);
      if (ctx.measureText(title).width > maxWidth) break;
      size = next;
    }
    ctx.font = titleFont(size);
    var width = ctx.measureText(title).width;
    ctx.restore();
    return { size: size, width: width };
  }

  function drawTitleBand(ctx, W, bandY, bandH, state) {
    // Rich sunset gradient — deep purple up top, hot pink, then orange.
    var grad = ctx.createLinearGradient(0, bandY, 0, bandY + bandH);
    grad.addColorStop(0, '#2a0a3a');
    grad.addColorStop(0.42, '#a4126b');
    grad.addColorStop(0.72, '#ff2e88');
    grad.addColorStop(1, '#ff7a1a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, bandY, W, bandH);
    // Thin gold rules top and bottom of the band.
    ctx.fillStyle = 'rgba(255,209,102,0.9)';
    ctx.fillRect(0, bandY, W, Math.max(2, Math.round(bandH * 0.012)));
    ctx.fillRect(0, bandY + bandH - Math.max(2, Math.round(bandH * 0.012)), W, Math.max(2, Math.round(bandH * 0.012)));
    // Soft glow behind the lettering.
    var glow = ctx.createRadialGradient(W / 2, bandY + bandH * 0.42, 0, W / 2, bandY + bandH * 0.42, W * 0.42);
    glow.addColorStop(0, 'rgba(255,255,255,0.14)');
    glow.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, bandY, W, bandH);

    var title = (state.title || 'VICE TIDE').toUpperCase();
    var fit = fitTitleSize(ctx, title, W * 0.88, bandH);
    var size = fit.size;
    var titleTop = bandY + bandH * 0.10;
    var titleBaseline = titleTop + size * 0.92;

    ctx.save();
    try { ctx.letterSpacing = '0.03em'; } catch (e) { /* older canvas */ }
    var fill = ctx.createLinearGradient(0, titleTop, 0, titleBaseline);
    fill.addColorStop(0, '#fff3c4');
    fill.addColorStop(0.45, '#ffb347');
    fill.addColorStop(0.78, '#ff5e78');
    fill.addColorStop(1, '#ff2e88');
    ctx.font = titleFont(size);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.lineJoin = 'round';
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = Math.round(size * 0.06);
    ctx.shadowOffsetY = Math.round(size * 0.03);
    ctx.strokeStyle = '#0d020f';
    ctx.lineWidth = Math.max(3, Math.round(size * 0.085));
    ctx.strokeText(title, W / 2, titleBaseline);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.fillStyle = fill;
    ctx.fillText(title, W / 2, titleBaseline);
    ctx.restore();

    // Script subtitle: hot pink, white outline, overlapping the title's edge.
    var script = state.script || '';
    if (script) {
      var sSize = Math.max(16, Math.round(size * 0.38));
      ctx.save();
      ctx.font = sSize + 'px Pacifico, cursive';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      while (sSize > 14 && ctx.measureText(script).width > W * 0.92) {
        sSize -= 2;
        ctx.font = sSize + 'px Pacifico, cursive';
      }
      var sBaseline = titleBaseline + sSize * 0.42;
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(3, Math.round(sSize * 0.16));
      ctx.strokeText(script, W / 2, sBaseline);
      ctx.fillStyle = '#ff2e88';
      ctx.fillText(script, W / 2, sBaseline);
      ctx.restore();
    }

    // Quote line under the script. It is centred in the free zone left of
    // the COLLECTOR'S EDITION bar (which owns the band's bottom-right
    // corner), so the two can never touch — a centred quote would run into
    // the bar on square covers, where the quote is widest.
    var quote = state.quote || '';
    if (quote) {
      var qSize = clamp(Math.round(bandH * 0.105), 13, 40);
      var qCenterX = W * 0.36;
      ctx.save();
      try { ctx.letterSpacing = '0.16em'; } catch (e) { /* older canvas */ }
      ctx.font = qSize + 'px "Bebas Neue", "Arial Narrow", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      while (qSize > 12 && ctx.measureText(quote).width > W * 0.56) {
        qSize -= 1;
        ctx.font = qSize + 'px "Bebas Neue", "Arial Narrow", sans-serif';
      }
      ctx.fillStyle = 'rgba(255,255,255,0.94)';
      ctx.fillText(quote, qCenterX, bandY + bandH * 0.88);
      ctx.restore();
    }

    // Small COLLECTOR'S EDITION bar tucked into the band's bottom-right
    // corner — a bar, never a diagonal slash, clear of faces and labels.
    var rH = Math.max(16, Math.round(bandH * 0.15));
    var rW = Math.round(W * 0.30);
    var rX = W - rW - Math.round(W * 0.02);
    var rY = bandY + bandH - rH - Math.max(3, Math.round(bandH * 0.03));
    ctx.save();
    rr(ctx, rX, rY, rW, rH, Math.round(rH * 0.22));
    ctx.fillStyle = '#160420';
    ctx.fill();
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = Math.max(1, Math.round(rH * 0.06));
    ctx.stroke();
    var rSize = Math.max(10, Math.round(rH * 0.52));
    ctx.font = rSize + 'px "Bebas Neue", "Arial Narrow", sans-serif';
    ctx.fillStyle = '#ffd166';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('★ COLLECTOR’S EDITION ★', rX + rW / 2, rY + rH / 2 + 1);
    ctx.restore();
  }

  // ------------------------------------------------------------------- footer
  function drawFooter(ctx, W, footY, footH, state) {
    ctx.fillStyle = '#150420';
    ctx.fillRect(0, footY, W, footH);
    var palmH = Math.round(footH * 0.30);
    var textH = footH - palmH;
    // Barcode, bars only — no number line under it.
    var bcW = Math.round(W * 0.20);
    var bcH = Math.round(textH * 0.58);
    var bcX = Math.round(W * 0.035);
    var bcY = footY + Math.round((textH - bcH) / 2);
    drawBarcode(ctx, bcX, bcY, bcW, bcH, state.title || 'VICE TIDE');
    // Tagline in gold, disclaimer under it, both clear of the barcode.
    var tx = bcX + bcW + Math.round(W * 0.03);
    var tSize = clamp(Math.round(textH * 0.34), 13, 34);
    ctx.save();
    try { ctx.letterSpacing = '0.10em'; } catch (e) { /* older canvas */ }
    ctx.font = tSize + 'px "Bebas Neue", "Arial Narrow", sans-serif';
    ctx.fillStyle = '#ffd166';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(state.tagline || '', tx, footY + textH * 0.46);
    ctx.restore();
    var dSize = clamp(Math.round(textH * 0.20), 10, 20);
    var disclaimer = 'VICE TIDE IS A FAN-MADE TRIBUTE — NOT AFFILIATED WITH ANY GAME STUDIO';
    ctx.save();
    ctx.font = dSize + 'px sans-serif';
    while (dSize > 9 && ctx.measureText(disclaimer).width > W - tx - Math.round(W * 0.02)) {
      dSize -= 1;
      ctx.font = dSize + 'px sans-serif';
    }
    ctx.fillStyle = 'rgba(255,255,255,0.62)';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(disclaimer, tx, footY + textH * 0.80);
    ctx.restore();
    // Palm strip along the very bottom edge.
    drawPalmStrip(ctx, 0, footY + footH - palmH, W, palmH);
  }

  // ---------------------------------------------------------------- drawCover
  // Paint the whole cover onto a canvas the caller has already sized.
  // images is a Map from photo key to a loaded HTMLImageElement.
  function drawCover(canvas, state, images) {
    var ctx = canvas.getContext('2d');
    var W = canvas.width;
    var H = canvas.height;
    if (!W || !H) return;
    var geo = coverGeometry(H);
    var collageH = geo.collageH;
    var bandH = geo.bandH;
    var footY = geo.footY;
    var footH = geo.footH;
    var gutter = Math.max(4, Math.round(W * 0.008));

    ctx.save();
    ctx.fillStyle = '#1a051f';
    ctx.fillRect(0, 0, W, H);

    // Collage.
    var rects = layoutCells(state.layout, W, collageH, gutter);
    var panels = state.panels || [];
    for (var i = 0; i < rects.length; i++) {
      var panel = panels[i % Math.max(1, panels.length)] || PANEL_LABELS[i % PANEL_LABELS.length];
      var img = images ? images.get(panel.photo) : null;
      drawPanelImage(ctx, img, rects[i], panel, state.grade, state.gradeStrength);
    }
    // Soft vignette over the collage, under the chips and badges.
    var vg = ctx.createRadialGradient(W / 2, collageH / 2, Math.min(W, collageH) * 0.35, W / 2, collageH / 2, Math.max(W, collageH) * 0.72);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.20)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, collageH);
    // Label chips, one per panel.
    for (var j = 0; j < rects.length; j++) {
      var p = panels[j % Math.max(1, panels.length)] || PANEL_LABELS[j % PANEL_LABELS.length];
      drawLabelChip(ctx, rects[j], p);
    }
    // Badges: VOL. 06 on the hero, EST. 2026 seal on its corner, and the
    // WANTED / HEAT star chips on the collage's far corners.
    var hero = rects[0];
    var chipSize = clamp(Math.round(W * 0.016), 12, 22);
    drawStickerChip(ctx, hero.x + Math.max(6, gutter), hero.y + Math.max(6, gutter), 'VOL. 06', chipSize, true);
    var sealR = clamp(Math.round(W * 0.042), 26, 58);
    drawEstSeal(ctx, hero.x + hero.w - sealR - Math.max(8, gutter), hero.y + hero.h - sealR - Math.max(8, gutter), sealR);
    var starSize = clamp(Math.round(W * 0.016), 12, 22);
    var wanted = measureStarChip('WANTED', starSize);
    drawStarChip(ctx, W - wanted.w - Math.max(6, gutter), Math.max(6, gutter), 'WANTED', starSize);
    var heat = measureStarChip('HEAT', starSize);
    drawStarChip(ctx, W - heat.w - Math.max(6, gutter), collageH - heat.h - Math.max(6, gutter), 'HEAT', starSize);

    // Title band and footer.
    drawTitleBand(ctx, W, collageH, bandH, state);
    drawFooter(ctx, W, footY, footH, state);
    ctx.restore();
  }

  // Make a fresh canvas at w x h and paint a cover on it.
  function renderCover(w, h, state, images) {
    var canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    drawCover(canvas, state, images);
    return canvas;
  }

  // Hit-test a point (in collage pixel space) against the current layout.
  function panelAt(state, w, h, px, py) {
    var geo = coverGeometry(h);
    var collageH = geo.collageH;
    var gutter = Math.max(4, Math.round(w * 0.008));
    var rects = layoutCells(state.layout, w, collageH, gutter);
    for (var i = 0; i < rects.length; i++) {
      var r = rects[i];
      if (px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h) return i;
    }
    return -1;
  }

  window.ViceTide = {
    LAYOUTS: LAYOUTS,
    GRADES: GRADES,
    EXPORT_SIZES: EXPORT_SIZES,
    SAMPLE_PHOTOS: SAMPLE_PHOTOS,
    PANEL_LABELS: PANEL_LABELS,
    layoutById: layoutById,
    layoutCells: layoutCells,
    gradeById: gradeById,
    gradeFilter: gradeFilter,
    sampleById: sampleById,
    defaultState: defaultState,
    defaultPanels: defaultPanels,
    coverFitSource: coverFitSource,
    drawBarcode: drawBarcode,
    drawPalmStrip: drawPalmStrip,
    coverGeometry: coverGeometry,
    measureStarChip: measureStarChip,
    drawCover: drawCover,
    renderCover: renderCover,
    panelAt: panelAt
  };
})();
