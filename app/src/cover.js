// VICE TIDE Cover Studio — the cover renderer.
// Draws a GTA-style multi-panel cover on any canvas: a photo collage with thin
// white gutters, a huge sunset-gradient title in Anton, a hot-pink Pacifico
// script subtitle, panel label chips, a press quote strip, and a palm footer
// with badges. Every size is proportional, so the same code renders the
// 1920x1080 landscape, 1080x1350 portrait and 1080x1080 square exports.

export const SIZES = {
  landscape: { w: 1920, h: 1080, label: '1920 x 1080 Landscape' },
  portrait: { w: 1080, h: 1350, label: '1080 x 1350 Portrait' },
  square: { w: 1080, h: 1080, label: '1080 x 1080 Square' },
};

export const GRADES = {
  sunset: { name: 'Vice Sunset', sat: 1.28, con: 1.08, sepia: 0.24, hue: 0, bright: 1.0, tint: 'rgba(255,110,40,0.16)', tintMode: 'overlay' },
  neon: { name: 'Neon Night', sat: 1.45, con: 1.12, sepia: 0.0, hue: -14, bright: 0.98, tint: 'rgba(180,40,255,0.13)', tintMode: 'soft-light' },
  golden: { name: 'Golden Hour', sat: 1.16, con: 1.05, sepia: 0.34, hue: 0, bright: 1.04, tint: 'rgba(255,180,60,0.10)', tintMode: 'overlay' },
  duotone: { name: 'Duotone Pink / Teal', sat: 1.7, con: 1.16, sepia: 0.0, hue: 158, bright: 1.0, tint: 'rgba(255,46,136,0.13)', tintMode: 'multiply' },
  ink: { name: 'Comic Ink', sat: 1.32, con: 1.38, sepia: 0.0, hue: 0, bright: 1.02, tint: 'rgba(24,10,44,0.12)', tintMode: 'multiply' },
  natural: { name: 'Natural / Noir Heat', sat: 1.0, con: 1.0, sepia: 0.0, hue: 0, bright: 1.0, tint: null, tintMode: 'overlay' },
};

export const LAYOUTS = {
  hero7: 'Hero 7-panel',
  hero: 'Hero',
  comic: 'Comic',
  grid9: '9-panel grid',
  mosaic: 'Mosaic',
  stage: 'Center Stage',
  panels2: '2 panels',
  panels3: '3 panels',
  panels4: '4 panels',
};

// Detail views per sample photo: a face view used at most once, plus
// face-free detail crops so a cover never repeats the same face.
export const PHOTO_VIEWS = {
  boulevard: [
    { id: 'hero', cx: 0.5, cy: 0.42, zoom: 1.0, face: true, label: 'OCEAN DRIVE  6:42 PM  —  LOOKING FOR TROUBLE' },
    { id: 'convertible', cx: 0.22, cy: 0.8, zoom: 1.9, face: false, label: 'MARINA DEL SOL  7:48 PM  —  NO WITNESSES' },
    { id: 'palms', cx: 0.1, cy: 0.12, zoom: 2.2, face: false, label: 'BOARDWALK  8:15 PM  —  SUNSET CHASERS' },
  ],
  pier: [
    { id: 'hero', cx: 0.44, cy: 0.4, zoom: 1.0, face: true, label: 'PIER 26  5:30 AM  —  GONE FISHING' },
    { id: 'rod', cx: 0.78, cy: 0.55, zoom: 1.9, face: false, label: 'THE REEL DEAL  5:45 AM  —  ONE MORE CAST' },
    { id: 'water', cx: 0.85, cy: 0.22, zoom: 2.1, face: false, label: 'TURQUOISE BAY  11:02 AM  —  NO BAD DAYS' },
  ],
};

export const DEFAULT_LABELS = [
  'OCEAN DRIVE  6:42 PM  —  LOOKING FOR TROUBLE',
  'PIER 26  5:30 AM  —  GONE FISHING',
  'MARINA DEL SOL  7:48 PM  —  NO WITNESSES',
  'THE REEL DEAL  5:45 AM  —  ONE MORE CAST',
  'BOARDWALK  8:15 PM  —  SUNSET CHASERS',
  'TURQUOISE BAY  11:02 AM  —  NO BAD DAYS',
];

export const SUBTITLES = [
  'Saltwater Nights', 'Tide & Trouble', 'Palms & Pistols',
  'Chasing the Sun', 'Vice by the Sea', 'Salt in the Air',
];

