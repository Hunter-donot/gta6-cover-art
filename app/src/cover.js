// cover.js — VICE TIDE cover renderer.
// Draws a GTA 6-style cover: golden-hour photo collage, huge sunset
// title, pink script subtitle, label chips, badges, barcode.
// Pure canvas 2d. No network, no dependencies.

export const LAYOUTS = ["hero7", "hero5", "grid6", "duo", "triptych", "strip"];
export const GRADES = ["sunset", "golden", "neon", "miami", "teal", "noir"];
export const SIZES = {
  square: [1080, 1080],
  portrait: [1080, 1350],
  landscape: [1920, 1080],
};

export const DEFAULTS = {
  title: "VICE TIDE",
  script: "Saltwater Nights",
  quote: "Every sunset is a getaway.",
  photo: "boulevard",
  layout: "hero7",
  grade: "sunset",
  strength: 1.0,
  size: "square",
};

// Per-panel captions: place, time, tagline.
export const PANEL_CAPTIONS = [
  { place: "VICE CITY", time: "6:47 PM", tag: "Golden Hour" },
  { place: "OCEAN DRIVE", time: "7:02 PM", tag: "Neon Mile" },
  { place: "THE PIER", time: "6:31 PM", tag: "Last Light" },
  { place: "BOULEVARD", time: "7:15 PM", tag: "Heat Rising" },
  { place: "LEONIDA KEYS", time: "5:58 PM", tag: "Salt Air" },
  { place: "DOWNTOWN", time: "8:04 PM", tag: "City Glow" },
  { place: "THE MARINA", time: "6:20 PM", tag: "Low Tide" },
];

const GUTTER = 0.012; // white gutter as a fraction of width

export function ellipsize(ctx, text, maxW) {
  if (ctx.measureText(text).width <= maxW) return text;
  const ell = "…";
  let lo = 0;
  let hi = text.length;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    const t = text.slice(0, mid) + ell;
    if (ctx.measureText(t).width <= maxW) lo = mid;
    else hi = mid - 1;
  }
  return text.slice(0, lo) + ell;
}

