// VICE TIDE Cover Studio — core cover renderer.
// Draws the GTA-style cover: a photo collage, a sunset-gradient title band,
// script subtitle, quote, footer with barcode and badges. Plain ES module,
// no dependencies, runs offline with vendored fonts.

export const FONTS = {
  title: 'Anton',
  titleAlt: 'Bebas Neue',
  script: 'Pacifico',
  body: 'Arial, Helvetica, sans-serif',
};

export const GRADES = {
  sunset: { name: 'Vice Sunset', tint: 'rgba(255,110,30,0.34)', warm: 'rgba(255,170,60,0.22)', lift: 0.06 },
  golden: { name: 'Golden Hour', tint: 'rgba(255,150,40,0.26)', warm: 'rgba(255,200,90,0.18)', lift: 0.05 },
  neon: { name: 'Neon Night', tint: 'rgba(255,40,140,0.20)', warm: 'rgba(80,40,255,0.14)', lift: 0.04 },
  miami: { name: 'Miami Pink', tint: 'rgba(255,60,120,0.26)', warm: 'rgba(255,140,180,0.16)', lift: 0.05 },
  dusk: { name: 'Dusk Purple', tint: 'rgba(120,40,200,0.22)', warm: 'rgba(255,90,160,0.12)', lift: 0.04 },
  classic: { name: 'Classic', tint: 'rgba(255,140,60,0.14)', warm: 'rgba(255,190,110,0.10)', lift: 0.03 },
};

export const LAYOUTS = {
  hero7: { name: 'Hero 7', panels: 7 },
  hero5: { name: 'Hero 5', panels: 5 },
  grid6: { name: 'Grid 6', panels: 6 },
  trio: { name: 'Trio', panels: 3 },
  single: { name: 'Single', panels: 1 },
  strip5: { name: 'Strip 5', panels: 5 },
};

export const PANEL_LABELS = [
  { place: 'OCEAN DRIVE', time: '6:42 PM', tag: 'LOOKING FOR TROUBLE' },
  { place: 'MARINA DEL SOL', time: '7:40 PM', tag: 'NO WITNESSES' },
  { place: 'BOARDWALK', time: '6:15 PM', tag: 'SUNSET CHASERS' },
  { place: 'PIER 26', time: '6:30 AM', tag: 'GONE FISHING' },
  { place: 'THE REEL DEAL', time: '5:45 AM', tag: 'ONE MORE CAST' },
  { place: 'TURQUOISE BAY', time: '11:42 AM', tag: 'NO BAD DAYS' },
  { place: 'PALM ROW', time: '6:05 PM', tag: 'GOLDEN HOUR' },
  { place: 'VICE BEACH', time: '7:12 PM', tag: 'NEON TIDE' },
];

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
    size: '1080x1080',
  };
}

// One shared geometry helper so the script, quote and ribbon never overlap.
export function coverGeometry(w, h) {
  const collage = { x: 0, y: 0, w, h: h * 0.58 };
  const band = { x: 0, y: h * 0.58, w, h: h * 0.29 };
  const quote = { x: 0, y: h * 0.87, w, h: h * 0.06 };
  const footer = { x: 0, y: h * 0.93, w, h: h * 0.07 };
  const ribbon = { w: w * 0.26, h: band.h * 0.20 };
  ribbon.x = band.x + band.w - ribbon.w - w * 0.02;
  ribbon.y = band.y + band.h - ribbon.h - band.h * 0.06;
  // The quote's free zone is the band's width minus the ribbon's footprint.
  const quoteFree = { x: quote.x, y: quote.y, w: ribbon.x - quote.x - w * 0.02, h: quote.h };
  return { collage, band, quote, footer, ribbon, quoteFree };
}

export function ellipsize(ctx, text, maxW) {
  if (ctx.measureText(text).width <= maxW) return text;
  let lo = 0;
  let hi = text.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (ctx.measureText(text.slice(0, mid) + '…').width <= maxW) lo = mid;
    else hi = mid - 1;
  }
  return text.slice(0, lo) + '…';
}