export function defaultState() {
  return {
    size: 'landscape',
    layout: 'hero7',
    grade: 'sunset',
    strength: 1.0, contrast: 1.0, saturation: 1.0,
    grain: 0.35, vignette: 0.45, halftone: 0.3, painterly: 0.25, ink: 0.0,
    title: 'VICE TIDE', subtitle: 'Saltwater Nights',
    tagline: 'ONE COAST  •  NO RULES  •  COMING SOON',
    badge: 'EST. 2026', volume: 'VOL. 06', ribbon: "COLLECTOR'S EDITION",
    hud: 'WANTED', stars: 5,
    quote: 'NEON, SALT AND FIVE STARS OF TROUBLE',
    quoteBy: 'THE COAST HERALD',
    showLabels: true, showBadge: true, showVolume: true, showRibbon: true,
    // panels: one slot per layout cell; each slot names a photo and a view.
    // A slot is { photoId, viewId, zoom, cx, cy, fit } where zoom/cx/cy are
    // user tweaks on top of the view's own crop.
    panels: [],
    selected: 0,
  };
}

/** The four zones of a cover, as fractions of the canvas height. */
function zones(H) {
  return {
    collage: { y: 0, h: H * 0.54 },
    title: { y: H * 0.54, h: H * 0.32 },
    quote: { y: H * 0.86, h: H * 0.05 },
    footer: { y: H * 0.91, h: H * 0.09 },
  };
}

/** The collage rectangle (the panel area) for a canvas of W x H. */
export function collageRect(W, H) {
  const gutter = Math.max(6, W * 0.004);
  return { x: gutter, y: gutter, w: W - gutter * 2, h: H * 0.54 - gutter };
}

/** Panel rectangles for a layout, inside the collage rect (fractions of it). */
export function layoutPanels(layout, rect) {
  const { x, y, w, h } = rect;
  const g = Math.max(6, w * 0.004); // white gutter
  const col = (i, n) => x + (w * i) / n;
  const row = (i, n) => y + (h * i) / n;
  const cell = (cx, cy, cw, ch) => ({
    x: x + (w * cx) + (cx > 0 ? g / 2 : 0),
    y: y + (h * cy) + (cy > 0 ? g / 2 : 0),
    w: w * cw - (cx > 0 ? g / 2 : 0) - (cx + cw < 1 ? g / 2 : 0),
    h: h * ch - (cy > 0 ? g / 2 : 0) - (cy + ch < 1 ? g / 2 : 0),
  });
  switch (layout) {
    case 'hero7': return [
      cell(0, 0, 0.55, 1),
      cell(0.55, 0, 0.225, 0.5),
      cell(0.775, 0, 0.225, 0.5),
      cell(0.55, 0.5, 0.1125, 0.5),
      cell(0.6625, 0.5, 0.1125, 0.5),
      cell(0.775, 0.5, 0.1125, 0.5),
      cell(0.8875, 0.5, 0.1125, 0.5),
    ];
    case 'hero': return [
      cell(0, 0, 0.55, 1),
      cell(0.55, 0, 0.45, 0.5),
      cell(0.55, 0.5, 0.225, 0.5),
      cell(0.775, 0.5, 0.225, 0.5),
    ];
    case 'comic': return [cell(0, 0, 0.5, 0.5), cell(0.5, 0, 0.5, 0.5), cell(0, 0.5, 0.5, 0.5), cell(0.5, 0.5, 0.5, 0.5)];
    case 'grid9': {
      const out = [];
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) out.push(cell(c / 3, r / 3, 1 / 3, 1 / 3));
      return out;
    }
    case 'mosaic': return [
      cell(0, 0, 1, 0.55),
      cell(0, 0.55, 1 / 3, 0.45), cell(1 / 3, 0.55, 1 / 3, 0.45), cell(2 / 3, 0.55, 1 / 3, 0.45),
    ];
    case 'stage': return [cell(0, 0, 0.25, 1), cell(0.25, 0, 0.5, 1), cell(0.75, 0, 0.25, 1)];
    case 'panels2': return [cell(0, 0, 0.5, 1), cell(0.5, 0, 0.5, 1)];
    case 'panels3': return [cell(0, 0, 1 / 3, 1), cell(1 / 3, 0, 1 / 3, 1), cell(2 / 3, 0, 1 / 3, 1)];
    case 'panels4': return [cell(0, 0, 0.25, 1), cell(0.25, 0, 0.25, 1), cell(0.5, 0, 0.25, 1), cell(0.75, 0, 0.25, 1)];
    default: return [cell(0, 0, 1, 1)];
  }
}