function rr(ctx, x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

function fitFont(ctx, text, fontFamily, maxW, startPx, minPx) {
  let px = startPx;
  while (px > minPx) {
    ctx.font = `900 ${px}px ${fontFamily}`;
    if (ctx.measureText(text).width <= maxW) return px;
    px -= 2;
  }
  ctx.font = `900 ${minPx}px ${fontFamily}`;
  return minPx;
}

function drawStar(ctx, cx, cy, r, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const ang = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 === 0 ? r : r * 0.45;
    const x = cx + Math.cos(ang) * rad;
    const y = cy + Math.sin(ang) * rad;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawBarcode(ctx, x, y, w, h) {
  // Bars only — no number line.
  ctx.save();
  ctx.fillStyle = "#111";
  let bx = x;
  let seed = 7;
  while (bx < x + w - 2) {
    seed = (seed * 37 + 11) % 97;
    const bw = 1 + (seed % 4);
    if (seed % 3 !== 0) ctx.fillRect(bx, y, bw, h);
    bx += bw + 1 + (seed % 2);
  }
  ctx.restore();
}

function drawPalm(ctx, x, y, s, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(1, s * 0.06);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + s * 0.08, y - s * 0.7, x + s * 0.18, y - s * 0.95);
  ctx.stroke();
  for (let i = 0; i < 5; i++) {
    const a = (-Math.PI / 6) - (i * Math.PI) / 9 + Math.PI / 9;
    const tx = x + s * 0.18 + Math.cos(a) * s * 0.55;
    const ty = y - s * 0.95 + Math.sin(a) * s * 0.28 - s * 0.12;
    ctx.beginPath();
    ctx.moveTo(x + s * 0.18, y - s * 0.95);
    ctx.quadraticCurveTo(
      x + s * 0.18 + Math.cos(a) * s * 0.3,
      y - s * 0.95 + Math.sin(a) * s * 0.5,
      tx, ty
    );
    ctx.stroke();
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Geometry
// ---------------------------------------------------------------------------

// Returns { band, collage, panels } for a canvas of w x h.
// band: the title band rect at the bottom. collage: the photo area above it.
// panels: [{ x, y, w, h, hero }] in draw order.
export function coverGeometry(w, h, layout = "hero7") {
  const g = Math.max(4, Math.round(w * GUTTER));
  const bandH = Math.round(h * 0.26);
  const collage = { x: 0, y: 0, w, h: h - bandH };
  const band = { x: 0, y: h - bandH, w, h: bandH };
  const panels = [];

  const inset = (x, y, pw, ph, hero = false) => ({
    x: x + g, y: y + g, w: pw - g * 2, h: ph - g * 2, hero,
  });

  if (layout === "hero7") {
    // Hero left (~58%), 2 cols x 3 rows right.
    const heroW = Math.round(collage.w * 0.58);
    panels.push(inset(0, 0, heroW, collage.h, true));
    const rx = heroW;
    const rw = collage.w - heroW;
    const cw = rw / 2;
    const rh = collage.h / 3;
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 2; c++) {
        panels.push(inset(rx + c * cw, r * rh, cw, rh));
      }
    }
  } else if (layout === "hero5") {
    const heroW = Math.round(collage.w * 0.62);
    panels.push(inset(0, 0, heroW, collage.h, true));
    const rx = heroW;
    const rw = collage.w - heroW;
    const rh = collage.h / 2;
    for (let r = 0; r < 2; r++) {
      panels.push(inset(rx, r * rh, rw / 2, rh));
      panels.push(inset(rx + rw / 2, r * rh, rw / 2, rh));
    }
  } else if (layout === "grid6") {
    const cw = collage.w / 3;
    const rh = collage.h / 2;
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 3; c++) {
        panels.push(inset(c * cw, r * rh, cw, rh, r === 0 && c === 0));
      }
    }
  } else if (layout === "duo") {
    const hw = collage.w / 2;
    panels.push(inset(0, 0, hw, collage.h, true));
    panels.push(inset(hw, 0, hw, collage.h));
  } else if (layout === "triptych") {
    const tw = collage.w / 3;
    for (let c = 0; c < 3; c++) {
      panels.push(inset(c * tw, 0, tw, collage.h, c === 1));
    }
  } else {
    // strip: one wide hero + a filmstrip row under it.
    const heroH = Math.round(collage.h * 0.66);
    panels.push(inset(0, 0, collage.w, heroH, true));
    const sw = collage.w / 4;
    for (let c = 0; c < 4; c++) {
      panels.push(inset(c * sw, heroH, sw, collage.h - heroH));
    }
  }
  return { band, collage, panels, gutter: g };
}

// ---------------------------------------------------------------------------
// Grades
// ---------------------------------------------------------------------------

const GRADE_STOPS = {
  sunset: ["rgba(255,94,0,0.34)", "rgba(255,0,110,0.30)", "rgba(90,0,140,0.22)"],
  golden: ["rgba(255,176,0,0.32)", "rgba(255,120,0,0.26)", "rgba(120,40,0,0.14)"],
  neon: ["rgba(0,229,255,0.24)", "rgba(180,0,255,0.30)", "rgba(255,0,128,0.20)"],
  miami: ["rgba(255,0,128,0.34)", "rgba(255,90,180,0.26)", "rgba(0,200,255,0.16)"],
  teal: ["rgba(0,200,190,0.30)", "rgba(0,120,200,0.24)", "rgba(0,40,90,0.18)"],
  noir: ["rgba(0,0,0,0.30)", "rgba(40,40,60,0.22)", "rgba(0,0,0,0.34)"],
};

function applyGrade(ctx, rect, grade, strength) {
  if (strength <= 0) return;
  const stops = GRADE_STOPS[grade] || GRADE_STOPS.sunset;
  const grad = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
  grad.addColorStop(0, stops[0]);
  grad.addColorStop(0.55, stops[1]);
  grad.addColorStop(1, stops[2]);
  ctx.save();
  ctx.globalAlpha = Math.min(1, strength);
  ctx.globalCompositeOperation = "overlay";
  ctx.fillStyle = grad;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.globalCompositeOperation = "soft-light";
  ctx.fillStyle = grad;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.restore();
  // Warm vignette so faces stay bright and edges fall off.
  const vg = ctx.createRadialGradient(
    rect.x + rect.w / 2, rect.y + rect.h / 2, Math.min(rect.w, rect.h) * 0.35,
    rect.x + rect.w / 2, rect.y + rect.h / 2, Math.max(rect.w, rect.h) * 0.75
  );
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, `rgba(20,0,30,${0.22 * strength})`);
  ctx.save();
  ctx.fillStyle = vg;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Photo + chip drawing
