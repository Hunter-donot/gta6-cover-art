// VICE TIDE Cover Studio — wires the page: photos, panels, layout, grade,
// caption, export. A `?shot=` query sets up a fixed scene for a screenshot
// instead (./shots.js). The cover itself is drawn by ./cover.js.
import {
  drawCover, defaultState, defaultPanels, layoutPanels, collageRect,
  SIZES, GRADES, LAYOUTS, SUBTITLES, PHOTO_VIEWS, DEFAULT_LABELS, ensureFonts,
} from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const statusEl = document.getElementById('status');
const state = defaultState();
const photos = {}; // photoId -> { img, name }
const photoOrder = ['boulevard', 'pier'];
let uploadCount = 0;
let fillOffset = 0;
let shotCover = false;

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function photoMap() {
  const map = {};
  for (const id of photoOrder) if (photos[id]) map[id] = photos[id].img;
  return map;
}

function setStatus(text) {
  statusEl.textContent = text;
}

/** Sizes the preview canvas for the current export size and redraws the cover. */
function renderPreview() {
  const size = SIZES[state.size];
  let w, h;
  if (shotCover) {
    w = size.w; h = size.h;
  } else {
    w = size.w >= size.h ? 960 : 720;
    h = Math.round((w * size.h) / size.w);
  }
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  const ctx = canvas.getContext('2d');
  drawCover(ctx, photoMap(), state, w, h, shotCover ? -1 : state.selected);
}

/** Renders the cover at full export size on a fresh canvas. */
function renderExport(sizeKey) {
  const size = SIZES[sizeKey];
  const off = document.createElement('canvas');
  off.width = size.w;
  off.height = size.h;
  drawCover(off.getContext('2d'), photoMap(), state, size.w, size.h, -1);
  return off;
}

function downloadCanvas(off, filename) {
  return new Promise((resolve) => {
    off.toBlob((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      resolve();
    }, 'image/png');
  });
}

async function exportPNG(sizeKey) {
  const size = SIZES[sizeKey];
  await downloadCanvas(renderExport(sizeKey), `vice-tide-cover-${size.w}x${size.h}.png`);
  setStatus(`Saved vice-tide-cover-${size.w}x${size.h}.png`);
}

async function exportAll() {
  for (const key of Object.keys(SIZES)) {
    await exportPNG(key);
    await new Promise((r) => setTimeout(r, 350));
  }
  setStatus('Saved all 3 sizes — landscape, portrait and square.');
}

// ---------- thumbnails ----------

const photosList = document.getElementById('photosList');

function addThumbnail(id) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'thumb';
  btn.dataset.id = id;
  btn.title = photos[id].name;
  const img = document.createElement('img');
  img.src = photos[id].img.src;
  img.alt = photos[id].name;
  const span = document.createElement('span');
  span.textContent = photos[id].name;
  btn.append(img, span);
  btn.addEventListener('click', () => assignPhotoToSelected(id));
  photosList.appendChild(btn);
}

function buildThumbnails() {
  photosList.innerHTML = '';
  for (const id of photoOrder) addThumbnail(id);
}

/** Puts a photo into the selected panel as its face view. */
function assignPhotoToSelected(id) {
  const slot = state.panels[state.selected];
  if (!slot) return;
  const view = (PHOTO_VIEWS[id] ?? [])[0] ?? { id: 'hero', cx: 0.5, cy: 0.42, zoom: 1, label: DEFAULT_LABELS[0] };
  slot.photoId = id;
  slot.viewId = view.id;
  slot.cx = view.cx;
  slot.cy = view.cy;
  slot.zoom = 1;
  slot.label = view.label;
  syncPanelControls();
  renderPreview();
}

