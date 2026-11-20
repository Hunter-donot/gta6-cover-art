'use strict';
/* VICE TIDE Cover Studio — cover renderer.
   Draws a GTA 6-style cover (golden-hour photo collage + sunset-gradient title band)
   onto a <canvas>. Plain classic script; exposes window.VICE. No network: photos and
   fonts are vendored under app/. */

window.VICE = (function () {
  var FONT_ANTON = 'Anton, "Arial Black", sans-serif';
  var FONT_BEBAS = '"Bebas Neue", "Arial Narrow", sans-serif';
  var FONT_SCRIPT = 'Pacifico, cursive';
  var FONT_CHIP = 'Anton, "Arial Black", sans-serif';

  /* ------------------------------------------------------------------ photos */

  var PHOTOS = [
    { id: 'boulevard', src: 'samples/boulevard.jpg', place: 'OCEAN DRIVE', time: '6:42 PM', tag: 'LOOKING FOR TROUBLE' },
    { id: 'pier', src: 'samples/pier.jpg', place: 'PIER 26', time: '6:30 AM', tag: 'GONE FISHING' },
    { id: 'boulevard2', src: 'samples/boulevard.jpg', place: 'MARINA DEL SOL', time: '7:48 PM', tag: 'NO WITNESSES' },
    { id: 'pier2', src: 'samples/pier.jpg', place: 'THE REEL DEAL', time: '5:45 AM', tag: 'ONE MORE CAST' },
    { id: 'boulevard3', src: 'samples/boulevard.jpg', place: 'BOARDWALK', time: '8:15 PM', tag: 'SUNSET CHASERS' },
    { id: 'pier3', src: 'samples/pier.jpg', place: 'TURQUOISE BAY', time: '11:02 AM', tag: 'NO BAD DAYS' },
    { id: 'boulevard4', src: 'samples/boulevard.jpg', place: 'PALM ROW', time: '6:05 PM', tag: 'GOLDEN HOUR' },
  ];

  function loadPhotos() {
    var out = {};
    var jobs = PHOTOS.map(function (p) {
      return new Promise(function (resolve) {
        var img = new Image();
        img.onload = function () { out[p.id] = img; resolve(); };
        img.onerror = function () { resolve(); };
        img.src = p.src;
      });
    });
    return Promise.all(jobs).then(function () { return out; });
  }

  function ensureFonts() {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    return Promise.all([
      document.fonts.load('100px Anton'),
      document.fonts.load('100px "Bebas Neue"'),
      document.fonts.load('100px Pacifico'),
    ]).catch(function () { /* fonts fall back to system faces */ });
  }

  /* ----------------------------------------------------------------- layouts */

  var LAYOUTS = {
    hero7: { name: 'Hero 7-panel', panels: 7 },
    hero5: { name: 'Hero 5-panel', panels: 5 },
    grid6: { name: 'Grid 6-panel', panels: 6 },
    trio: { name: 'Trio', panels: 3 },
    single: { name: 'Single hero', panels: 1 },
    strip5: { name: 'Strip 5-panel', panels: 5 },
  };

  /* Panel rects inside the collage area (W x H, origin top-left). White gutters
     are left by insetting every panel by half the gutter. */
  function layoutPanels(layoutId, W, H) {
    var g = Math.max(3, Math.round(W * 0.004));
    var half = g / 2;
    function rect(x, y, w, h) {
      return { x: x + half, y: y + half, w: w - g, h: h - g };
    }
    switch (layoutId) {
      case 'hero7': {
        var heroW = W * 0.55;
        var topH = H * 0.5;
        var colW = (W - heroW) / 2;
        var botW = (W - heroW) / 4;
        return [
          rect(0, 0, heroW, H),
          rect(heroW, 0, colW, topH),
          rect(heroW + colW, 0, colW, topH),
          rect(heroW, topH, botW, H - topH),
          rect(heroW + botW, topH, botW, H - topH),
          rect(heroW + botW * 2, topH, botW, H - topH),
          rect(heroW + botW * 3, topH, botW, H - topH),
        ];
      }
      case 'hero5': {
        var hw = W * 0.55;
        var th = H * 0.5;
        var cw = (W - hw) / 2;
        return [
          rect(0, 0, hw, H),
          rect(hw, 0, cw, th),
          rect(hw + cw, 0, cw, th),
          rect(hw, th, cw, H - th),
          rect(hw + cw, th, cw, H - th),
        ];
      }
      case 'grid6': {
        var out = [];
        var cw = W / 3;
        var rh = H / 2;
        for (var r = 0; r < 2; r++) {
          for (var c = 0; c < 3; c++) out.push(rect(c * cw, r * rh, cw, rh));
        }
        return out;
      }
      case 'trio': {
        var tw = W / 3;
        return [rect(0, 0, tw, H), rect(tw, 0, tw, H), rect(tw * 2, 0, tw, H)];
      }
      case 'single': {
        return [rect(0, 0, W, H)];
      }
      case 'strip5': {
        var sw = W / 5;
        var res = [];
        for (var i = 0; i < 5; i++) res.push(rect(i * sw, 0, sw, H));
        return res;
      }
      default:
        return [rect(0, 0, W, H)];
    }
  }

  /* ------------------------------------------------------------------ grades */

  var GRADES = {
    sunset: { name: 'Vice Sunset', sepia: 0.24, saturate: 1.35, contrast: 1.06, brightness: 1.02, tint: 0.16 },
    golden: { name: 'Golden Hour', sepia: 0.18, saturate: 1.25, contrast: 1.04, brightness: 1.03, tint: 0.12 },
    neon: { name: 'Neon Nights', sepia: 0.05, saturate: 1.7, contrast: 1.1, brightness: 0.98, tint: 0.06 },
    noir: { name: 'Vice Noir', sepia: 0.08, saturate: 0.55, contrast: 1.18, brightness: 0.95, tint: 0.04 },
    vintage: { name: 'Vintage 86', sepia: 0.38, saturate: 0.85, contrast: 1.0, brightness: 1.04, tint: 0.1 },
    clean: { name: 'Clean', sepia: 0, saturate: 1, contrast: 1, brightness: 1, tint: 0 },
  };

  /* ------------------------------------------------------------------- state */

  var PANEL_LABELS = [
    { photo: 'boulevard', place: 'OCEAN DRIVE', time: '6:42 PM', tag: 'LOOKING FOR TROUBLE' },
    { photo: 'boulevard2', place: 'MARINA DEL SOL', time: '7:48 PM', tag: 'NO WITNESSES' },
    { photo: 'boulevard3', place: 'BOARDWALK', time: '8:15 PM', tag: 'SUNSET CHASERS' },
    { photo: 'pier', place: 'PIER 26', time: '6:30 AM', tag: 'GONE FISHING' },
    { photo: 'pier2', place: 'THE REEL DEAL', time: '5:45 AM', tag: 'ONE MORE CAST' },
    { photo: 'pier3', place: 'TURQUOISE BAY', time: '11:02 AM', tag: 'NO BAD DAYS' },
    { photo: 'boulevard4', place: 'PALM ROW', time: '6:05 PM', tag: 'GOLDEN HOUR' },
  ];

  function defaultPanels(layoutId) {
    var n = (LAYOUTS[layoutId] || LAYOUTS.hero7).panels;
    var out = [];
    for (var i = 0; i < n; i++) {
      var src = PANEL_LABELS[i % PANEL_LABELS.length];
      out.push({ photo: src.photo, place: src.place, time: src.time, tag: src.tag });
    }
    return out;
  }

  function defaultState() {
    return {
      layout: 'hero7',
      grade: 'sunset',
      strength: 1.0,
      title: 'VICE TIDE',
      script: 'Saltwater Nights',
      quote: 'NEON, SALT AND FIVE STARS OF TROUBLE',
      tagline: 'ONE COAST \u2022 NO RULES \u2022 COMING SOON',
      panels: defaultPanels('hero7'),
    };
  }

  /* ----------------------------------------------------------------- helpers */

  function roundRect(ctx, x, y, w, h, r) {
    var rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.lineTo(x + w - rr, y);
    ctx.arcTo(x + w, y, x + w, y + rr, rr);
    ctx.lineTo(x + w, y + h - rr);
    ctx.arcTo(x + w, y + h, x + w - rr, y + h, rr);
    ctx.lineTo(x + rr, y + h);
    ctx.arcTo(x, y + h, x, y + h - rr, rr);
    ctx.lineTo(x, y + rr);
    ctx.arcTo(x, y, x + rr, y, rr);
    ctx.closePath();
  }

  /* Draw img to fill rect (cover crop), like CSS object-fit: cover.
     focusY (0 = top of the photo, 1 = bottom) steers the vertical crop;
     faces sit in the upper part of our photos, so callers pass a
     top-biased value. Defaults to centre. */
  function drawImageCover(ctx, img, x, y, w, h, focusY) {
    var iw = img.naturalWidth || img.width;
    var ih = img.naturalHeight || img.height;
    if (!iw || !ih) return;
    var scale = Math.max(w / iw, h / ih);
    var sw = w / scale;
    var sh = h / scale;
    var sx = (iw - sw) / 2;
    var fy = typeof focusY === 'number' ? focusY : 0.5;
    if (fy < 0) fy = 0;
    if (fy > 1) fy = 1;
    var sy = (ih - sh) * fy;
    ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  }

  function star(ctx, cx, cy, rOuter, rInner, points) {
    ctx.beginPath();
    for (var i = 0; i < points * 2; i++) {
      var r = i % 2 === 0 ? rOuter : rInner;
      var a = (Math.PI * i) / points - Math.PI / 2;
      var x = cx + Math.cos(a) * r;
      var y = cy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }

  function drawStars(ctx, cx, cy, size, n, color) {
    ctx.fillStyle = color;
    for (var i = 0; i < n; i++) {
      star(ctx, cx + i * size * 1.25, cy, size * 0.5, size * 0.22, 5);
      ctx.fill();
    }
  }

  function drawPalm(ctx, x, y, h, color) {
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = Math.max(2, h * 0.04);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + h * 0.08, y - h * 0.55, x + h * 0.02, y - h);
    ctx.stroke();
    var topX = x + h * 0.02;
    var topY = y - h;
    ctx.lineWidth = Math.max(1.5, h * 0.03);
    for (var i = 0; i < 5; i++) {
      var a = -Math.PI * (0.15 + i * 0.18);
      var len = h * (0.42 - Math.abs(i - 2) * 0.05);
      ctx.beginPath();
      ctx.moveTo(topX, topY);
      ctx.quadraticCurveTo(
        topX + Math.cos(a) * len * 0.6, topY + Math.sin(a) * len * 0.6 + h * 0.08,
        topX + Math.cos(a) * len, topY + Math.sin(a) * len + h * 0.16
      );
      ctx.stroke();
    }
  }

  /* Deterministic barcode: a fixed bar pattern, no number line under it. */
  var BARCODE_PATTERN = [3, 1, 2, 1, 1, 2, 4, 1, 1, 1, 2, 3, 1, 2, 1, 1, 3, 2, 1, 1, 2, 1, 4, 1, 1, 2, 1, 3, 1, 1, 2, 2];

  function drawBarcode(ctx, x, y, w, h) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x, y, w, h);
    var total = 0;
    for (var i = 0; i < BARCODE_PATTERN.length; i++) total += BARCODE_PATTERN[i];
    var unit = w / total;
    var px = x;
    ctx.fillStyle = '#111111';
    for (var j = 0; j < BARCODE_PATTERN.length; j++) {
      var bw = BARCODE_PATTERN[j] * unit;
      if (j % 2 === 0) ctx.fillRect(px, y + 2, bw, h - 4);
      px += bw;
    }
  }

  /* ------------------------------------------------------------------ labels */

  function drawLabelChip(ctx, panel, rect) {
    var one = panel.place + '  ' + panel.time + '  \u2014  ' + panel.tag;
    var padX = Math.max(6, rect.w * 0.02);
    var maxW = rect.w - padX * 2;
    var minSize = Math.max(9, rect.w * 0.028);
    var size = Math.max(minSize, rect.w * 0.038);
    ctx.font = size + 'px ' + FONT_CHIP;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    var lines;
    if (ctx.measureText(one).width <= maxW) {
      lines = [one];
    } else {
      var top = panel.place + '  ' + panel.time;
      var bottom = panel.tag;
      var size2 = size;
      ctx.font = size2 + 'px ' + FONT_CHIP;
      while (size2 > minSize && (ctx.measureText(top).width > maxW || ctx.measureText(bottom).width > maxW)) {
        size2 -= 1;
        ctx.font = size2 + 'px ' + FONT_CHIP;
      }
      size = size2;
      lines = [top, bottom];
    }
    var lineH = size * 1.25;
    var chipH = lines.length * lineH + size * 0.5;
    var chipY = rect.y + rect.h - chipH - Math.max(5, rect.h * 0.03);
    var chipW = rect.w;
    ctx.fillStyle = 'rgba(0,0,0,0.88)';
    ctx.fillRect(rect.x, chipY, chipW, chipH);
    ctx.fillStyle = '#ffffff';
    ctx.font = size + 'px ' + FONT_CHIP;
    for (var i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], rect.x + padX, chipY + size * 0.95 + i * lineH);
    }
  }

  /* -------------------------------------------------------------- the cover */

  function drawCover(canvas, state, images) {
    var W = canvas.width;
    var H = canvas.height;
    var ctx = canvas.getContext('2d');
    var collageH = Math.round(H * 0.54);
    var bandH = Math.round(H * 0.32);
    var quoteH = Math.round(H * 0.05);
    var bandY = collageH;
    var quoteY = bandY + bandH;
    var footerY = quoteY + quoteH;

    /* white base so the gutters read as white */
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);

    /* ---- collage ---- */
    var grade = GRADES[state.grade] || GRADES.sunset;
    var s = Math.max(0, Math.min(1, state.strength == null ? 1 : state.strength));
    var rects = layoutPanels(state.layout, W, collageH);
    var panels = state.panels || defaultPanels(state.layout);
    for (var i = 0; i < rects.length; i++) {
      var r = rects[i];
      var p = panels[i % panels.length];
      var img = images[p.photo] || images.boulevard;
      ctx.save();
      ctx.beginPath();
      ctx.rect(r.x, r.y, r.w, r.h);
      ctx.clip();
      if (img) {
        ctx.filter =
          'sepia(' + (grade.sepia * s).toFixed(3) + ') saturate(' + (1 + (grade.saturate - 1) * s).toFixed(3) +
          ') contrast(' + (1 + (grade.contrast - 1) * s).toFixed(3) + ') brightness(' + (1 + (grade.brightness - 1) * s).toFixed(3) + ')';
        drawImageCover(ctx, img, r.x, r.y, r.w, r.h, 0.12 + ((i * 0.07) % 0.18));
        ctx.filter = 'none';
        if (grade.tint * s > 0.005) {
          ctx.fillStyle = 'rgba(255,110,20,' + (grade.tint * s).toFixed(3) + ')';
          ctx.fillRect(r.x, r.y, r.w, r.h);
        }
        /* gentle warm wash at the top of the hero for the golden-hour feel */
        if (i === 0) {
          var warm = ctx.createLinearGradient(0, r.y, 0, r.y + r.h * 0.5);
          warm.addColorStop(0, 'rgba(255,170,60,0.20)');
          warm.addColorStop(1, 'rgba(255,170,60,0)');
          ctx.fillStyle = warm;
          ctx.fillRect(r.x, r.y, r.w, r.h * 0.5);
        }
      } else {
        ctx.fillStyle = '#3a2b3f';
        ctx.fillRect(r.x, r.y, r.w, r.h);
      }
      ctx.restore();
      drawLabelChip(ctx, p, r);
    }

    /* ---- badges on the collage ---- */
    var pillH = Math.max(18, Math.round(H * 0.028));
    var pillFont = Math.max(11, Math.round(pillH * 0.52));
    function pill(x, y, text, bg, fg) {
      ctx.font = pillFont + 'px ' + FONT_CHIP;
      var tw = ctx.measureText(text).width;
      var pw = tw + pillH * 0.9;
      ctx.fillStyle = bg;
      roundRect(ctx, x, y, pw, pillH, pillH / 2);
      ctx.fill();
      ctx.fillStyle = fg;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, x + pillH * 0.45, y + pillH / 2 + 1);
      return pw;
    }
    ctx.textBaseline = 'middle';
    pill(Math.max(6, W * 0.008), Math.max(6, collageH * 0.03), 'VOL. 06', '#111111', '#ffd23e');
    /* starburst on the hero */
    var burstR = Math.max(26, Math.round(W * 0.032));
    var burstX = W * 0.55 - burstR * 1.1;
    var burstY = collageH * 0.16;
    ctx.fillStyle = '#ffd23e';
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = Math.max(2, W * 0.002);
    star(ctx, burstX, burstY, burstR, burstR * 0.72, 12);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#111111';
    ctx.textAlign = 'center';
    ctx.font = 'bold ' + Math.max(9, Math.round(burstR * 0.22)) + 'px Arial, sans-serif';
    ctx.fillText('ORIGINAL', burstX, burstY - burstR * 0.14);
    ctx.fillText('COVER ART', burstX, burstY + burstR * 0.16);
    /* WANTED / HEAT pills on the two top-right panels */
    var topY = Math.max(6, collageH * 0.03);
    var rightX = W * 0.55 + Math.max(6, W * 0.008);
    ctx.textAlign = 'left';
    var w1 = pill(rightX, topY, 'WANTED \u2605\u2605\u2605\u2605\u2605', '#111111', '#ffffff');
    var heatX = rightX + w1 + Math.max(8, W * 0.01);
    pill(heatX, topY, 'HEAT \u2605\u2605\u2605\u2605\u2605', '#111111', '#ffd23e');

    /* ---- title band: rich sunset gradient ---- */
    var band = ctx.createLinearGradient(0, bandY, 0, bandY + bandH);
    band.addColorStop(0, '#2a0a3a');
    band.addColorStop(0.45, '#ff2e88');
    band.addColorStop(1, '#ff7a1a');
    ctx.fillStyle = band;
    ctx.fillRect(0, bandY, W, bandH);

    /* ---- title: grow until ~88% width or the band-height cap ---- */
    var title = (state.title || 'VICE TIDE').toUpperCase();
    var maxTitleSize = Math.floor(bandH * 0.62);
    var titleSize = Math.max(24, Math.floor(bandH * 0.3));
    ctx.font = titleSize + 'px ' + FONT_ANTON;
    var targetW = W * 0.88;
    while (ctx.measureText(title).width < targetW && titleSize < maxTitleSize) {
      titleSize += 4;
      ctx.font = titleSize + 'px ' + FONT_ANTON;
    }
    var titleGrad = ctx.createLinearGradient(0, bandY, 0, bandY + bandH * 0.75);
    titleGrad.addColorStop(0, '#fff7ae');
    titleGrad.addColorStop(0.5, '#ffb347');
    titleGrad.addColorStop(1, '#ff5e3a');
    var titleBaseline = bandY + bandH * 0.52;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(3, Math.round(titleSize * 0.09));
    ctx.strokeStyle = '#111111';
    ctx.strokeText(title, W / 2, titleBaseline);
    ctx.shadowColor = 'rgba(0,0,0,0.45)';
    ctx.shadowBlur = Math.max(6, Math.round(titleSize * 0.08));
    ctx.shadowOffsetY = Math.max(3, Math.round(titleSize * 0.03));
    ctx.fillStyle = titleGrad;
    ctx.fillText(title, W / 2, titleBaseline);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    /* ---- script subtitle: hot pink, white outline, overlapping the title ---- */
    var scriptSize = Math.round(titleSize * 0.42);
    ctx.font = scriptSize + 'px ' + FONT_SCRIPT;
    var scriptBaseline = bandY + bandH * 0.82;
    ctx.lineWidth = Math.max(2, Math.round(scriptSize * 0.08));
    ctx.strokeStyle = '#ffffff';
    ctx.strokeText(state.script || 'Saltwater Nights', W / 2, scriptBaseline);
    ctx.fillStyle = '#ff2e88';
    ctx.fillText(state.script || 'Saltwater Nights', W / 2, scriptBaseline);

    /* ---- small COLLECTOR'S EDITION bar, bottom-right of the band ---- */
    var ribH = Math.max(14, Math.round(bandH * 0.11));
    var ribFont = Math.max(10, Math.round(ribH * 0.55));
    ctx.font = ribFont + 'px ' + FONT_CHIP;
    var ribText = "COLLECTOR'S EDITION";
    var ribW = ctx.measureText(ribText).width + ribH * 1.2;
    var ribX = W - ribW - Math.max(8, W * 0.012);
    var ribY = bandY + bandH - ribH - Math.max(6, bandH * 0.05);
    ctx.fillStyle = '#ff2e88';
    ctx.fillRect(ribX, ribY, ribW, ribH);
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(ribText, ribX + ribH * 0.6, ribY + ribH / 2 + 1);

    /* ---- quote strip ---- */
    ctx.fillStyle = '#111111';
    ctx.fillRect(0, quoteY, W, quoteH);
    var quoteSize = Math.max(10, Math.round(quoteH * 0.42));
    ctx.fillStyle = '#ffd23e';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    var quote = '\u2605\u2605\u2605\u2605\u2605   \u201c' + (state.quote || '') + '\u201d   \u2014 THE COAST HERALD';
    ctx.font = quoteSize + 'px ' + FONT_CHIP;
    if (ctx.measureText(quote).width > W * 0.96) {
      ctx.font = Math.max(9, Math.floor(quoteSize * 0.85)) + 'px ' + FONT_CHIP;
    }
    ctx.fillText(quote, W / 2, quoteY + quoteH / 2 + 1);

    /* ---- footer: tagline, barcode, disclaimer, palms, EST seal ---- */
    var footerH = H - footerY;
    var footGrad = ctx.createLinearGradient(0, footerY, 0, H);
    footGrad.addColorStop(0, '#3a0a4a');
    footGrad.addColorStop(1, '#ff7a1a');
    ctx.fillStyle = footGrad;
    ctx.fillRect(0, footerY, W, footerH);
    var tagSize = Math.max(10, Math.round(footerH * 0.24));
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = tagSize + 'px ' + FONT_CHIP;
    ctx.fillText(state.tagline || '', W / 2, footerY + footerH * 0.26);
    var discSize = Math.max(8, Math.round(footerH * 0.13));
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = discSize + 'px Arial, sans-serif';
    ctx.fillText('VICE TIDE IS FAN FICTION. NOT AFFILIATED WITH OR ENDORSED BY ANY GAME STUDIO. ALL PHOTOS MADE FOR MAKE.FUN.', W / 2, footerY + footerH * 0.82);
    /* barcode, bars only, no number line */
    var barW = Math.max(48, Math.round(W * 0.075));
    var barH = Math.round(footerH * 0.52);
    drawBarcode(ctx, W - barW - Math.max(10, W * 0.02), footerY + footerH * 0.12, barW, barH);
    /* EST. 2026 gold seal */
    var sealR = Math.max(13, Math.round(footerH * 0.26));
    var sealX = W - barW - Math.max(10, W * 0.02) - sealR - Math.max(10, W * 0.015);
    var sealY = footerY + footerH * 0.42;
    ctx.fillStyle = '#ffd23e';
    ctx.strokeStyle = '#7a5b00';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(sealX, sealY, sealR, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#7a5b00';
    ctx.textAlign = 'center';
    ctx.font = 'bold ' + Math.max(8, Math.round(sealR * 0.34)) + 'px Arial, sans-serif';
    ctx.fillText('EST.', sealX, sealY - sealR * 0.12);
    ctx.fillText('2026', sealX, sealY + sealR * 0.28);
    /* palm silhouettes */
    var palmH = footerH * 0.85;
    drawPalm(ctx, Math.max(14, W * 0.02), footerY + footerH * 0.92, palmH, 'rgba(0,0,0,0.55)');
    drawPalm(ctx, Math.max(14, W * 0.02) + palmH * 0.55, footerY + footerH * 0.92, palmH * 0.7, 'rgba(0,0,0,0.45)');
    drawPalm(ctx, W - Math.max(14, W * 0.02), footerY + footerH * 0.92, palmH * 0.8, 'rgba(0,0,0,0.5)');
  }

  return {
    LAYOUTS: LAYOUTS,
    GRADES: GRADES,
    PHOTOS: PHOTOS,
    defaultState: defaultState,
    defaultPanels: defaultPanels,
    layoutPanels: layoutPanels,
    drawCover: drawCover,
    loadPhotos: loadPhotos,
    ensureFonts: ensureFonts,
  };
})();