// ---------------------------------------------------------------------------

function drawPhotoCover(ctx, img, rect, focalY = 0.5) {
  if (!img || !img.naturalWidth) {
    ctx.save();
    ctx.fillStyle = "#2a1230";
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.restore();
    return;
  }
  const scale = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight);
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  // focalY 0 = show the top of the photo, 0.5 = centre. Hero panels use a
  // top-biased focal point so the face survives wide crops.
  const dx = rect.x + (rect.w - dw) / 2;
  const dy = rect.y + (rect.h - dh) * focalY;
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
}

function drawChip(ctx, panel, caption, small) {
  const padX = Math.max(6, panel.w * 0.02);
  const chipH = Math.max(20, Math.round(panel.h * 0.09));
  const fontPx = Math.max(11, Math.round(chipH * 0.44));
  ctx.save();
  // Clip chip text to its own panel so it can never spill into a neighbour.
  ctx.beginPath();
  ctx.rect(panel.x, panel.y, panel.w, panel.h);
  ctx.clip();
  ctx.font = `700 ${fontPx}px "Bebas Neue", "Anton", sans-serif`;
  const full = `${caption.place}  •  ${caption.time}  •  ${caption.tag}`;
  const compact = `${caption.place} — ${caption.tag}`;
  const maxTextW = panel.w - padX * 2 - 8;
  let label = full;
  if (ctx.measureText(full).width > maxTextW) {
    label = ctx.measureText(compact).width <= maxTextW
      ? compact
      : ellipsize(ctx, compact, maxTextW);
  }
  const textW = ctx.measureText(label).width;
  const chipW = Math.min(panel.w - 8, textW + padX * 2);
  const cx = panel.x + 6;
  const cy = panel.y + panel.h - chipH - 6;
  ctx.fillStyle = "rgba(10,10,16,0.78)";
  rr(ctx, cx, cy, chipW, chipH, chipH / 2);
  ctx.fill();
  ctx.fillStyle = "#ffe9a8";
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.fillText(label, cx + padX, cy + chipH / 2 + 1);
  ctx.restore();
}

function drawStarChip(ctx, x, y, label, stars) {
  const fontPx = 15;
  ctx.save();
  ctx.font = `800 ${fontPx}px "Bebas Neue", "Anton", sans-serif`;
  const labelW = ctx.measureText(label).width;
  const starR = fontPx * 0.42;
  const gap = 3;
  const padX = 10;
  const chipW = padX * 2 + labelW + 8 + stars * (starR * 2 + gap);
  const chipH = fontPx + 14;
  ctx.fillStyle = "rgba(10,10,16,0.82)";
  rr(ctx, x, y, chipW, chipH, chipH / 2);
  ctx.fill();
  ctx.fillStyle = "#ffd23f";
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.fillText(label, x + padX, y + chipH / 2 + 1);
  let sx = x + padX + labelW + 8 + starR;
  for (let i = 0; i < stars; i++) {
    drawStar(ctx, sx, y + chipH / 2, starR, "#ffd23f");
    sx += starR * 2 + gap;
  }
  ctx.restore();
  return chipW;
}

function drawCornerBadge(ctx, x, y, text, w) {
  const fontPx = Math.max(12, Math.round(w * 0.14));
  ctx.save();
  ctx.font = `800 ${fontPx}px "Bebas Neue", "Anton", sans-serif`;
  const tw = ctx.measureText(text).width;
  const bw = Math.max(w, tw + 16);
  const bh = fontPx + 10;
  ctx.fillStyle = "rgba(10,10,16,0.80)";
  rr(ctx, x, y, bw, bh, 3);
  ctx.fill();
  ctx.strokeStyle = "#ffd23f";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = "#ffd23f";
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.fillText(text, x + bw / 2, y + bh / 2 + 1);
  ctx.restore();
  return bw;
}

// ---------------------------------------------------------------------------
// Title band, script, ribbon, footer
// ---------------------------------------------------------------------------