/** Default panel assignments for a layout: cycle the sample views, faces once. */
export function defaultPanels(layout, photoIds) {
  const count = layoutPanels(layout, { x: 0, y: 0, w: 100, h: 100 }).length;
  const views = [];
  for (const id of photoIds) for (const v of PHOTO_VIEWS[id] ?? []) views.push({ photoId: id, ...v });
  if (views.length === 0) views.push({ photoId: photoIds[0], id: 'hero', cx: 0.5, cy: 0.5, zoom: 1, face: true, label: DEFAULT_LABELS[0] });
  const faceUsed = new Set();
  const out = [];
  let vi = 0;
  for (let i = 0; i < count; i++) {
    let pick = null;
    for (let tries = 0; tries < views.length; tries++) {
      const cand = views[(vi + tries) % views.length];
      if (cand.face && faceUsed.has(cand.photoId + ':' + cand.id)) continue;
      pick = cand; vi = (vi + tries + 1) % views.length; break;
    }
    if (!pick) pick = views[i % views.length];
    if (pick.face) faceUsed.add(pick.photoId + ':' + pick.id);
    out.push({ photoId: pick.photoId, viewId: pick.id, zoom: 1, cx: pick.cx, cy: pick.cy, fit: 'cover', label: pick.label });
  }
  return out;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Draws one photo into a panel, cover-fitting its view crop (or containing it). */
function drawPanelPhoto(ctx, img, panel, slot) {
  const iw = img.naturalWidth, ih = img.naturalHeight;
  ctx.save();
  ctx.beginPath();
  ctx.rect(panel.x, panel.y, panel.w, panel.h);
  ctx.clip();
  if (slot.fit === 'contain') {
    // A darkened, stretched copy fills the panel; the whole photo sits on top.
    ctx.save();
    ctx.filter = 'brightness(0.45) blur(6px)';
    const s = Math.max(panel.w / iw, panel.h / ih);
    ctx.drawImage(img, panel.x + (panel.w - iw * s) / 2, panel.y + (panel.h - ih * s) / 2, iw * s, ih * s);
    ctx.restore();
    const f = Math.min(panel.w / iw, panel.h / ih);
    ctx.drawImage(img, panel.x + (panel.w - iw * f) / 2, panel.y + (panel.h - ih * f) / 2, iw * f, ih * f);
  } else {
    const zoom = (slot.viewZoom ?? 1) * (slot.zoom ?? 1);
    let sw = iw / zoom, sh = ih / zoom;
    const pa = panel.w / panel.h;
    if (sw / sh > pa) sw = sh * pa; else sh = sw / pa;
    let sx = (slot.cx ?? 0.5) * iw - sw / 2;
    let sy = (slot.cy ?? 0.5) * ih - sh / 2;
    sx = Math.max(0, Math.min(iw - sw, sx));
    sy = Math.max(0, Math.min(ih - sh, sy));
    ctx.drawImage(img, sx, sy, sw, sh, panel.x, panel.y, panel.w, panel.h);
  }
  ctx.restore();
}

/** A black chip with condensed white text along a panel's foot.
 *  Narrow panels get a two-line chip (place/time over tagline) so the text
 *  never spills past the panel's edge. */
function drawLabelChip(ctx, panel, text, W) {
  const pad = Math.max(8, W * 0.006);
  let size = Math.max(13, Math.min(panel.h * 0.085, W * 0.016));
  ctx.font = `${size}px "Bebas Neue", sans-serif`;
  try { ctx.letterSpacing = '1px'; } catch { /* older canvas */ }
  while (ctx.measureText(text).width > panel.w - pad * 2 - 8 && size > 10) {
    size -= 1;
    ctx.font = `${size}px "Bebas Neue", sans-serif`;
  }
  const fitsOneLine = ctx.measureText(text).width <= panel.w - pad * 2 - 8;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  if (fitsOneLine) {
    const tw = ctx.measureText(text).width;
    const chipH = size * 1.55;
    const chipW = tw + pad * 2;
    const x = panel.x + pad, y = panel.y + panel.h - chipH - pad;
    ctx.fillStyle = 'rgba(8,6,14,0.88)';
    roundRect(ctx, x, y, chipW, chipH, chipH * 0.28);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, x + pad, y + chipH / 2 + size * 0.04);
  } else {
    // Split "PLACE  TIME  —  TAGLINE" into two short lines.
    const parts = text.split(/\s+—\s+/);
    const lines = parts.length === 2 ? parts : [text.slice(0, Math.ceil(text.length / 2)), text.slice(Math.ceil(text.length / 2))];
    const lineH = size * 1.3;
    const chipH = lineH * lines.length + size * 0.5;
    const chipW = Math.max(...lines.map((l) => ctx.measureText(l).width)) + pad * 2;
    const x = panel.x + pad, y = panel.y + panel.h - chipH - pad;
    ctx.fillStyle = 'rgba(8,6,14,0.88)';
    roundRect(ctx, x, y, chipW, chipH, chipH * 0.22);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    lines.forEach((line, i) => ctx.fillText(line, x + pad, y + size * 0.55 + i * lineH));
  }
  try { ctx.letterSpacing = '0px'; } catch { /* older canvas */ }
}