async function addUpload(file) {
  if (!file || !file.type.startsWith('image/')) return;
  const url = URL.createObjectURL(file);
  const img = await loadImage(url);
  uploadCount += 1;
  const id = `up${uploadCount}`;
  const li = (uploadCount - 1) % DEFAULT_LABELS.length;
  PHOTO_VIEWS[id] = [
    { id: 'hero', cx: 0.5, cy: 0.42, zoom: 1.0, face: true, label: DEFAULT_LABELS[li] },
    { id: 'detail-left', cx: 0.25, cy: 0.62, zoom: 1.9, face: false, label: DEFAULT_LABELS[(li + 2) % DEFAULT_LABELS.length] },
    { id: 'detail-right', cx: 0.75, cy: 0.3, zoom: 2.0, face: false, label: DEFAULT_LABELS[(li + 4) % DEFAULT_LABELS.length] },
  ];
  photos[id] = { img, name: file.name.replace(/\.[^.]+$/, '').slice(0, 18) || `Photo ${uploadCount}` };
  photoOrder.push(id);
  addThumbnail(id);
  setStatus(`Added ${photos[id].name} — click its thumbnail to put it in the selected panel.`);
}

// ---------- panel controls ----------

const panelSelect = document.getElementById('panelSelect');
const zoomSlider = document.getElementById('zoomSlider');
const zoomValue = document.getElementById('zoomValue');
const fitSelect = document.getElementById('fitSelect');
const panelLabelInput = document.getElementById('panelLabel');

function rebuildPanelSelect() {
  panelSelect.innerHTML = '';
  const count = layoutPanels(state.layout, { x: 0, y: 0, w: 100, h: 100 }).length;
  for (let i = 0; i < count; i++) {
    const opt = document.createElement('option');
    opt.value = String(i);
    opt.textContent = i === 0 ? `Panel ${i + 1} — Hero` : `Panel ${i + 1}`;
    panelSelect.appendChild(opt);
  }
  panelSelect.value = String(Math.min(state.selected, count - 1));
}

function syncPanelControls() {
  rebuildPanelSelect();
  const slot = state.panels[state.selected];
  if (!slot) return;
  zoomSlider.value = String(slot.zoom ?? 1);
  zoomValue.textContent = `${(slot.zoom ?? 1).toFixed(2)}x`;
  fitSelect.value = slot.fit ?? 'cover';
  panelLabelInput.value = slot.label ?? '';
}

panelSelect.addEventListener('change', () => {
  state.selected = Number(panelSelect.value);
  syncPanelControls();
  renderPreview();
});
zoomSlider.addEventListener('input', () => {
  const slot = state.panels[state.selected];
  if (!slot) return;
  slot.zoom = Number(zoomSlider.value);
  zoomValue.textContent = `${slot.zoom.toFixed(2)}x`;
  renderPreview();
});
fitSelect.addEventListener('change', () => {
  const slot = state.panels[state.selected];
  if (!slot) return;
  slot.fit = fitSelect.value;
  renderPreview();
});
panelLabelInput.addEventListener('input', () => {
  const slot = state.panels[state.selected];
  if (!slot) return;
  slot.label = panelLabelInput.value;
  renderPreview();
});
document.getElementById('centerCropBtn').addEventListener('click', () => {
  const slot = state.panels[state.selected];
  if (!slot) return;
  const view = (PHOTO_VIEWS[slot.photoId] ?? []).find((v) => v.id === slot.viewId);
  slot.cx = view ? view.cx : 0.5;
  slot.cy = view ? view.cy : 0.42;
  slot.zoom = 1;
  syncPanelControls();
  renderPreview();
  setStatus('Panel re-centred on its subject.');
});
document.getElementById('replacePhotoBtn').addEventListener('click', () => {
  const slot = state.panels[state.selected];
  if (!slot) return;
  const next = photoOrder[(photoOrder.indexOf(slot.photoId) + 1) % photoOrder.length];
  assignPhotoToSelected(next);
  setStatus(`Panel now shows ${photos[next].name}.`);
});
document.getElementById('autoFillBtn').addEventListener('click', () => {
  fillOffset += 1;
  const ids = [...photoOrder];
  for (let i = 0; i < fillOffset; i++) ids.push(ids.shift());
  state.panels = defaultPanels(state.layout, ids);
  state.selected = 0;
  syncPanelControls();
  renderPreview();
  setStatus('Panels auto-filled with a fresh mix of photos.');
});

