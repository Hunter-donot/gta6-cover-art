// VICE TIDE Cover Studio — editor (3-column dark UI).
// Loads the sample photos, renders a live preview via drawCover, and exports
// PNG in three sizes. Plain ES module, no dependencies.

import { LAYOUTS, GRADES, defaultState, drawCover } from './cover.js';

const SAMPLES = [
  { id: 'boulevard', label: 'Boulevard (sunset woman)', src: 'samples/boulevard.jpg' },
  { id: 'pier', label: 'Pier (fisherman)', src: 'samples/pier.jpg' },
];

const SIZES = {
  '1080x1080': { w: 1080, h: 1080, label: '1080 × 1080 (square)' },
  '1080x1350': { w: 1080, h: 1350, label: '1080 × 1350 (portrait)' },
  '1920x1080': { w: 1920, h: 1080, label: '1920 × 1080 (landscape)' },
};

let state = defaultState();
let photos = {};
let previewCtx = null;
let previewCanvas = null;

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
  for (const s of SAMPLES) {
    try { out[s.id] = await loadImage(s.src); }
    catch (e) { console.warn('sample failed:', s.id, e); }
  }
  return out;
}

function renderPreview() {
  if (!previewCtx || !previewCanvas) return;
  const w = previewCanvas.width;
  const h = previewCanvas.height;
  // The preview canvas MUST render the live cover (a blank preview is a bug).
  const ctx = previewCanvas.getContext('2d');
  if (!ctx) return;
  drawCover(ctx, w, h, state, photos);
}

function sizeOf(state) {
  return SIZES[state.size] || SIZES['1080x1080'];
}

export function exportPNG() {
  const { w, h } = sizeOf(state);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  drawCover(ctx, w, h, state, photos);
  const a = document.createElement('a');
  a.href = canvas.toDataURL('image/png');
  a.download = `vice-tide-${w}x${h}.png`;
  a.click();
}

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}

function buildEditor(root) {
  root.innerHTML = '';
  const wrap = el('div', 'studio');
  // Left: photos.
  const left = el('aside', 'col photos');
  left.appendChild(el('h2', '', 'Photos'));
  const list = el('div', 'photo-list');
  SAMPLES.forEach((s) => {
    const b = el('button', 'photo-btn' + (state.photo === s.id ? ' active' : ''), s.label);
    b.addEventListener('click', () => {
      state.photo = s.id;
      document.querySelectorAll('.photo-btn').forEach((x) => x.classList.remove('active'));
      b.classList.add('active');
      renderPreview();
    });
    list.appendChild(b);
  });
  const up = el('label', 'upload-btn', 'Upload a photo…');
  const file = document.createElement('input');
  file.type = 'file';
  file.accept = 'image/*';
  file.style.display = 'none';
  file.addEventListener('change', async () => {
    const f = file.files && file.files[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    const img = await loadImage(url);
    photos.upload = img;
    state.photo = 'upload';
    renderPreview();
  });
  up.appendChild(file);
  list.appendChild(up);
  left.appendChild(list);
  wrap.appendChild(left);

  // Centre: preview.
  const mid = el('main', 'col preview');
  mid.appendChild(el('h2', '', 'Preview'));
  previewCanvas = document.createElement('canvas');
  const pv = sizeOf(state);
  previewCanvas.width = 960;
  previewCanvas.height = Math.round(960 * pv.h / pv.w);
  previewCanvas.className = 'preview-canvas';
  previewCtx = previewCanvas.getContext('2d');
  mid.appendChild(previewCanvas);
  const exp = el('button', 'export-btn', 'Export PNG');
  exp.addEventListener('click', exportPNG);
  mid.appendChild(exp);
  wrap.appendChild(mid);

  // Right: controls.
  const right = el('aside', 'col controls');
  right.appendChild(el('h2', '', 'Cover'));
  const mkSelect = (label, options, value, onChange) => {
    const lab = el('label', 'field', label);
    const sel = document.createElement('select');
    Object.entries(options).forEach(([k, v]) => {
      const o = document.createElement('option');
      o.value = k;
      o.textContent = typeof v === 'string' ? v : v.name;
      if (k === value) o.selected = true;
      sel.appendChild(o);
    });
    sel.addEventListener('change', () => { onChange(sel.value); renderPreview(); });
    lab.appendChild(sel);
    return lab;
  };
  right.appendChild(mkSelect('Layout', Object.fromEntries(Object.entries(LAYOUTS).map(([k, v]) => [k, v.name])), state.layout, (v) => { state.layout = v; }));
  right.appendChild(mkSelect('Grade', Object.fromEntries(Object.entries(GRADES).map(([k, v]) => [k, v.name])), state.grade, (v) => { state.grade = v; }));
  right.appendChild(mkSelect('Export size', Object.fromEntries(Object.entries(SIZES).map(([k, v]) => [k, v.label])), state.size, (v) => {
    state.size = v;
    const s = sizeOf(state);
    previewCanvas.width = 960;
    previewCanvas.height = Math.round(960 * s.h / s.w);
    previewCtx = previewCanvas.getContext('2d');
  }));
  const mkText = (label, key) => {
    const lab = el('label', 'field', label);
    const inp = document.createElement('input');
    inp.type = 'text';
    inp.value = state[key];
    inp.addEventListener('input', () => { state[key] = inp.value; renderPreview(); });
    lab.appendChild(inp);
    return lab;
  };
  right.appendChild(mkText('Title', 'title'));
  right.appendChild(mkText('Script', 'script'));
  right.appendChild(mkText('Quote', 'quote'));
  right.appendChild(mkText('Tagline', 'tagline'));
  const strengthLab = el('label', 'field', 'Sunset strength');
  const slider = document.createElement('input');
  slider.type = 'range';
  slider.min = '0';
  slider.max = '1.5';
  slider.step = '0.05';
  slider.value = String(state.strength);
  slider.addEventListener('input', () => { state.strength = parseFloat(slider.value); renderPreview(); });
  strengthLab.appendChild(slider);
  right.appendChild(strengthLab);
  wrap.appendChild(right);

  root.appendChild(wrap);
}

export async function initEditor(root) {
  photos = await loadSamples();
  buildEditor(root);
  renderPreview();
  window.__editorReady = true;
}

// Boot when loaded as the page's main script.
if (typeof document !== 'undefined' && !window.__shotCoverOnly) {
  document.addEventListener('DOMContentLoaded', () => {
    const root = document.getElementById('app');
    if (root) initEditor(root);
  });
}