function drawStar(ctx, cx, cy, r, points = 5, inner = 0.45) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const rad = i % 2 === 0 ? r : r * inner;
    const a = (Math.PI * i) / points - Math.PI / 2;
    const px = cx + Math.cos(a) * rad, py = cy + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

/** A palm silhouette: curved trunk and drooping fronds, drawn in one fill. */
function drawPalm(ctx, x, y, s, lean) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.rotate(lean);
  ctx.fillStyle = '#150a1e';
  // Trunk, leaning slightly, narrowing toward the crown.
  ctx.beginPath();
  ctx.moveTo(-7, 0);
  ctx.quadraticCurveTo(-9, -55, -2, -96);
  ctx.lineTo(6, -96);
  ctx.quadraticCurveTo(2, -50, 9, 0);
  ctx.closePath();
  ctx.fill();
  // Fronds: long tapered arcs fanning from the crown, thick enough to read
  // as a silhouette at cover scale; a shorter inner row fills the crown.
  const crownY = -96;
  const frond = (aDeg, len) => {
    const a = aDeg * (Math.PI / 180);
    const tipX = Math.cos(a) * len, tipY = crownY + Math.sin(a) * len * 0.55;
    const midX = Math.cos(a) * len * 0.55, midY = crownY + Math.sin(a) * len * 0.28 - 16;
    ctx.beginPath();
    ctx.moveTo(0, crownY);
    ctx.quadraticCurveTo(midX, midY, tipX, tipY);
    ctx.quadraticCurveTo(midX * 0.7, midY + 28, 0, crownY + 5);
    ctx.closePath();
    ctx.fill();
  };
  for (let i = 0; i < 7; i++) frond(-165 + i * 27, 62 - Math.abs(i - 3) * 7);
  for (let i = 0; i < 5; i++) frond(-140 + i * 35, 40 - Math.abs(i - 2) * 5);
  // Coconuts at the crown.
  ctx.beginPath(); ctx.arc(-6, crownY + 6, 5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(6, crownY + 7, 5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawBarcode(ctx, x, y, w, h, seed) {
  const rnd = mulberry32(seed);
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x - 4, y - 4, w + 8, h + 8);
  ctx.fillStyle = '#12081c';
  let bx = x;
  while (bx < x + w - 2) {
    const bw = 1 + Math.floor(rnd() * 4);
    if (rnd() > 0.42) ctx.fillRect(bx, y, bw, h);
    bx += bw + 1 + Math.floor(rnd() * 3);
  }
  // No number under the bars: it used to run into the fine print.
  ctx.restore();
}

function drawSeal(ctx, cx, cy, r, text) {
  ctx.save();
  ctx.translate(cx, cy);
  const gold = ctx.createLinearGradient(-r, -r, r, r);
  gold.addColorStop(0, '#ffe27a'); gold.addColorStop(0.5, '#e8a91c'); gold.addColorStop(1, '#b97f0a');
  ctx.fillStyle = gold;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#7a5200'; ctx.lineWidth = Math.max(2, r * 0.06);
  ctx.beginPath(); ctx.arc(0, 0, r * 0.82, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#4a2f00';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const parts = String(text).split(' ');
  ctx.font = `bold ${r * 0.42}px "Bebas Neue", sans-serif`;
  ctx.fillText(parts[0] ?? '', 0, -r * 0.22);
  ctx.font = `bold ${r * 0.52}px "Bebas Neue", sans-serif`;
  ctx.fillText(parts[1] ?? '', 0, r * 0.3);
  ctx.restore();
}

function drawStarburst(ctx, cx, cy, r, lines) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = '#ffd23e';
  ctx.strokeStyle = '#12081c';
  ctx.lineWidth = Math.max(2, r * 0.05);
  drawStar(ctx, 0, 0, r, 12, 0.82);
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#12081c';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `bold ${r * 0.24}px "Bebas Neue", sans-serif`;
  lines.forEach((line, i) => ctx.fillText(line, 0, (i - (lines.length - 1) / 2) * r * 0.3));
  ctx.restore();
}

/** The grade as one canvas filter string, scaled by the Strength slider. */
function gradeFilter(grade, strength, contrast, saturation, painterly) {
  const lerp = (base, neutral) => neutral + (base - neutral) * strength;
  const sat = lerp(grade.sat, 1) * saturation;
  const con = lerp(grade.con, 1) * contrast;
  const sep = lerp(grade.sepia, 0);
  const hue = grade.hue * strength;
  const bright = lerp(grade.bright, 1);
  const parts = [
    `saturate(${sat.toFixed(3)})`,
    `contrast(${con.toFixed(3)})`,
    sep > 0.005 ? `sepia(${sep.toFixed(3)})` : '',
    Math.abs(hue) > 0.5 ? `hue-rotate(${hue.toFixed(1)}deg)` : '',
    Math.abs(bright - 1) > 0.005 ? `brightness(${bright.toFixed(3)})` : '',
    painterly > 0.05 ? `blur(${(painterly * 1.6).toFixed(2)}px)` : '',
  ].filter(Boolean);
  return parts.join(' ') || 'none';
}

/**
 * Draws the whole cover. `photos` maps photoId -> HTMLImageElement.
 * `state` is the editor state; `W`,`H` the canvas size in pixels.
 * `highlight` (optional) is a panel index to outline as selected.
 */
export function drawCover(ctx, photos, state, W, H, highlight = -1) {
  const z = zones(H);
  const grade = GRADES[state.grade] ?? GRADES.sunset;
  const gutter = Math.max(6, W * 0.004);

  // Paper: warm cream gutters everywhere.
  ctx.fillStyle = '#fff3e0';
  ctx.fillRect(0, 0, W, H);

  // ---- Collage ----
  const collage = { x: gutter, y: gutter, w: W - gutter * 2, h: z.collage.h - gutter };
  const panels = layoutPanels(state.layout, collage);
  const slots = state.panels.length === panels.length ? state.panels : defaultPanels(state.layout, Object.keys(photos));
  ctx.save();
  ctx.filter = gradeFilter(grade, state.strength, state.contrast, state.saturation, state.painterly);
  panels.forEach((panel, i) => {
    const slot = slots[i];
    const img = photos[slot.photoId];
    if (!img) return;
    const view = (PHOTO_VIEWS[slot.photoId] ?? []).find((v) => v.id === slot.viewId);
    drawPanelPhoto(ctx, img, panel, { ...slot, viewZoom: view ? view.zoom : 1 });
  });
  ctx.restore();
  // Grade tint over the collage.
  if (grade.tint && state.strength > 0.02) {
    ctx.save();
    ctx.globalCompositeOperation = grade.tintMode;
    ctx.globalAlpha = Math.min(1, state.strength + 0.15);
    ctx.fillStyle = grade.tint;
    ctx.fillRect(collage.x, collage.y, collage.w, collage.h);
    ctx.restore();
  }
  // Ink: a hard dark edge on every panel.
  if (state.ink > 0.02) {
    ctx.save();
    ctx.strokeStyle = `rgba(10,5,18,${(state.ink * 0.85).toFixed(2)})`;
    ctx.lineWidth = Math.max(2, W * 0.002 * (1 + state.ink * 2));
    panels.forEach((p) => ctx.strokeRect(p.x, p.y, p.w, p.h));
    ctx.restore();
  }
  // Halftone dots over the collage shadows.
  if (state.halftone > 0.02) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(collage.x, collage.y, collage.w, collage.h);
    ctx.clip();
    ctx.fillStyle = `rgba(20,8,32,${(state.halftone * 0.16).toFixed(2)})`;
    const step = Math.max(7, W * 0.006);
    for (let yy = collage.y + step / 2; yy < collage.y + collage.h; yy += step) {
      for (let xx = collage.x + step / 2; xx < collage.x + collage.w; xx += step) {
        ctx.beginPath();
        ctx.arc(xx, yy, step * 0.14 * state.halftone + 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }
  // Panel label chips.
  if (state.showLabels) {
    panels.forEach((panel, i) => {
      const slot = slots[i];
      if (slot && slot.label) drawLabelChip(ctx, panel, slot.label, W);
    });
  }
  // Corner furniture on the collage.
  const hero = panels[0];
  if (state.showVolume) {
    const tag = state.volume || 'VOL. 06';
    ctx.font = `bold ${Math.max(13, W * 0.014)}px "Bebas Neue", sans-serif`;
    const tw = ctx.measureText(tag).width + W * 0.02;
    const th = Math.max(20, W * 0.02);
    ctx.fillStyle = '#12081c';
    roundRect(ctx, hero.x + gutter, hero.y + gutter, tw, th, th * 0.3);
    ctx.fill();
    ctx.fillStyle = '#ffd23e';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(tag, hero.x + gutter + tw / 2, hero.y + gutter + th / 2 + 1);
  }
  if (state.showBadge) {
    // Starburst on the hero panel's top-right corner.
    drawStarburst(ctx, hero.x + hero.w - W * 0.045, hero.y + W * 0.045, W * 0.04, ['ORIGINAL', 'COVER ART']);
  }
  // The COLLECTOR'S EDITION ribbon is drawn in the title band (small and
  // horizontal), not slashed across the collage — see the title section.
  // HUD chips: WANTED / HEAT with stars, at the top of the right-hand panels
  // (the title sits low, so the bottom of a panel is no place for a chip).
  if (state.hud && panels.length > 1) {
    const chip = (panel, text, stars) => {
      const size = Math.max(12, W * 0.013);
      ctx.font = `bold ${size}px "Bebas Neue", sans-serif`;
      const tw = ctx.measureText(text).width + size * (stars + 1) + W * 0.016;
      const th = size * 1.7;
      const x = panel.x + gutter, y = panel.y + gutter;
      ctx.fillStyle = 'rgba(8,6,14,0.88)';
      roundRect(ctx, x, y, tw, th, th * 0.3);
      ctx.fill();
      ctx.fillStyle = '#ffd23e';
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(text, x + W * 0.008, y + th / 2 + 1);
      let sx = x + W * 0.008 + ctx.measureText(text).width + size * 0.4;
      for (let s = 0; s < stars; s++) {
        drawStar(ctx, sx, y + th / 2, size * 0.42);
        ctx.fill();
        sx += size * 0.95;
      }
    };
    chip(panels[1], (state.hud || 'WANTED').toUpperCase(), state.stars || 5);
    if (panels.length > 2) chip(panels[2], 'HEAT', state.stars || 5);
  }
  // Selected panel outline (editor only).
  if (highlight >= 0 && panels[highlight]) {
    ctx.save();
    ctx.strokeStyle = '#ff2e88';
    ctx.lineWidth = Math.max(3, W * 0.004);
    ctx.strokeRect(panels[highlight].x, panels[highlight].y, panels[highlight].w, panels[highlight].h);
    ctx.restore();
  }

  // ---- Title band: a rich sunset gradient, not empty cream ----
  const bandGrad = ctx.createLinearGradient(0, z.title.y, 0, z.title.y + z.title.h);
  bandGrad.addColorStop(0, '#2a0a3a');
  bandGrad.addColorStop(0.5, '#ff2e88');
  bandGrad.addColorStop(1, '#ff7a1a');
  ctx.fillStyle = bandGrad;
  ctx.fillRect(0, z.title.y, W, z.title.h);
  const title = (state.title || 'VICE TIDE').trim().toUpperCase();
  let titleSize = W * 0.1;
  const titleFont = (s) => `${s}px Anton, "Arial Narrow", sans-serif`;
  ctx.font = titleFont(titleSize);
  while (ctx.measureText(title).width > W * 0.92 && titleSize > 24) {
    titleSize -= 4;
    ctx.font = titleFont(titleSize);
  }
  // Grow the title until it fills the cover (or hits the height cap): the
  // short title needs a big size to span the width. The only cap is the
  // height cap — the title + script must fit inside the band (cap ~0.88em,
  // script descent ~0.46em, script overlapping the title's lower edge), so
  // the title never rises into the collage and covers a panel label chip.
  // The width is bounded by the 0.88W target itself (and the shrink loop
  // above keeps it under 0.92W).
  const sizeCap = H * 0.276;
  while (ctx.measureText(title).width < W * 0.88 && titleSize < sizeCap) {
    titleSize += 4;
    ctx.font = titleFont(titleSize);
  }
  // Centre the title + script block vertically in the band: the script
  // overlaps the title's lower edge and its descenders stay inside the
  // band. (Block height ~1.157em: cap 0.88em + script below the baseline.)
  const subSize = Math.max(28, titleSize * 0.42);
  const blockH = titleSize * 1.157;
  const titleY = z.title.y + (z.title.h - blockH) / 2 + titleSize * 0.88;
  const subY = titleY + subSize * 0.2;
  const grad = ctx.createLinearGradient(W * 0.06, 0, W * 0.94, 0);
  grad.addColorStop(0, '#ff7a1a');
  grad.addColorStop(0.45, '#ffd23e');
  grad.addColorStop(0.75, '#ff5e3a');
  grad.addColorStop(1, '#ff2e88');
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  // Drop shadow: a dark copy offset down-right.
  ctx.font = titleFont(titleSize);
  ctx.fillStyle = 'rgba(20,8,28,0.35)';
  ctx.fillText(title, W / 2 + titleSize * 0.045, titleY + titleSize * 0.05);
  // Thick black outline, then the sunset gradient fill.
  ctx.strokeStyle = '#12081c';
  ctx.lineWidth = Math.max(5, titleSize * 0.075);
  ctx.strokeText(title, W / 2, titleY);
  ctx.fillStyle = grad;
  ctx.fillText(title, W / 2, titleY);
  ctx.restore();
  // Subtitle: neon script overlapping the title's lower edge, drawn last so
  // it is never hidden behind the title. Kept at 0.42x the title so the
  // wide Pacifico script stays narrower than the title itself.
  const subtitle = (state.subtitle || '').trim();
  if (subtitle) {
    ctx.save();
    ctx.font = `${subSize}px Pacifico, cursive`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(255,255,255,0.95)';
    ctx.lineWidth = Math.max(3, subSize * 0.09);
    ctx.strokeText(subtitle, W / 2, subY);
    ctx.fillStyle = '#ff2e88';
    ctx.fillText(subtitle, W / 2, subY);
    ctx.restore();
  }
  // COLLECTOR'S EDITION ribbon: a small horizontal bar tucked into the
  // band's bottom-right corner, clear of the centred script and of every
  // photo face and panel label.
  if (state.showRibbon) {
    const rh = Math.max(18, W * 0.02);
    const rw = W * 0.16;
    const rx = W - rw - W * 0.015;
    const ry = z.title.y + z.title.h - rh - Math.max(6, W * 0.004);
    ctx.save();
    ctx.fillStyle = '#ff2e88';
    ctx.fillRect(rx, ry, rw, rh);
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${rh * 0.52}px "Bebas Neue", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText((state.ribbon || "COLLECTOR'S EDITION").toUpperCase(), rx + rw / 2, ry + rh / 2 + 1);
    ctx.restore();
  }

  // ---- Quote strip ----
  ctx.fillStyle = '#12081c';
  ctx.fillRect(0, z.quote.y, W, z.quote.h);
  const qSize = Math.max(13, z.quote.h * 0.42);
  ctx.save();
  ctx.textBaseline = 'middle';
  try { ctx.letterSpacing = '2px'; } catch { /* older canvas */ }
  ctx.font = `${qSize}px "Bebas Neue", sans-serif`;
  const quoteText = `“${(state.quote || '').toUpperCase()}”  —  ${(state.quoteBy || '').toUpperCase()}`;
  const qw = ctx.measureText(quoteText).width;
  const starR = qSize * 0.42;
  const starsW = (state.stars || 5) * starR * 2.2;
  const totalW = starsW + W * 0.012 + qw;
  let qx = (W - totalW) / 2;
  const qy = z.quote.y + z.quote.h / 2;
  ctx.fillStyle = '#ffd23e';
  for (let s = 0; s < (state.stars || 5); s++) {
    drawStar(ctx, qx + starR, qy, starR);
    ctx.fill();
    qx += starR * 2.2;
  }
  qx += W * 0.012;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.fillText(quoteText, qx, qy + 1);
  try { ctx.letterSpacing = '0px'; } catch { /* older canvas */ }
  ctx.restore();

  // ---- Footer: sunset band, palm silhouettes, tagline, fine print, seal, barcode ----
  const fgrad = ctx.createLinearGradient(0, z.footer.y, W, z.footer.y);
  fgrad.addColorStop(0, '#ff7a1a');
  fgrad.addColorStop(0.5, '#ff2e88');
  fgrad.addColorStop(1, '#5b2a86');
  ctx.fillStyle = fgrad;
  ctx.fillRect(0, z.footer.y, W, z.footer.h);
  const palmScale = z.footer.h / 110;
  drawPalm(ctx, W * 0.03, z.footer.y + z.footer.h, palmScale * 1.05, -0.08);
  drawPalm(ctx, W * 0.085, z.footer.y + z.footer.h, palmScale * 0.8, 0.1);
  drawPalm(ctx, W * 0.965, z.footer.y + z.footer.h, palmScale * 0.95, 0.06);
  // Tagline, wide-tracked small caps, centred between the palms and the
  // barcode: shrink the tracking (then the size) until it fits the gap.
  // The barcode starts at 0.78W, so the centred text may be at most 0.52W.
  const centreGap = W * 0.52;
  let tagSize = Math.max(12, z.footer.h * 0.2);
  let tagTrack = Math.max(3, tagSize * 0.28);
  const tagText = (state.tagline || '').toUpperCase();
  const fitTag = () => {
    ctx.font = `${tagSize}px "Bebas Neue", sans-serif`;
    try { ctx.letterSpacing = `${tagTrack}px`; } catch { /* older canvas */ }
    return ctx.measureText(tagText).width;
  };
  while (fitTag() > centreGap && tagTrack > 1) tagTrack -= 0.5;
  while (fitTag() > centreGap && tagSize > 10) tagSize -= 1;
  ctx.save();
  ctx.font = `${tagSize}px "Bebas Neue", sans-serif`;
  try { ctx.letterSpacing = `${tagTrack}px`; } catch { /* older canvas */ }
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(tagText, W / 2, z.footer.y + z.footer.h * 0.36);
  try { ctx.letterSpacing = '0px'; } catch { /* older canvas */ }
  // Fine print, kept inside the same centre gap as the tagline.
  const fineText = 'VICE TIDE IS FAN FICTION. NOT AFFILIATED WITH OR ENDORSED BY ANY GAME STUDIO. ALL PHOTOS AI-MADE FOR MAKE.FUN.';
  let fineSize = Math.max(8, z.footer.h * 0.085);
  ctx.font = `${fineSize}px sans-serif`;
  while (ctx.measureText(fineText).width > centreGap && fineSize > 7) {
    fineSize -= 0.5;
    ctx.font = `${fineSize}px sans-serif`;
  }
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.fillText(fineText, W / 2, z.footer.y + z.footer.h * 0.78);
  ctx.restore();
  if (state.showBadge) {
    drawSeal(ctx, W * 0.9, z.footer.y + z.footer.h * 0.5, z.footer.h * 0.34, state.badge || 'EST. 2026');
  }
  drawBarcode(ctx, W * 0.78, z.footer.y + z.footer.h * 0.24, W * 0.055, z.footer.h * 0.42, 202606);

  // ---- Grain + vignette over everything ----
  if (state.grain > 0.02) {
    const rnd = mulberry32(1337);
    ctx.save();
    ctx.fillStyle = `rgba(20,8,28,${(state.grain * 0.14).toFixed(2)})`;
    const dots = Math.floor(2200 * state.grain * (W / 1080));
    for (let i = 0; i < dots; i++) {
      ctx.fillRect(rnd() * W, rnd() * H, 1 + rnd() * 1.6, 1 + rnd() * 1.6);
    }
    ctx.fillStyle = `rgba(255,255,255,${(state.grain * 0.07).toFixed(2)})`;
    for (let i = 0; i < dots / 2; i++) {
      ctx.fillRect(rnd() * W, rnd() * H, 1 + rnd() * 1.4, 1 + rnd() * 1.4);
    }
    ctx.restore();
  }
  if (state.vignette > 0.02) {
    const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.75);
    vg.addColorStop(0, 'rgba(10,5,20,0)');
    vg.addColorStop(1, `rgba(10,5,20,${(state.vignette * 0.5).toFixed(2)})`);
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
  }
}

/** Loads the three vendored display fonts so canvas text uses them, not fallbacks. */
export async function ensureFonts() {
  const loads = [
    document.fonts.load('100px Anton'),
    document.fonts.load('100px Pacifico'),
    document.fonts.load('100px "Bebas Neue"'),
  ];
  await Promise.all(loads.map((p) => p.catch(() => {})));
  await document.fonts.ready;
}