// Click the preview to select a panel.
canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
  const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
  const panels = layoutPanels(state.layout, collageRect(canvas.width, canvas.height));
  const hit = panels.findIndex((p) => x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h);
  if (hit >= 0) {
    state.selected = hit;
    syncPanelControls();
    renderPreview();
  }
});

// ---------- layout / grade / size buttons ----------

function wireChoice(containerId, attr, onPick) {
  // Delegated: layout and grade buttons are rebuilt by syncAll(), so the
  // listener lives on the container, not on the buttons themselves.
  const container = document.getElementById(containerId);
  container.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn || !btn.dataset[attr]) return;
    container.querySelectorAll('button').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    onPick(btn.dataset[attr]);
  });
}

function buildLayoutButtons() {
  const box = document.getElementById('layoutBtns');
  box.innerHTML = '';
  for (const [key, name] of Object.entries(LAYOUTS)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.layout = key;
    b.textContent = name;
    if (key === state.layout) b.classList.add('active');
    box.appendChild(b);
  }
}
function buildGradeButtons() {
  const box = document.getElementById('gradeBtns');
  box.innerHTML = '';
  for (const [key, g] of Object.entries(GRADES)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.grade = key;
    b.textContent = g.name;
    if (key === state.grade) b.classList.add('active');
    box.appendChild(b);
  }
}

wireChoice('layoutBtns', 'layout', (key) => {
  state.layout = key;
  state.panels = defaultPanels(key, photoOrder);
  state.selected = 0;
  syncPanelControls();
  renderPreview();
});
wireChoice('gradeBtns', 'grade', (key) => {
  state.grade = key;
  renderPreview();
});
wireChoice('sizeBtns', 'size', (key) => {
  state.size = key;
  renderPreview();
});

// ---------- sliders ----------

const SLIDERS = [
  ['strength', 0, 1, 0.05], ['contrast', 0.7, 1.5, 0.05], ['saturation', 0.5, 1.8, 0.05],
  ['grain', 0, 1, 0.05], ['vignette', 0, 1, 0.05], ['halftone', 0, 1, 0.05],
  ['painterly', 0, 1, 0.05], ['ink', 0, 1, 0.05],
];
for (const [key, min, max, step] of SLIDERS) {
  const input = document.getElementById(`${key}Slider`);
  const value = document.getElementById(`${key}Value`);
  input.min = String(min); input.max = String(max); input.step = String(step);
  input.value = String(state[key]);
  value.textContent = state[key].toFixed(2);
  input.addEventListener('input', () => {
    state[key] = Number(input.value);
    value.textContent = state[key].toFixed(2);
    renderPreview();
  });
}

// ---------- caption fields and toggles ----------

const FIELDS = [
  ['title', 'titleInput'], ['subtitle', 'subtitleInput'], ['tagline', 'taglineInput'],
  ['badge', 'badgeInput'], ['volume', 'volumeInput'], ['ribbon', 'ribbonInput'],
  ['hud', 'hudInput'], ['quote', 'quoteInput'], ['quoteBy', 'quoteByInput'],
];
for (const [key, id] of FIELDS) {
  const input = document.getElementById(id);
  input.value = state[key];
  input.addEventListener('input', () => {
    state[key] = input.value;
    renderPreview();
  });
}
const starsInput = document.getElementById('starsInput');
starsInput.value = String(state.stars);
starsInput.addEventListener('input', () => {
  state.stars = Math.max(1, Math.min(5, Number(starsInput.value) || 5));
  renderPreview();
});
const TOGGLES = [
  ['showLabels', 'labelsToggle'], ['showBadge', 'badgeToggle'],
  ['showVolume', 'volumeToggle'], ['showRibbon', 'ribbonToggle'],
];
for (const [key, id] of TOGGLES) {
  const input = document.getElementById(id);
  input.checked = state[key];
  input.addEventListener('change', () => {
    state[key] = input.checked;
    renderPreview();
  });
}

// ---------- photos: file input + drag and drop ----------