function drawTitleBand(ctx, band, opts) {
  const { w } = band;
  // Rich sunset gradient band — never cream.
  const grad = ctx.createLinearGradient(band.x, band.y, band.x + band.w, band.y);
  grad.addColorStop(0, "#5b1a8a");
  grad.addColorStop(0.35, "#c81d6b");
  grad.addColorStop(0.65, "#ff5e3a");
  grad.addColorStop(1, "#ff9e2c");
  ctx.save();
  ctx.fillStyle = grad;
  ctx.fillRect(band.x, band.y, band.w, band.h);
  // Thin dark edge above the band.
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(band.x, band.y, band.w, 3);

  const title = (opts.title || DEFAULTS.title).toUpperCase();
  // Grow the title until it spans ~95% of the width, or the band height
  // caps it (landscape). Baseline at 0.52 of the band height so the whole
  // title — glyphs, outline and shadow — stays inside the band.
  const maxW = w * 0.95;
  const capPx = Math.floor(band.h * 0.52);
  let px = 40;
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "center";
  while (px < capPx) {
    ctx.font = `900 ${px + 2}px Anton, "Bebas Neue", sans-serif`;
    if (ctx.measureText(title).width > maxW) break;
    px += 2;
  }
  ctx.font = `900 ${px}px Anton, "Bebas Neue", sans-serif`;
  if (ctx.measureText(title).width > maxW) {
    px = fitFont(ctx, title, `Anton, "Bebas Neue", sans-serif`, maxW, px, 20);
  }
  const baselineY = band.y + band.h * 0.52;
  const cx = band.x + band.w / 2;
  // White title with a sunset echo: fill white, thick black outline, then a
  // soft warm shadow. Gradient fill lives in the band itself.
  ctx.lineJoin = "round";
  ctx.miterLimit = 2;
  ctx.shadowColor = "rgba(60,0,40,0.55)";
  ctx.shadowBlur = Math.max(4, px * 0.06);
  ctx.shadowOffsetY = Math.max(2, px * 0.03);
  ctx.strokeStyle = "#0d0d0d";
  ctx.lineWidth = Math.max(3, px * 0.14);
  ctx.strokeText(title, cx, baselineY);
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  const tgrad = ctx.createLinearGradient(cx, baselineY - px, cx, baselineY + px * 0.2);
  tgrad.addColorStop(0, "#ffffff");
  tgrad.addColorStop(0.55, "#fff3d6");
  tgrad.addColorStop(1, "#ffb35c");
  ctx.fillStyle = tgrad;
  ctx.fillText(title, cx, baselineY);

  // Script subtitle, overlapping the title's lower edge, fully legible.
  const script = opts.script || DEFAULTS.script;
  const sPx = Math.max(20, Math.round(px * 0.34));
  ctx.font = `${sPx}px Pacifico, cursive`;
  const sY = baselineY + sPx * 0.72;
  ctx.lineWidth = Math.max(3, sPx * 0.16);
  ctx.strokeStyle = "#ffffff";
  ctx.strokeText(script, cx, sY);
  ctx.fillStyle = "#ff2e88";
  ctx.fillText(script, cx, sY);

  // COLLECTOR'S EDITION — small bar in the band's bottom-right corner,
  // clear of the palm strip along the very bottom edge.
  const stripH = Math.max(14, Math.round((band.y + band.h) * 0.018));
  const ceText = "COLLECTOR'S EDITION";
  const cePx = Math.max(11, Math.round(band.h * 0.085));
  ctx.font = `800 ${cePx}px "Bebas Neue", "Anton", sans-serif`;
  const ceW = ctx.measureText(ceText).width + 18;
  const ceH = cePx + 8;
  const ceX = band.x + band.w - ceW - 10;
  const ceY = band.y + band.h - ceH - stripH - 6;
  ctx.fillStyle = "rgba(10,10,16,0.85)";
  rr(ctx, ceX, ceY, ceW, ceH, 3);
  ctx.fill();
  ctx.strokeStyle = "#ffd23f";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = "#ffd23f";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(ceText, ceX + ceW / 2, ceY + ceH / 2 + 1);

  // Barcode (bars only) + disclaimer, bottom-left of the band, clear of
  // the palm strip along the very bottom edge.
  const bcW = Math.max(64, Math.round(w * 0.09));
  const bcH = Math.max(16, Math.round(band.h * 0.20));
  const bcX = band.x + 12;
  const bcY = band.y + band.h - bcH - stripH - 6;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(bcX - 4, bcY - 4, bcW + 8, bcH + 8);
  drawBarcode(ctx, bcX, bcY, bcW, bcH);
  const dPx = Math.max(9, Math.round(band.h * 0.055));
  ctx.font = `${dPx}px "Bebas Neue", "Anton", sans-serif`;
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  const disc = "A fan-made cover. Not affiliated with Rockstar Games.";
  ctx.fillText(disc, bcX + bcW + 14, bcY + bcH / 2 + 1);
  ctx.restore();
}