// Split a panel rect into sub-rects for a layout. Returns [{x,y,w,h}].
export function layoutPanels(layout, area, g) {
  const { x, y, w, h } = area;
  const P = [];
  if (layout === 'hero7') {
    const heroW = w * 0.55;
    const rightX = x + heroW + g;
    const rightW = w - heroW - g;
    const topH = h * 0.48;
    const botH = h - topH - g;
    P.push({ x, y, w: heroW, h });
    P.push({ x: rightX, y, w: rightW / 2 - g / 2, h: topH });
    P.push({ x: rightX + rightW / 2 + g / 2, y, w: rightW / 2 - g / 2, h: topH });
    const bw = (rightW - 3 * g) / 4;
    for (let i = 0; i < 4; i++) {
      P.push({ x: rightX + i * (bw + g), y: y + topH + g, w: bw, h: botH });
    }
  } else if (layout === 'hero5') {
    const heroW = w * 0.55;
    const rightX = x + heroW + g;
    const rightW = w - heroW - g;
    const topH = h * 0.48;
    const botH = h - topH - g;
    P.push({ x, y, w: heroW, h });
    P.push({ x: rightX, y, w: rightW / 2 - g / 2, h: topH });
    P.push({ x: rightX + rightW / 2 + g / 2, y, w: rightW / 2 - g / 2, h: topH });
    P.push({ x: rightX, y: y + topH + g, w: rightW / 2 - g / 2, h: botH });
    P.push({ x: rightX + rightW / 2 + g / 2, y: y + topH + g, w: rightW / 2 - g / 2, h: botH });
  } else if (layout === 'grid6') {
    const cw = (w - 2 * g) / 3;
    const rh = (h - g) / 2;
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 3; c++) {
        P.push({ x: x + c * (cw + g), y: y + r * (rh + g), w: cw, h: rh });
      }
    }
  } else if (layout === 'trio') {
    const cw = (w - 2 * g) / 3;
    for (let c = 0; c < 3; c++) P.push({ x: x + c * (cw + g), y, w: cw, h });
  } else if (layout === 'strip5') {
    const cw = (w - 4 * g) / 5;
    for (let c = 0; c < 5; c++) P.push({ x: x + c * (cw + g), y, w: cw, h });
  } else {
    P.push({ x, y, w, h });
  }
  return P;
}

function drawImageCover(ctx, img, rect, focusY = 0.38) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) return;
  const scale = Math.max(rect.w / iw, rect.h / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = rect.x + (rect.w - dw) / 2;
  // Top-biased crop so faces stay in frame.
  const dy = rect.y + (rect.h - dh) * focusY;
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
}

function applyGrade(ctx, rect, gradeName, strength) {
  const g = GRADES[gradeName] || GRADES.sunset;
  const s = Math.max(0, Math.min(1.5, strength));
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = Math.min(1, 0.55 * s);
  ctx.fillStyle = g.tint;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.globalCompositeOperation = 'soft-light';
  ctx.globalAlpha = Math.min(1, 0.5 * s);
  ctx.fillStyle = g.warm;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = g.lift * s;
  ctx.fillStyle = '#ffb060';
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.restore();
}

function drawChip(ctx, rect, label) {
  const pad = Math.max(4, rect.w * 0.03);
  const barH = Math.max(14, rect.h * 0.11);
  const bar = { x: rect.x, y: rect.y + rect.h - barH, w: rect.w, h: barH };
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.72)';
  ctx.fillRect(bar.x, bar.y, bar.w, bar.h);
  ctx.fillStyle = '#fff';
  ctx.textBaseline = 'middle';
  const fs = Math.max(9, barH * 0.42);
  ctx.font = `700 ${fs}px ${FONTS.body}`;
  const line1 = `${label.place}  ${label.time}`;
  const line2 = label.tag;
  const maxW = bar.w - pad * 2;
  // Compact fallback for narrow panels: drop the time, keep place + tag.
  let l1 = ellipsize(ctx, line1, maxW);
  if (rect.w < 130) l1 = ellipsize(ctx, label.place, maxW);
  const l2 = ellipsize(ctx, line2, maxW);
  if (barH >= 30) {
    ctx.fillText(l1, bar.x + pad, bar.y + barH * 0.30);
    ctx.font = `400 ${fs * 0.85}px ${FONTS.body}`;
    ctx.fillStyle = '#ffd34d';
    ctx.fillText(l2, bar.x + pad, bar.y + barH * 0.74);
  } else {
    // Short panel: one line — place + tag (drop the time) so the tag survives.
    const compact = ellipsize(ctx, `${label.place} — ${label.tag}`, maxW);
    ctx.fillText(compact, bar.x + pad, bar.y + barH * 0.52);
  }
  ctx.restore();
}