document.getElementById('addPhotos').addEventListener('change', async (e) => {
  for (const file of e.target.files) await addUpload(file);
  e.target.value = '';
});
const dropZone = document.getElementById('dropZone');
dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag'));
dropZone.addEventListener('drop', async (e) => {
  e.preventDefault();
  dropZone.classList.remove('drag');
  for (const file of e.dataTransfer.files) await addUpload(file);
});

// ---------- top bar: surprise me + export ----------

document.getElementById('surpriseBtn').addEventListener('click', () => {
  const layoutKeys = Object.keys(LAYOUTS);
  const gradeKeys = Object.keys(GRADES);
  state.layout = layoutKeys[Math.floor(Math.random() * layoutKeys.length)];
  state.grade = gradeKeys[Math.floor(Math.random() * gradeKeys.length)];
  state.subtitle = SUBTITLES[Math.floor(Math.random() * SUBTITLES.length)];
  fillOffset += 1;
  const ids = [...photoOrder];
  for (let i = 0; i < fillOffset; i++) ids.push(ids.shift());
  state.panels = defaultPanels(state.layout, ids);
  state.selected = 0;
  state.grain = 0.2 + Math.random() * 0.5;
  state.vignette = 0.3 + Math.random() * 0.4;
  state.halftone = Math.random() * 0.6;
  syncAll();
  renderPreview();
  setStatus(`Surprise! ${LAYOUTS[state.layout]} layout, ${GRADES[state.grade].name} grade, “${state.subtitle}”.`);
});
document.getElementById('exportBtn').addEventListener('click', () => exportPNG(state.size));
document.getElementById('exportTopBtn').addEventListener('click', () => exportPNG(state.size));
document.getElementById('exportAllBtn').addEventListener('click', exportAll);

/** Pushes the whole state back into every control (after Surprise Me / a shot). */
function syncAll() {
  buildLayoutButtons();
  buildGradeButtons();
  document.querySelectorAll('#sizeBtns button').forEach((b) => b.classList.toggle('active', b.dataset.size === state.size));
  for (const [key] of SLIDERS) {
    const input = document.getElementById(`${key}Slider`);
    const value = document.getElementById(`${key}Value`);
    input.value = String(state[key]);
    value.textContent = state[key].toFixed(2);
  }
  for (const [key, id] of FIELDS) document.getElementById(id).value = state[key];
  starsInput.value = String(state.stars);
  for (const [key, id] of TOGGLES) document.getElementById(id).checked = state[key];
  syncPanelControls();
}

// ---------- boot ----------

async function boot() {
  buildLayoutButtons();
  buildGradeButtons();
  for (const [id, file] of [['boulevard', 'boulevard'], ['pier', 'pier']]) {
    photos[id] = { img: await loadImage(`samples/${file}.jpg`), name: id === 'boulevard' ? 'Boulevard' : 'Pier' };
  }
  buildThumbnails();
  state.panels = defaultPanels(state.layout, photoOrder);
  syncPanelControls();
  await ensureFonts();
  renderPreview();

  const params = new URLSearchParams(location.search);
  const shot = params.get('shot');
  if (shot) {
    if (shot === 'cover') {
      shotCover = true;
      state.size = window.innerWidth > window.innerHeight ? 'landscape'
        : window.innerWidth < window.innerHeight ? 'portrait' : 'square';
    }
    await runShot(shot, params, {
      apply: async (photoId, caption) => {
        if (photos[photoId]) {
          // Rebuild the panels with the shot's photo first: the hero slot
          // takes it, and no face is ever repeated in the cover.
          const ids = [...photoOrder];
          const i = ids.indexOf(photoId);
          if (i > 0) { ids.splice(i, 1); ids.unshift(photoId); }
          state.panels = defaultPanels(state.layout, ids);
          state.selected = 0;
        }
        state.title = caption;
        document.getElementById('titleInput').value = caption;
      },
      ensureFonts,
      redraw: renderPreview,
    });
  }
}

boot().catch((err) => {
  setStatus(`Could not start the studio: ${err.message}`);
  console.error(err);
});
