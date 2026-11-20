// shots.js — screenshot mode for VICE TIDE.
// Loaded BEFORE main.js. Reads ?shot=cover | ?shot=editor from the URL.
// ?shot=cover: renders the cover full-bleed on #preview, then sets
//   window.__shotDone("cover"). main.js sees __shotCoverOnly and stays out.
// ?shot=editor: does nothing here — main.js builds the editor UI and calls
//   window.__shotDone("editor") after its first render.
// window.__shotDonePromise resolves with the shot name when done.

import { drawCover, SIZES, DEFAULTS } from "./cover.js";

const params = new URLSearchParams(location.search);
const shot = params.get("shot") || "cover";
const sizeName = params.get("size") || "square";
const layout = params.get("layout") || DEFAULTS.layout;
const grade = params.get("grade") || DEFAULTS.grade;
const photo = params.get("photo") || DEFAULTS.photo;

window.__shotCoverOnly = shot === "cover";
window.__shotName = shot;

let resolveDone;
window.__shotDonePromise = new Promise((res) => { resolveDone = res; });
window.__shotDone = (name) => {
  window.__shotReady = true;
  if (resolveDone) resolveDone(name || shot);
};

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

async function renderCoverShot() {
  if (shot !== "cover") return;
  await document.fonts.ready.catch(() => {});
  const wParam = parseInt(params.get("w") || "", 10);
  const hParam = parseInt(params.get("h") || "", 10);
  const [sw, sh] = SIZES[sizeName] || SIZES.square;
  const w = Number.isFinite(wParam) && wParam > 0 ? wParam : sw;
  const h = Number.isFinite(hParam) && hParam > 0 ? hParam : sh;
  const images = {
    boulevard: await loadImage("samples/boulevard.jpg"),
    pier: await loadImage("samples/pier.jpg"),
  };
  const canvas = document.getElementById("preview");
  if (!canvas) {
    window.__shotDone(shot);
    return;
  }
  // A cover shot is the cover ONLY: hide every bit of editor chrome and
  // let the canvas fill the viewport exactly (no letterboxing).
  document.querySelectorAll(".topbar, .controls, .size-label").forEach((el) => {
    el.style.display = "none";
  });
  const layoutEl = document.querySelector(".layout");
  if (layoutEl) layoutEl.style.cssText = "display:block;padding:0;margin:0;max-width:none;";
  const colEl = document.querySelector(".preview-col");
  if (colEl) colEl.style.cssText = "padding:0;margin:0;text-align:left;";
  document.body.style.margin = "0";
  document.body.style.background = "#ffffff";
  canvas.width = w;
  canvas.height = h;
  canvas.style.maxWidth = "none";
  canvas.style.width = "100vw";
  canvas.style.height = "100vh";
  canvas.style.objectFit = "fill";
  canvas.style.display = "block";
  canvas.style.margin = "0";
  const ctx = canvas.getContext("2d");
  drawCover(ctx, {
    w, h,
    images,
    photo,
    title: DEFAULTS.title,
    script: DEFAULTS.script,
    quote: DEFAULTS.quote,
    layout,
    grade,
    strength: 1.0,
  });
  window.__shotDone(shot);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", renderCoverShot);
} else {
  renderCoverShot();
}
