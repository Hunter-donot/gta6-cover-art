// VICE TIDE Cover Studio — cover renderer.
// Draws the golden-hour cover: a photo collage, a sunset-gradient title band,
// a pink script subtitle, and the full badge set. Plain ES module, no deps.

export const PHOTOS = {
  boulevard: {
    src: 'samples/boulevard.jpg',
    label: 'OCEAN DRIVE',
    time: '6:42 PM',
    tag: 'LOOKING FOR TROUBLE',
  },
  pier: {
    src: 'samples/pier.jpg',
    label: 'PIER 26',
    time: '6:30 AM',
    tag: 'GONE FISHING',
  },
};

// Per-panel label lines (place + time + tag). The collage reuses the two
// sample photos with different crops; each panel gets its own label.
export const PANEL_LABELS = [
  { photo: 'boulevard', label: 'OCEAN DRIVE', time: '6:42 PM', tag: 'LOOKING FOR TROUBLE' },
  { photo: 'boulevard', label: 'MARINA DEL SOL', time: '7:40 PM', tag: 'NO WITNESSES' },
  { photo: 'boulevard', label: 'BOARDWALK', time: '6:15 PM', tag: 'SUNSET CHASERS' },
  { photo: 'pier', label: 'PIER 26', time: '6:30 AM', tag: 'GONE FISHING' },
  { photo: 'pier', label: 'THE REEL DEAL', time: '5:45 AM', tag: 'ONE MORE CAST' },
  { photo: 'pier', label: 'TURQUOISE BAY', time: '11:12 AM', tag: 'NO BAD DAYS' },
  { photo: 'boulevard', label: 'PALM ROW', time: '6:05 PM', tag: 'GOLDEN HOUR' },
];

export const LAYOUTS = {
  hero7: { name: 'Hero 7', panels: 7 },
  hero5: { name: 'Hero 5', panels: 5 },
  grid6: { name: 'Grid 6', panels: 6 },
  trio: { name: 'Trio', panels: 3 },
  single: { name: 'Single', panels: 1 },
  strip5: { name: 'Strip 5', panels: 5 },
};

export const GRADES = {
  sunset: { name: 'Vice Sunset', tint: 'rgba(255,110,30,0.20)', warm: 'rgba(255,190,70,0.12)', cool: 'rgba(60,10,60,0.10)' },
  golden: { name: 'Golden Hour', tint: 'rgba(255,170,40,0.18)', warm: 'rgba(255,220,120,0.10)', cool: 'rgba(0,0,0,0.00)' },
  neon: { name: 'Neon Nights', tint: 'rgba(255,40,140,0.16)', warm: 'rgba(40,200,255,0.08)', cool: 'rgba(20,0,60,0.14)' },
  noir: { name: 'Noir', tint: 'rgba(0,0,0,0.22)', warm: 'rgba(255,255,255,0.05)', cool: 'rgba(0,0,20,0.18)' },
  vintage: { name: 'Vintage', tint: 'rgba(200,150,60,0.20)', warm: 'rgba(255,230,160,0.10)', cool: 'rgba(40,20,0,0.10)' },
  teal: { name: 'Teal Coast', tint: 'rgba(0,180,170,0.14)', warm: 'rgba(255,200,90,0.08)', cool: 'rgba(0,40,60,0.12)' },
};

export const EXPORT_SIZES = {
  square: { name: 'Square 1080 × 1080', w: 1080, h: 1080 },
  portrait: { name: 'Portrait 1080 × 1350', w: 1080, h: 1350 },
  landscape: { name: 'Landscape 1920 × 1080', w: 1920, h: 1080 },
};

export function defaultState() {
  return {
    layout: 'hero7',
    grade: 'sunset',
    strength: 1.0,
    photo: 'boulevard',
    title: 'VICE TIDE',
    script: 'Saltwater Nights',
    quote: 'NEON, SALT AND FIVE STARS OF TROUBLE',
    tagline: 'ONE COAST • NO RULES • COMING SOON',
  };
}

