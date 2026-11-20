// VICE TIDE Cover Studio — editor.
// Dark 3-column editor: photos left, preview centre, controls right.
// Plain ES module, imports the cover renderer from cover.js.

import {
  PHOTOS,
  LAYOUTS,
  GRADES,
  EXPORT_SIZES,
  defaultState,
  drawCover,
  loadPhotos,
  photosReady,
} from './cover.js';

const state = defaultState();
let images = loadPhotos();
let uploaded = null; // { name, img } when the user uploads a photo
let exportSize = 'square';

const $ = (id) => document.getElementById(id);

function activeImages() {
  if (uploaded) return { boulevard: uploaded.img, pier: uploaded.img };
  return images;
}

function renderPreview() {
  const canvas = $('preview');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const size = EXPORT_SIZES[exportSize] || EXPORT_SIZES.square;
  // Preview at a fixed display size; the export uses the real size.
  const pw = 640;
  const ph = Math.round((640 * size.h) / size.w);
  canvas.width = pw;
  canvas.height = ph;
  drawCover(ctx, state, pw, ph, activeImages());
}

function renderExport() {
  const size = EXPORT_SIZES[exportSize] || EXPORT_SIZES.square;
  const off = document.createElement('canvas');
  off.width = size.w;
  off.height = size.h;
  const ctx = off.getContext('2d');
  drawCover(ctx, state, size.w, size.h, activeImages());
  return off;
}

function buildPhotoList() {
  const list = $('photo-list');
  if (!list) return;
  list.innerHTML = '';
  for (const key of Object.keys(PHOTOS)) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'photo-btn' + (state.photo === key ? ' active' : '');
    btn.textContent = PHOTOS[key].label + ' — ' + PHOTOS[key].tag;
    btn.addEventListener('click', () => {
      state.photo = key;
      uploaded = null;
      buildPhotoList();
      renderPreview();
    });
    list.appendChild(btn);
  }
}

function buildPickers() {
  const layoutSel = $('layout');
  if (layoutSel) {
    layoutSel.innerHTML = '';
    for (const key of Object.keys(LAYOUTS)) {
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = LAYOUTS[key].name;
      if (key === state.layout) opt.selected = true;
      layoutSel.appendChild(opt);
    }
    layoutSel.addEventListener('change', () => {
      state.layout = layoutSel.value;
      renderPreview();
    });
  }
  const gradeSel = $('grade');
  if (gradeSel) {
    gradeSel.innerHTML = '';
    for (const key of Object.keys(GRADES)) {
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = GRADES[key].name;
      if (key === state.grade) opt.selected = true;
      gradeSel.appendChild(opt);
    }
    gradeSel.addEventListener('change', () => {
      state.grade = gradeSel.value;
      renderPreview();
    });
  }
  const sizeSel = $('export-size');
  if (sizeSel) {
    sizeSel.innerHTML = '';
    for (const key of Object.keys(EXPORT_SIZES)) {
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = EXPORT_SIZES[key].name;
      if (key === exportSize) opt.selected = true;
      sizeSel.appendChild(opt);
    }
    sizeSel.addEventListener('change', () => {
      exportSize = sizeSel.value;
      renderPreview();
    });
  }
  const strength = $('strength');
  if (strength) {
    strength.value = String(state.strength);
    strength.addEventListener('input', () => {
      state.strength = parseFloat(strength.value);
      renderPreview();
    });
  }
  const titleInput = $('title-input');
  if (titleInput) {
    titleInput.value = state.title;
    titleInput.addEventListener('input', () => {
      state.title = titleInput.value.toUpperCase() || 'VICE TIDE';
      renderPreview();
    });
  }
  const scriptInput = $('script-input');
  if (scriptInput) {
    scriptInput.value = state.script;
    scriptInput.addEventListener('input', () => {
      state.script = scriptInput.value || 'Saltwater Nights';
      renderPreview();
    });
  }
  const quoteInput = $('quote-input');
  if (quoteInput) {
    quoteInput.value = state.quote;
    quoteInput.addEventListener('input', () => {
      state.quote = quoteInput.value || 'NEON, SALT AND FIVE STARS OF TROUBLE';
      renderPreview();
    });
  }
}

function buildUpload() {
  const input = $('upload');
  if (!input) return;
  input.addEventListener('change', () => {
    const file = input.files && input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        uploaded = { name: file.name, img };
        state.photo = 'uploaded';
        renderPreview();
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

function buildExport() {
  const btn = $('export-btn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const off = renderExport();
    const a = document.createElement('a');
    a.download = `vice-tide-${exportSize}.png`;
    a.href = off.toDataURL('image/png');
    a.click();
  });
}

function tick() {
  if (photosReady(activeImages())) {
    renderPreview();
  } else {
    setTimeout(tick, 120);
  }
}

export function initEditor() {
  buildPhotoList();
  buildPickers();
  buildUpload();
  buildExport();
  tick();
}

// Shot mode sets window.__shotCoverOnly so the editor never initialises;
// shots.js drives the cover directly instead.
if (!window.__shotCoverOnly) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEditor);
  } else {
    initEditor();
  }
}
