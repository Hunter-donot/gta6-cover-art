// main.js — VICE TIDE editor.
// Dark 3-column editor: photo picker + upload, layout/grade/size pickers,
// text inputs, strength slider, PNG export. Renders into #preview via
// cover.js drawCover(). Expects shots.js loaded before this file.

import { drawCover, LAYOUTS, GRADES, SIZES, DEFAULTS } from "./cover.js";

const $ = (sel) => document.querySelector(sel);

const state = {
  photo: DEFAULTS.photo,
  title: DEFAULTS.title,
  script: DEFAULTS.script,
  quote: DEFAULTS.quote,
  layout: DEFAULTS.layout,
  grade: DEFAULTS.grade,
  strength: DEFAULTS.strength,
  size: DEFAULTS.size,
};

const images = {};
let currentPhotoURL = null;

function loadImage(name, src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => { images[name] = img; resolve(img); };
    img.onerror = () => { images[name] = null; resolve(null); };
    img.src = src;
  });
}

async function loadSamples() {
  await Promise.all([
    loadImage("boulevard", "samples/boulevard.jpg"),
    loadImage("pier", "samples/pier.jpg"),
  ]);
}

function render() {
  const canvas = $("#preview");
  if (!canvas) return;
  const [w, h] = SIZES[state.size] || SIZES.square;
  // Preview at a smaller scale, exact aspect.
  const scale = Math.min(1, 760 / w);
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext("2d");
  ctx.save();
  ctx.scale(canvas.width / w, canvas.height / h);
  drawCover(ctx, {
    w, h,
    images,
    photo: state.photo,
    title: state.title,
    script: state.script,
    quote: state.quote,
    layout: state.layout,
    grade: state.grade,
    strength: state.strength,
  });
  ctx.restore();
  const label = $("#size-label");
  if (label) label.textContent = `${w} × ${h}`;
}

function exportPNG() {
  const [w, h] = SIZES[state.size] || SIZES.square;
  const off = document.createElement("canvas");
  off.width = w;
  off.height = h;
  const ctx = off.getContext("2d");
  drawCover(ctx, {
    w, h,
    images,
    photo: state.photo,
    title: state.title,
    script: state.script,
    quote: state.quote,
    layout: state.layout,
    grade: state.grade,
    strength: state.strength,
  });
  const a = document.createElement("a");
  a.download = `vice-tide-${state.size}-${w}x${h}.png`;
  a.href = off.toDataURL("image/png");
  a.click();
}

function buildPicker(container, items, current, onPick, labelFn) {
  const el = $(container);
  if (!el) return;
  el.innerHTML = "";
  items.forEach((item) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "chip-btn" + (item === current ? " active" : "");
    b.textContent = labelFn ? labelFn(item) : item;
    b.addEventListener("click", () => {
      onPick(item);
      buildPicker(container, items, item, onPick, labelFn);
      render();
    });
    el.appendChild(b);
  });
}

function bindInputs() {
  const title = $("#title-input");
  if (title) title.addEventListener("input", () => { state.title = title.value || DEFAULTS.title; render(); });
  const script = $("#script-input");
  if (script) script.addEventListener("input", () => { state.script = script.value || DEFAULTS.script; render(); });
  const quote = $("#quote-input");
  if (quote) quote.addEventListener("input", () => { state.quote = quote.value; render(); });
  const strength = $("#strength-input");
  if (strength) {
    strength.addEventListener("input", () => {
      state.strength = Number(strength.value);
      const out = $("#strength-value");
      if (out) out.textContent = `${Math.round(state.strength * 100)}%`;
      render();
    });
  }
  const upload = $("#photo-upload");
  if (upload) {
    upload.addEventListener("change", () => {
      const file = upload.files && upload.files[0];
      if (!file) return;
      if (currentPhotoURL) URL.revokeObjectURL(currentPhotoURL);
      currentPhotoURL = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        images.custom = img;
        state.photo = "custom";
        buildPicker("#photo-picker", ["boulevard", "pier", "custom"], "custom", (p) => { state.photo = p; });
        render();
      };
      img.src = currentPhotoURL;
    });
  }
  const exp = $("#export-btn");
  if (exp) exp.addEventListener("click", exportPNG);
}

async function init() {
  // Cover shots are rendered entirely by shots.js — stay out of the way.
  if (window.__shotCoverOnly) return;
  await document.fonts.ready.catch(() => {});
  await loadSamples();
  buildPicker("#photo-picker", ["boulevard", "pier"], state.photo, (p) => { state.photo = p; });
  buildPicker("#layout-picker", LAYOUTS, state.layout, (l) => { state.layout = l; });
  buildPicker("#grade-picker", GRADES, state.grade, (g) => { state.grade = g; });
  buildPicker("#size-picker", Object.keys(SIZES), state.size, (s) => { state.size = s; },
    (s) => `${s} ${SIZES[s][0]}×${SIZES[s][1]}`);
  bindInputs();
  render();
  if (window.__shotDone) window.__shotDone("editor");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