// Shared geometry: one helper so the script, quote and ribbon never overlap.
export function coverGeometry(W, H) {
  const collageH = Math.round(H * 0.46);
  const bandH = Math.round(H * 0.30);
  const quoteH = Math.round(H * 0.07);
  const footerH = H - collageH - bandH - quoteH;
  return {
    collage: { x: 0, y: 0, w: W, h: collageH },
    band: { x: 0, y: collageH, w: W, h: bandH },
    quote: { x: 0, y: collageH + bandH, w: W, h: quoteH },
    footer: { x: 0, y: collageH + bandH + quoteH, w: W, h: footerH },
  };
}

// Lay out the collage panels for a layout. Returns [{x,y,w,h,photo,focusY,label}].
export function layoutPanels(layout, W, H) {
  const g = coverGeometry(W, H);
  const c = g.collage;
  const gut = Math.max(3, Math.round(W * 0.004));
  const panels = [];
  const pick = (i) => PANEL_LABELS[i % PANEL_LABELS.length];
  if (layout === 'hero7') {
    const heroW = Math.round(c.w * 0.55);
    const rightX = heroW + gut;
    const rightW = c.w - rightX;
    const topH = Math.round(c.h * 0.55);
    const botY = topH + gut;
    const botH = c.h - botY;
    panels.push({ x: c.x, y: c.y, w: heroW, h: c.h, ...pick(0), focusY: 0.32 });
    const topW = Math.round((rightW - gut) / 2);
    panels.push({ x: rightX, y: c.y, w: topW, h: topH, ...pick(1), focusY: 0.30 });
    panels.push({ x: rightX + topW + gut, y: c.y, w: rightW - topW - gut, h: topH, ...pick(2), focusY: 0.35 });
    const bw = Math.round((rightW - 3 * gut) / 4);
    for (let i = 0; i < 4; i++) {
      panels.push({ x: rightX + i * (bw + gut), y: botY, w: i === 3 ? rightW - 3 * (bw + gut) : bw, h: botH, ...pick(3 + i), focusY: 0.42 });
    }
  } else if (layout === 'hero5') {
    const heroW = Math.round(c.w * 0.55);
    const rightX = heroW + gut;
    const rightW = c.w - rightX;
    const topH = Math.round(c.h * 0.55);
    const botY = topH + gut;
    const botH = c.h - botY;
    panels.push({ x: c.x, y: c.y, w: heroW, h: c.h, ...pick(0), focusY: 0.32 });
    const topW = Math.round((rightW - gut) / 2);
    panels.push({ x: rightX, y: c.y, w: topW, h: topH, ...pick(1), focusY: 0.30 });
    panels.push({ x: rightX + topW + gut, y: c.y, w: rightW - topW - gut, h: topH, ...pick(2), focusY: 0.35 });
    panels.push({ x: rightX, y: botY, w: topW, h: botH, ...pick(3), focusY: 0.42 });
    panels.push({ x: rightX + topW + gut, y: botY, w: rightW - topW - gut, h: botH, ...pick(4), focusY: 0.42 });
  } else if (layout === 'grid6') {
    const cw = Math.round((c.w - 2 * gut) / 3);
    const ch = Math.round((c.h - gut) / 2);
    for (let r = 0; r < 2; r++) {
      for (let col = 0; col < 3; col++) {
        const i = r * 3 + col;
        panels.push({ x: c.x + col * (cw + gut), y: c.y + r * (ch + gut), w: cw, h: ch, ...pick(i), focusY: 0.35 });
      }
    }
  } else if (layout === 'trio') {
    const heroW = Math.round(c.w * 0.55);
    const rightX = heroW + gut;
    const rightW = c.w - rightX;
    const halfH = Math.round((c.h - gut) / 2);
    panels.push({ x: c.x, y: c.y, w: heroW, h: c.h, ...pick(0), focusY: 0.32 });
    panels.push({ x: rightX, y: c.y, w: rightW, h: halfH, ...pick(1), focusY: 0.30 });
    panels.push({ x: rightX, y: c.y + halfH + gut, w: rightW, h: c.h - halfH - gut, ...pick(3), focusY: 0.42 });
  } else if (layout === 'strip5') {
    const sw = Math.round((c.w - 4 * gut) / 5);
    for (let i = 0; i < 5; i++) {
      panels.push({ x: c.x + i * (sw + gut), y: c.y, w: i === 4 ? c.w - 4 * (sw + gut) : sw, h: c.h, ...pick(i), focusY: 0.35 });
    }
  } else {
    // single
    panels.push({ x: c.x, y: c.y, w: c.w, h: c.h, ...pick(0), focusY: 0.32 });
  }
  return panels;
}

