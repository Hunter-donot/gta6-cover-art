// VICE TIDE Cover Studio — shot mode for screenshots.
// Reads ?shot=cover (standalone cover canvas) or ?shot=editor (editor with a
// preset) and flags window.__shotDone when the frame is painted, so the
// screenshot runner knows the shot is ready. Plain ES module.

import { defaultState, drawCover } from './cover.js';
import { initEditor } from './main.js';

function params() {
  return new URLSearchParams(window.location.search);
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('failed to load ' + src));
    img.src = src;
  });
}

async function loadSamples() {
  const out = {};
  for (const id of ['boulevard', 'pier']) {
    try { out[id] = await loadImage(`samples/${id}.jpg`); }
    catch (e) { console.warn('sample failed:', id, e); }
  }
  return out;
}

async function shotCover() {
  const p = params();
  const w = parseInt(p.get('w') || '1280', 10);
  const h = parseInt(p.get('h') || '720', 10);
  const state = defaultState();
  state.photo = p.get('photo') || 'boulevard';
  state.layout = 'hero7';
  state.grade = 'sunset';
  state.strength = 1.0;
  const photos = await loadSamples();
  // Standalone cover canvas only — no editor chrome on top.
  window.__shotCoverOnly = true;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.style.width = '100vw';
  canvas.style.height = '100vh';
  canvas.style.display = 'block';
  document.body.innerHTML = '';
  document.body.style.margin = '0';
  document.body.style.background = '#160a24';
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  // Wait for the vendored fonts so the title/script render in Anton/Pacifico.
  try { await document.fonts.ready; } catch (e) { /* fonts are best-effort */ }
  drawCover(ctx, w, h, state, photos);
  window.__shotDone = true;
}

async function shotEditor() {
  const root = document.getElementById('app');
  if (!root) { window.__shotDone = true; return; }
  await initEditor(root);
  try { await document.fonts.ready; } catch (e) { /* best-effort */ }
  // Re-render once fonts arrive so the preview is final.
  await new Promise((r) => setTimeout(r, 300));
  window.__shotDone = true;
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const p = params();
    const shot = p.get('shot');
    if (shot === 'cover') shotCover().catch((e) => { console.error(e); window.__shotDone = true; });
    else if (shot === 'editor') shotEditor().catch((e) => { console.error(e); window.__shotDone = true; });
  });
}