function drawRibbon(ctx, rect, text) {
  // Diagonal corner ribbon, top-right of the collage.
  const rw = Math.max(90, rect.w * 0.22);
  const rh = Math.max(20, rect.h * 0.045);
  ctx.save();
  ctx.translate(rect.x + rect.w, rect.y);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = "#ff2e88";
  ctx.fillRect(-rw / 2, -rh / 2, rw, rh);
  ctx.fillStyle = "#ffffff";
  ctx.font = `800 ${Math.round(rh * 0.55)}px "Bebas Neue", "Anton", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 0, 1);
  ctx.restore();
}

function drawPalmStrip(ctx, w, h) {
  const stripH = Math.max(14, Math.round(h * 0.018));
  const y = h - stripH;
  ctx.save();
  ctx.fillStyle = "rgba(8,4,14,0.9)";
  ctx.fillRect(0, y, w, stripH);
  const s = stripH * 1.5;
  for (let x = 8; x < w; x += Math.round(s * 2.2)) {
    drawPalm(ctx, x, y + stripH - 2, s, "rgba(255,180,90,0.85)");
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Main entry
// ---------------------------------------------------------------------------

// opts: { w, h, images, photo, title, script, quote, layout, grade,
//         strength, ribbon }
// images: { boulevard: HTMLImageElement, pier: HTMLImageElement }
export function drawCover(ctx, opts = {}) {
  const o = { ...DEFAULTS, ...opts };
  const w = o.w;
  const h = o.h;
  const geo = coverGeometry(w, h, o.layout);

  // White canvas + gutters.
  ctx.save();
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);

  // Photos.
  const heroImg = (o.images && o.images[o.photo]) || (o.images && o.images.boulevard);
  const altImg = (o.images && o.images.pier) || heroImg;
  geo.panels.forEach((p, i) => {
    const img = p.hero ? heroImg : (i % 2 === 0 ? altImg : heroImg);
    drawPhotoCover(ctx, img, p, p.hero ? 0.12 : 0.5);
  });

  // Grade over the whole collage.
  applyGrade(ctx, geo.collage, o.grade, o.strength);

  // Label chips on every panel.
  geo.panels.forEach((p, i) => {
    const cap = PANEL_CAPTIONS[i % PANEL_CAPTIONS.length];
    drawChip(ctx, p, cap, p.w < w * 0.2);
  });

  // Badges on the collage.
  const badgeY = geo.collage.y + 10;
  drawCornerBadge(ctx, geo.collage.x + 10, badgeY, "EST. 2026", Math.max(64, w * 0.075));
  const volW = drawCornerBadge(ctx, geo.collage.x + 10, badgeY + 34, "VOL. 06", Math.max(56, w * 0.065));
  void volW;
  const hero = geo.panels[0];
  drawStarChip(ctx, hero.x + hero.w - 190, hero.y + 10, "WANTED", 5);
  drawStarChip(ctx, hero.x + hero.w - 190, hero.y + 44, "HEAT", 5);
  if (o.ribbon) drawRibbon(ctx, geo.collage, o.ribbon);

  // Quote line, bottom of the collage, clear above the title band.
  if (o.quote) {
    const qPx = Math.max(14, Math.round(w * 0.018));
    ctx.save();
    ctx.font = `italic 700 ${qPx}px Georgia, serif`;
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.shadowColor = "rgba(0,0,0,0.7)";
    ctx.shadowBlur = 6;
    ctx.fillText(`“${o.quote}”`, w / 2, geo.collage.h - 34);
    ctx.restore();
  }

  // Title band + script + barcode + collector bar.
  drawTitleBand(ctx, geo.band, o);

  // Palm strip along the very bottom edge.
  drawPalmStrip(ctx, w, h);
  ctx.restore();
}