function ellipsize(ctx, text, maxW) {
  if (ctx.measureText(text).width <= maxW) return text;
  const ell = '…';
  let lo = 0;
  let hi = text.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (ctx.measureText(text.slice(0, mid) + ell).width <= maxW) lo = mid;
    else hi = mid - 1;
  }
  return text.slice(0, Math.max(0, lo)) + ell;
}

function drawImageCover(ctx, img, x, y, w, h, focusY = 0.5) {
  if (!img || !img.naturalWidth) return;
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  const scale = Math.max(w / iw, h / ih);
  const sw = w / scale;
  const sh = h / scale;
  const sx = (iw - sw) / 2;
  const sy = Math.max(0, Math.min(ih - sh, (ih - sh) * focusY));
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

function applyGrade(ctx, gradeKey, strength, x, y, w, h) {
  const g = GRADES[gradeKey] || GRADES.sunset;
  const s = Math.max(0, Math.min(1.5, strength));
  ctx.save();
  ctx.globalAlpha = Math.min(1, s);
  ctx.fillStyle = g.tint;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = g.warm;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = g.cool;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function drawChip(ctx, x, y, w, h, text) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.fillStyle = 'rgba(0,0,0,0.72)';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#fff';
  let px = Math.round(h * 0.52);
  ctx.font = `700 ${px}px "Bebas Neue", "Anton", sans-serif`;
  while (px > 8 && ctx.measureText(text).width > w - 10) {
    px -= 1;
    ctx.font = `700 ${px}px "Bebas Neue", "Anton", sans-serif`;
  }
  ctx.textBaseline = 'middle';
  ctx.fillText(ellipsize(ctx, text, w - 10), x + 5, y + h / 2 + 1);
  ctx.restore();
}

function drawPill(ctx, x, y, text, fontPx, fg, bg) {
  ctx.save();
  ctx.font = `700 ${fontPx}px "Bebas Neue", "Anton", sans-serif`;
  const tw = ctx.measureText(text).width;
  const pad = Math.round(fontPx * 0.55);
  const w = tw + pad * 2;
  const h = Math.round(fontPx * 1.7);
  ctx.fillStyle = bg;
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fill();
  ctx.fillStyle = fg;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + pad, y + h / 2 + 1);
  ctx.restore();
  return w;
}

function drawStarburst(ctx, cx, cy, r, label, sub) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = '#ffd21f';
  ctx.strokeStyle = '#111';
  ctx.lineWidth = Math.max(2, r * 0.08);
  ctx.beginPath();
  const spikes = 12;
  for (let i = 0; i < spikes * 2; i++) {
    const ang = (Math.PI * i) / spikes - Math.PI / 2;
    const rad = i % 2 === 0 ? r : r * 0.72;
    const px = Math.cos(ang) * rad;
    const py = Math.sin(ang) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#111';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  let lp = Math.round(r * 0.34);
  ctx.font = `700 ${lp}px "Anton", sans-serif`;
  while (lp > 8 && ctx.measureText(label).width > r * 1.5) {
    lp -= 1;
    ctx.font = `700 ${lp}px "Anton", sans-serif`;
  }
  ctx.fillText(label, 0, -r * 0.10);
  let sp = Math.round(r * 0.26);
  ctx.font = `700 ${sp}px "Bebas Neue", "Anton", sans-serif`;
  while (sp > 7 && ctx.measureText(sub).width > r * 1.4) {
    sp -= 1;
    ctx.font = `700 ${sp}px "Bebas Neue", "Anton", sans-serif`;
  }
  ctx.fillText(sub, 0, r * 0.28);
  ctx.restore();
}

function drawBarcode(ctx, x, y, w, h) {
  ctx.save();
  ctx.fillStyle = '#fff';
  ctx.fillRect(x - 4, y - 3, w + 8, h + 6);
  ctx.fillStyle = '#111';
  let cx = x;
  let seed = 7;
  while (cx < x + w - 2) {
    seed = (seed * 37 + 11) % 97;
    const bw = 1 + (seed % 3);
    if (seed % 3 !== 0) ctx.fillRect(cx, y, bw, h);
    cx += bw + 1 + (seed % 2);
  }
  ctx.restore();
}