function drawPill(ctx, x, y, text, bg, fg, fs) {
  ctx.save();
  ctx.font = `800 ${fs}px ${FONTS.body}`;
  // Measure with real text metrics so the 5th star never clips.
  const metrics = ctx.measureText(text);
  const tw = metrics.width;
  const padX = fs * 0.7;
  const w = tw + padX * 2;
  const h = fs * 1.9;
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, h / 2);
  ctx.fill();
  ctx.fillStyle = fg;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillText(text, x + padX, y + h / 2 + fs * 0.04);
  ctx.restore();
  return { x, y, w, h };
}

function drawBarcode(ctx, x, y, w, h) {
  ctx.save();
  ctx.fillStyle = '#111';
  let cx = x;
  let seed = 1234567;
  const rand = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  while (cx < x + w - 2) {
    const bw = 1 + Math.floor(rand() * 4);
    if (rand() > 0.45) ctx.fillRect(cx, y, bw, h);
    cx += bw + 1 + Math.floor(rand() * 3);
  }
  ctx.restore();
}

function drawPalm(ctx, x, y, s, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1.5, s * 0.05);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + s * 0.05, y - s * 0.5, x + s * 0.12, y - s * 0.85);
  ctx.stroke();
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI * (0.15 + i * 0.16);
    const tx = x + s * 0.12 + Math.cos(a) * s * 0.42;
    const ty = y - s * 0.85 + Math.sin(a) * s * 0.30 + s * 0.12;
    ctx.beginPath();
    ctx.moveTo(x + s * 0.12, y - s * 0.85);
    ctx.quadraticCurveTo(
      x + s * 0.12 + Math.cos(a) * s * 0.22,
      y - s * 0.85 + Math.sin(a) * s * 0.22 - s * 0.10,
      tx, ty
    );
    ctx.stroke();
  }
  ctx.restore();
}

function drawStarburst(ctx, cx, cy, r, text) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = '#ffd21f';
  ctx.strokeStyle = '#111';
  ctx.lineWidth = Math.max(2, r * 0.08);
  ctx.beginPath();
  const spikes = 12;
  for (let i = 0; i < spikes * 2; i++) {
    const ang = (i / (spikes * 2)) * Math.PI * 2;
    const rr = i % 2 === 0 ? r : r * 0.72;
    const px = Math.cos(ang) * rr;
    const py = Math.sin(ang) * rr;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#111';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const lines = text.split('\n');
  // Shrink the font until the widest line fits inside the starburst.
  let fs = r * 0.30;
  const maxW = r * 1.30;
  while (fs > 8) {
    ctx.font = `800 ${fs}px ${FONTS.body}`;
    const widest = Math.max(...lines.map((ln) => ctx.measureText(ln).width));
    if (widest <= maxW) break;
    fs -= 1;
  }
  ctx.font = `800 ${fs}px ${FONTS.body}`;
  lines.forEach((ln, i) => {
    ctx.fillText(ln, 0, (i - (lines.length - 1) / 2) * fs * 1.15);
  });
  ctx.restore();
}

