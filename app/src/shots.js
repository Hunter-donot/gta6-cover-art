// VICE TIDE Cover Studio — shot mode.
// Renders the four screenshots headlessly: ?shot=cover draws only the cover
// at ?w= x ?h=; ?shot=editor shows the editor with hero7 + sunset active.
// Sets window.__shotDone when fonts, photos and paint are ready.
// Plain ES module, imports the cover renderer from cover.js.

import {
  PHOTOS,
  defaultState,
  drawCover,
  loadPhotos,
  photosReady,
} from './cover.js';

function params() {
  return new URLSearchParams(window.location.search);
}

function whenReady(images, fn) {
  const check = () => {
    if (photosReady(images) && document.fonts && document.fonts.status === 'loaded') {
      fn();
    } else if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        if (photosReady(images)) fn();
        else setTimeout(check, 100);
      });
    } else {
      setTimeout(check, 100);
    }
  };
  check();
}

function runCoverShot() {
  // Tell main.js (loaded after this module) to skip the editor entirely.
  window.__shotCoverOnly = true;
  const p = params();
  const W = parseInt(p.get('w') || '1280', 10);
  const H = parseInt(p.get('h') || '720', 10);
  const photoKey = p.get('photo') || 'boulevard';
  const state = defaultState();
  state.layout = 'hero7';
  state.grade = 'sunset';
  state.strength = 1.0;
  state.photo = photoKey;
  const images = loadPhotos();
  // Replace the whole page with a bare canvas at exactly W x H.
  document.body.style.margin = '0';
  document.body.style.padding = '0';
  document.body.style.background = '#fff';
  document.body.innerHTML = '';
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  canvas.style.display = 'block';
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  whenReady(images, () => {
    drawCover(ctx, state, W, H, images);
    // One more frame so the paint lands before the screenshot.
    requestAnimationFrame(() => {
      window.__shotDone = true;
    });
  });
}

function runEditorShot() {
  // Let main.js initialise the editor (hero7 + sunset + boulevard by
  // default), then flag done once fonts and photos are ready.
  const images = loadPhotos();
  const state = defaultState();
  void state;
  void PHOTOS;
  const check = () => {
    const preview = document.getElementById('preview');
    if (photosReady(images) && preview && preview.width > 0) {
      window.__shotDone = true;
    } else {
      setTimeout(check, 150);
    }
  };
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => setTimeout(check, 300));
  } else {
    setTimeout(check, 500);
  }
}

const mode = params().get('shot');
if (mode === 'cover') {
  runCoverShot();
} else if (mode === 'editor') {
  runEditorShot();
}