function drawPalm(ctx, x, y, s, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(4, -30, 2, -52);
  ctx.stroke();
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI * (0.08 + i * 0.16);
    ctx.beginPath();
    ctx.moveTo(2, -52);
    ctx.quadraticCurveTo(2 + Math.cos(a) * 26, -52 + Math.sin(a) * 22, 2 + Math.cos(a) * 44, -52 + Math.sin(a) * 34);
    ctx.stroke();
  }
  ctx.restore();
}

// The main entry: draw the whole cover onto ctx at W x H.
// images: { boulevard: HTMLImageElement, pier: HTMLImageElement }
export function drawCover(ctx, state, W, H, images) {
  const g = coverGeometry(W, H);
  ctx.save();
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, W, H);

  // ---- collage ----
  const panels = layoutPanels(state.layout, W, H);
  for (const p of panels) {
    const img = images[p.photo] || images.boulevard;
    drawImageCover(ctx, img, p.x, p.y, p.w, p.h, p.focusY);
    applyGrade(ctx, state.grade, state.strength, p.x, p.y, p.w, p.h);
    // label chip: full line, else compact (drop the time, keep place + tag)
    const chipH = Math.max(16, Math.round(p.h * 0.10));
    const chipY = p.y + p.h - chipH;
    const full = `${p.label}  ${p.time}  —  ${p.tag}`;
    ctx.font = `700 ${Math.round(chipH * 0.52)}px "Bebas Neue", "Anton", sans-serif`;
    if (ctx.measureText(full).width <= p.w - 10) {
      drawChip(ctx, p.x, chipY, p.w, chipH, full);
    } else {
      drawChip(ctx, p.x, chipY, p.w, chipH, `${p.label} — ${p.tag}`);
    }
  }

  // ---- collage badges ----
  const badgePx = Math.max(13, Math.round(W * 0.016));
  drawPill(ctx, g.collage.x + 10, g.collage.y + 10, 'VOL. 06', badgePx, '#ffd21f', 'rgba(0,0,0,0.85)');
  // WANTED + HEAT pills, top-right of the collage (measured for real so the
  // 5th star never clips)
  const pillY = g.collage.y + 10;
  const pillH = Math.round(badgePx * 1.7);
  const pillPad = Math.round(badgePx * 0.55);
  ctx.save();
  ctx.font = `700 ${badgePx}px "Bebas Neue", "Anton", sans-serif`;
  const starW = ctx.measureText('★★★★★').width;
  const wantedW = ctx.measureText('WANTED').width + starW + pillPad * 3 + 8;
  const heatW = ctx.measureText('HEAT').width + starW + pillPad * 3 + 8;
  let bx = g.collage.x + g.collage.w - 10 - wantedW - 8 - heatW;
  ctx.fillStyle = 'rgba(0,0,0,0.85)';
  roundRect(ctx, bx, pillY, wantedW, pillH, pillH / 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.textBaseline = 'middle';
  ctx.fillText('WANTED', bx + pillPad, pillY + pillH / 2 + 1);
  ctx.fillStyle = '#ffd21f';
  ctx.fillText('★★★★★', bx + pillPad + ctx.measureText('WANTED').width + 6, pillY + pillH / 2 + 1);
  const hx = bx + wantedW + 8;
  ctx.fillStyle = 'rgba(0,0,0,0.85)';
  roundRect(ctx, hx, pillY, heatW, pillH, pillH / 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.fillText('HEAT', hx + pillPad, pillY + pillH / 2 + 1);
  ctx.fillStyle = '#ffd21f';
  ctx.fillText('★★★★★', hx + pillPad + ctx.measureText('HEAT').width + 6, pillY + pillH / 2 + 1);
  ctx.restore();
  // Starburst on the hero's sky (top-right of the hero panel, off faces)
  const hero = panels[0];
  drawStarburst(ctx, hero.x + hero.w - Math.round(W * 0.055), hero.y + Math.round(hero.h * 0.16), Math.max(26, Math.round(W * 0.038)), 'ORIGINAL', 'COVER ART');

  // ---- title band ----
  const band = g.band;
  const grad = ctx.createLinearGradient(0, band.y, 0, band.y + band.h);
  grad.addColorStop(0, '#2a0a3a');
  grad.addColorStop(0.45, '#ff2e88');
  grad.addColorStop(1, '#ff7a1a');
  ctx.fillStyle = grad;
  ctx.fillRect(band.x, band.y, band.w, band.h);

  // Title: grow until it fills ~88% of the width or hits the band-height cap.
  const titleMaxW = band.w * 0.88;
  const titleCap = band.h * 0.60;
  let titlePx = Math.round(band.h * 0.30);
  const titleFont = (s) => `400 ${s}px "Anton", "Bebas Neue", sans-serif`;
  ctx.font = titleFont(titlePx);
  while (titlePx < titleCap && ctx.measureText(state.title).width < titleMaxW) {
    titlePx += 4;
    ctx.font = titleFont(titlePx);
  }
  while (ctx.measureText(state.title).width > titleMaxW && titlePx > 10) {
    titlePx -= 2;
    ctx.font = titleFont(titlePx);
  }
  const titleGrad = ctx.createLinearGradient(0, band.y, band.w, band.y + band.h);
  titleGrad.addColorStop(0, '#fff7ae');
  titleGrad.addColorStop(0.5, '#ffb347');
  titleGrad.addColorStop(1, '#ff5e62');
  const titleX = (band.w - ctx.measureText(state.title).width) / 2;
  // Baseline low enough that the glyphs + thick outline + shadow stay
  // inside the band and never cover the collage's label chips.
  const titleY = band.y + band.h * 0.52;
  ctx.save();
  ctx.font = titleFont(titlePx);
  ctx.textBaseline = 'alphabetic';
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = Math.round(titlePx * 0.08);
  ctx.shadowOffsetY = Math.round(titlePx * 0.05);
  ctx.lineWidth = Math.max(3, Math.round(titlePx * 0.09));
  ctx.strokeStyle = '#111';
  ctx.lineJoin = 'round';
  ctx.strokeText(state.title, titleX, titleY);
  ctx.fillStyle = titleGrad;
  ctx.fillText(state.title, titleX, titleY);
  ctx.restore();

  // Script subtitle, overlapping the title's lower edge, fully legible.
  let spx = Math.max(20, Math.round(titlePx * 0.46));
  const scriptFont = (s) => `${s}px "Pacifico", cursive`;
  ctx.font = scriptFont(spx);
  const scriptMaxW = band.w * 0.62;
  while (ctx.measureText(state.script).width > scriptMaxW && spx > 12) {
    spx -= 2;
    ctx.font = scriptFont(spx);
  }
  const scriptW = ctx.measureText(state.script).width;
  const scriptX = (band.w - scriptW) / 2;
  const scriptY = titleY + Math.round(titlePx * 0.34);
  ctx.save();
  ctx.font = scriptFont(spx);
  ctx.textBaseline = 'alphabetic';
  ctx.lineWidth = Math.max(3, Math.round(spx * 0.16));
  ctx.strokeStyle = '#fff';
  ctx.lineJoin = 'round';
  ctx.strokeText(state.script, scriptX, scriptY);
  ctx.fillStyle = '#ff2e88';
  ctx.fillText(state.script, scriptX, scriptY);
  ctx.restore();

  // Ribbon: small COLLECTOR'S EDITION bar, bottom-right of the band.
  const ribbonH = Math.max(18, Math.round(band.h * 0.13));
  const ribbonTxt = "COLLECTOR'S EDITION";
  const ribbonFont = (s) => `700 ${s}px "Bebas Neue", "Anton", sans-serif`;
  let rpx = Math.round(ribbonH * 0.58);
  ctx.font = ribbonFont(rpx);
  while (ctx.measureText(ribbonTxt).width > band.w * 0.30 && rpx > 8) {
    rpx -= 1;
    ctx.font = ribbonFont(rpx);
  }
  const ribbonW = ctx.measureText(ribbonTxt).width + 20;
  const ribbonX = band.x + band.w - ribbonW - 12;
  const ribbonY = band.y + band.h - ribbonH - 10;
  ctx.save();
  ctx.fillStyle = '#ff2e88';
  ctx.fillRect(ribbonX, ribbonY, ribbonW, ribbonH);
  ctx.fillStyle = '#fff';
  ctx.font = ribbonFont(rpx);
  ctx.textBaseline = 'middle';
  ctx.fillText(ribbonTxt, ribbonX + 10, ribbonY + ribbonH / 2 + 1);
  ctx.restore();

  // ---- quote strip ----
  const q = g.quote;
  ctx.fillStyle = '#0d0d0f';
  ctx.fillRect(q.x, q.y, q.w, q.h);
  const quoteTxt = `★★★★★  “${state.quote}”  — THE COAST HERALD`;
  const qMaxW = q.w - ribbonW - 40;
  let qpx = Math.round(q.h * 0.42);
  ctx.font = `700 ${qpx}px "Bebas Neue", "Anton", sans-serif`;
  while (ctx.measureText(quoteTxt).width > qMaxW && qpx > 8) {
    qpx -= 1;
    ctx.font = `700 ${qpx}px "Bebas Neue", "Anton", sans-serif`;
  }
  ctx.fillStyle = '#ffd21f';
  ctx.textBaseline = 'middle';
  ctx.fillText(ellipsize(ctx, quoteTxt, qMaxW), (q.w - Math.min(ctx.measureText(quoteTxt).width, qMaxW)) / 2, q.y + q.h / 2 + 1);

  // ---- footer ----
  const f = g.footer;
  const fgrad = ctx.createLinearGradient(0, f.y, 0, f.y + f.h);
  fgrad.addColorStop(0, '#3a0a4a');
  fgrad.addColorStop(1, '#ff7a1a');
  ctx.fillStyle = fgrad;
  ctx.fillRect(f.x, f.y, f.w, f.h);
  // palm strip along the bottom edge
  ctx.save();
  ctx.globalAlpha = 0.85;
  for (let i = 0; i < 5; i++) {
    drawPalm(ctx, f.x + 30 + i * Math.round(f.w * 0.06), f.y + f.h - 6, Math.max(0.5, f.h / 110), 'rgba(20,5,20,0.9)');
  }
  ctx.restore();
  // tagline
  const tagTxt = state.tagline;
  let tpx = Math.round(f.h * 0.30);
  ctx.font = `700 ${tpx}px "Anton", sans-serif`;
  while (ctx.measureText(tagTxt).width > f.w * 0.55 && tpx > 8) {
    tpx -= 1;
    ctx.font = `700 ${tpx}px "Anton", sans-serif`;
  }
  ctx.fillStyle = '#fff';
  ctx.textBaseline = 'middle';
  ctx.fillText(tagTxt, f.x + 24, f.y + f.h * 0.30);
  // EST. 2026 seal + barcode, bottom-right
  const sealR = Math.max(16, Math.round(f.h * 0.30));
  const barW = Math.round(f.w * 0.11);
  const barH = Math.max(16, Math.round(f.h * 0.34));
  const barX = f.x + f.w - barW - 16;
  const barY = f.y + f.h - barH - 14;
  drawBarcode(ctx, barX, barY, barW, barH);
  ctx.save();
  ctx.fillStyle = '#ffd21f';
  ctx.strokeStyle = '#111';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(barX - sealR - 12, barY + barH / 2, sealR, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#111';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `700 ${Math.round(sealR * 0.42)}px "Anton", sans-serif`;
  ctx.fillText('EST.', barX - sealR - 12, barY + barH / 2 - sealR * 0.28);
  ctx.fillText('2026', barX - sealR - 12, barY + barH / 2 + sealR * 0.30);
  ctx.restore();
  // disclaimer, shrink-to-fit
  const disc = 'VICE TIDE IS FAN FICTION. NOT AFFILIATED WITH OR ENDORSED BY ANY GAME STUDIO. ALL PHOTOS MADE FOR MAKE.FUN.';
  let dpx = Math.round(f.h * 0.16);
  ctx.font = `${dpx}px sans-serif`;
  while (ctx.measureText(disc).width > f.w - 48 && dpx > 6) {
    dpx -= 1;
    ctx.font = `${dpx}px sans-serif`;
  }
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.textAlign = 'center';
  ctx.fillText(disc, f.w / 2, f.y + f.h - 10);
  ctx.textAlign = 'left';
  ctx.restore();
}

// Load the two sample photos as Image objects.
export function loadPhotos() {
  const out = {};
  for (const key of Object.keys(PHOTOS)) {
    const img = new Image();
    img.src = PHOTOS[key].src;
    out[key] = img;
  }
  return out;
}

export function photosReady(images) {
  return Object.values(images).every((img) => img.complete && img.naturalWidth > 0);
}