// The main entry: draw the whole cover onto ctx (a 2d context of size w x h).
// photos: { boulevard: HTMLImageElement, pier: HTMLImageElement, ... }
// state: from defaultState().
export function drawCover(ctx, w, h, state, photos) {
  const g = coverGeometry(w, h);
  const gutter = Math.max(3, w * 0.008);
  ctx.save();
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#160a24';
  ctx.fillRect(0, 0, w, h);

  // ---- Collage ----
  const panels = layoutPanels(state.layout, g.collage, gutter);
  const heroImg = photos[state.photo] || photos.boulevard || Object.values(photos)[0];
  const altImg = photos.pier || heroImg;
  panels.forEach((rect, i) => {
    const img = i === 0 ? heroImg : (i % 2 === 0 ? altImg : heroImg);
    drawImageCover(ctx, img, rect, i === 0 ? 0.30 : 0.42);
    applyGrade(ctx, rect, state.grade, state.strength);
    drawChip(ctx, rect, PANEL_LABELS[i % PANEL_LABELS.length]);
  });

  // Badges over the collage.
  const pillFs = Math.max(11, w * 0.016);
  drawPill(ctx, g.collage.x + w * 0.015, g.collage.y + h * 0.012, 'VOL. 06', '#111', '#ffd21f', pillFs);
  const wantedW = (() => {
    ctx.save();
    ctx.font = `800 ${pillFs}px ${FONTS.body}`;
    const tw = ctx.measureText('WANTED ★★★★★').width;
    ctx.restore();
    return tw + pillFs * 1.4;
  })();
  const wantedX = g.collage.x + g.collage.w - wantedW - w * 0.015;
  const wantedY = g.collage.y + h * 0.012;
  drawPill(ctx, wantedX, wantedY, 'WANTED ★★★★★', '#111', '#fff', pillFs);
  const heatW = (() => {
    ctx.save();
    ctx.font = `800 ${pillFs}px ${FONTS.body}`;
    const tw = ctx.measureText('HEAT ★★★★★').width;
    ctx.restore();
    return tw + pillFs * 1.4;
  })();
  drawPill(ctx, wantedX - heatW - w * 0.012, wantedY, 'HEAT ★★★★★', '#111', '#ffd21f', pillFs);
  // Starburst badge: keep it off faces — place it on the hero's top-right
  // corner over sky/palm background (the face sits left-of-centre).
  const sbR = Math.max(26, w * 0.045);
  drawStarburst(ctx, g.collage.x + panels[0].w - sbR * 1.15, g.collage.y + sbR * 1.25, sbR, 'ORIGINAL\nCOVER ART');

  // ---- Title band (sunset gradient) ----
  const band = g.band;
  const grad = ctx.createLinearGradient(band.x, band.y, band.x, band.y + band.h);
  grad.addColorStop(0, '#2a0a3a');
  grad.addColorStop(0.45, '#ff2e88');
  grad.addColorStop(1, '#ff7a1a');
  ctx.fillStyle = grad;
  ctx.fillRect(band.x, band.y, band.w, band.h);

  // Title: grow until it fills ~88% of the band width or hits the band cap.
  const title = (state.title || 'VICE TIDE').toUpperCase();
  const maxTitleW = band.w * 0.88;
  const maxTitleH = band.h * 0.52;
  let titleFs = 10;
  ctx.textBaseline = 'alphabetic';
  while (titleFs < 400) {
    ctx.font = `${titleFs + 1}px ${FONTS.title}, ${FONTS.titleAlt}, sans-serif`;
    const tw = ctx.measureText(title).width;
    if (tw >= maxTitleW || titleFs + 1 >= maxTitleH) break;
    titleFs++;
  }
  ctx.font = `${titleFs}px ${FONTS.title}, ${FONTS.titleAlt}, sans-serif`;
  const titleW = ctx.measureText(title).width;
  const titleX = band.x + (band.w - titleW) / 2;
  const titleY = band.y + band.h * 0.48;
  // Sunset-gradient fill + thick black outline + drop shadow.
  const tGrad = ctx.createLinearGradient(0, titleY - titleFs, 0, titleY + titleFs * 0.2);
  tGrad.addColorStop(0, '#fff7ae');
  tGrad.addColorStop(0.55, '#ffb03a');
  tGrad.addColorStop(1, '#ff5e1a');
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = titleFs * 0.08;
  ctx.shadowOffsetY = titleFs * 0.04;
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(4, titleFs * 0.10);
  ctx.strokeStyle = '#111';
  ctx.strokeText(title, titleX, titleY);
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = tGrad;
  ctx.fillText(title, titleX, titleY);
  ctx.restore();

  // Script subtitle: hot pink, white outline, overlapping the title's lower edge.
  const scriptFs = Math.max(18, titleFs * 0.42);
  ctx.font = `${scriptFs}px ${FONTS.script}, cursive`;
  const scriptW = ctx.measureText(state.script).width;
  const scriptX = band.x + (band.w - scriptW) / 2;
  const scriptY = titleY + titleFs * 0.34;
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(3, scriptFs * 0.10);
  ctx.strokeStyle = '#fff';
  ctx.strokeText(state.script, scriptX, scriptY);
  ctx.fillStyle = '#ff2e88';
  ctx.fillText(state.script, scriptX, scriptY);
  ctx.restore();

  // Ribbon: small bar, bottom-right of the band, clear of faces and labels.
  const rb = g.ribbon;
  ctx.save();
  ctx.fillStyle = '#ff2e88';
  ctx.fillRect(rb.x, rb.y, rb.w, rb.h);
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // Shrink the ribbon text until it fits inside the bar (never overflows).
  let rbFs = rb.h * 0.52;
  while (rbFs > 8) {
    ctx.font = `800 ${rbFs}px ${FONTS.body}`;
    if (ctx.measureText("COLLECTOR'S EDITION").width <= rb.w - rb.h * 0.5) break;
    rbFs -= 1;
  }
  ctx.font = `800 ${rbFs}px ${FONTS.body}`;
  ctx.fillText("COLLECTOR'S EDITION", rb.x + rb.w / 2, rb.y + rb.h / 2 + rb.h * 0.03);
  ctx.restore();

  // ---- Quote strip (centred in the free zone left of the ribbon) ----
  const q = g.quoteFree;
  ctx.save();
  ctx.fillStyle = '#111';
  ctx.fillRect(g.quote.x, g.quote.y, g.quote.w, g.quote.h);
  ctx.fillStyle = '#ffd21f';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  let qFs = Math.max(10, g.quote.h * 0.52);
  ctx.font = `700 ${qFs}px ${FONTS.body}`;
  const quoteText = `★★★★★  "${state.quote}"  — THE COAST HERALD`;
  while (qFs > 8 && ctx.measureText(quoteText).width > q.w - w * 0.02) {
    qFs -= 1;
    ctx.font = `700 ${qFs}px ${FONTS.body}`;
  }
  ctx.fillText(ellipsize(ctx, quoteText, q.w - w * 0.02), q.x + q.w / 2, q.y + q.h / 2);
  ctx.restore();

  // ---- Footer ----
  const f = g.footer;
  const fGrad = ctx.createLinearGradient(0, f.y, 0, f.y + f.h);
  fGrad.addColorStop(0, '#3a0a4a');
  fGrad.addColorStop(1, '#ff7a1a');
  ctx.fillStyle = fGrad;
  ctx.fillRect(f.x, f.y, f.w, f.h);
  // Palm strip along the bottom edge.
  const palmS = f.h * 1.7;
  drawPalm(ctx, f.x + w * 0.03, f.y + f.h * 0.98, palmS, 'rgba(20,5,30,0.85)');
  drawPalm(ctx, f.x + w * 0.07, f.y + f.h * 0.99, palmS * 0.8, 'rgba(20,5,30,0.7)');
  // Tagline, centred.
  ctx.save();
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  let tagFs = Math.max(10, f.h * 0.42);
  ctx.font = `800 ${tagFs}px ${FONTS.body}`;
  while (tagFs > 8 && ctx.measureText(state.tagline).width > f.w * 0.5) {
    tagFs -= 1;
    ctx.font = `800 ${tagFs}px ${FONTS.body}`;
  }
  ctx.fillText(state.tagline, f.x + f.w / 2, f.y + f.h * 0.32);
  // Disclaimer (shrink-to-fit, never overflows the right edge).
  const disc = 'VICE TIDE IS FAN FICTION. NOT AFFILIATED WITH OR ENDORSED BY ANY GAME STUDIO. ALL PHOTOS MADE FOR MAKE.FUN.';
  let dFs = Math.max(7, f.h * 0.22);
  ctx.font = `400 ${dFs}px ${FONTS.body}`;
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  while (dFs > 6 && ctx.measureText(disc).width > f.w * 0.62) {
    dFs -= 0.5;
    ctx.font = `400 ${dFs}px ${FONTS.body}`;
  }
  ctx.fillText(ellipsize(ctx, disc, f.w * 0.62), f.x + f.w / 2, f.y + f.h * 0.74);
  ctx.restore();
  // Barcode (bars only) + EST. 2026 seal, bottom-right.
  const bcW = w * 0.085;
  const bcH = f.h * 0.55;
  drawBarcode(ctx, f.x + f.w - bcW - w * 0.015, f.y + f.h * 0.14, bcW, bcH);
  const sealR = f.h * 0.34;
  const sealX = f.x + f.w - bcW - w * 0.015 - sealR - w * 0.02;
  ctx.save();
  ctx.beginPath();
  ctx.arc(sealX, f.y + f.h * 0.45, sealR, 0, Math.PI * 2);
  ctx.fillStyle = '#ffd21f';
  ctx.fill();
  ctx.strokeStyle = '#111';
  ctx.lineWidth = Math.max(1.5, sealR * 0.08);
  ctx.stroke();
  ctx.fillStyle = '#111';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `800 ${sealR * 0.42}px ${FONTS.body}`;
  ctx.fillText('EST.', sealX, f.y + f.h * 0.45 - sealR * 0.28);
  ctx.fillText('2026', sealX, f.y + f.h * 0.45 + sealR * 0.30);
  ctx.restore();

  ctx.restore();
}
