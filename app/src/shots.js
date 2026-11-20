'use strict';
/* VICE TIDE Cover Studio — shot mode.
   When the page is loaded with ?shot=cover (or ?shot=editor), this renders the
   requested view full-window so headless Chrome can capture it as a screenshot.
   Plain classic script; runs before main.js. Exposes window.__shotReady when the
   render is done. */

(function () {
  var params = new URLSearchParams(window.location.search);
  var shot = params.get('shot');
  if (!shot) return; /* normal editor load: main.js runs the app */

  var layout = params.get('layout') || 'hero7';
  var grade = params.get('grade') || 'sunset';
  var photo = params.get('photo') || 'boulevard';

  function finish() {
    window.__shotReady = true;
    document.title = 'shot-ready';
  }

  if (shot === 'cover') {
    var w = parseInt(params.get('w') || '1280', 10) || 1280;
    var h = parseInt(params.get('h') || '720', 10) || 720;
    /* cover-only render: drop the editor chrome and tell main.js to stay out */
    window.__shotCoverOnly = true;
    var header = document.querySelector('header');
    if (header) header.remove();
    var mainEl = document.querySelector('main');
    if (mainEl) mainEl.remove();
    document.body.style.margin = '0';
    document.body.style.background = '#ffffff';
    var canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.style.display = 'block';
    document.body.appendChild(canvas);
    var state = window.VICE.defaultState();
    state.layout = layout;
    state.grade = grade;
    state.strength = 1.0;
    state.panels = window.VICE.defaultPanels(layout);
    /* the hero panel always uses the requested photo (boulevard = sunset woman) */
    if (state.panels.length > 0) state.panels[0].photo = photo;
    window.VICE.ensureFonts()
      .then(function () { return window.VICE.loadPhotos(); })
      .then(function (images) {
        window.VICE.drawCover(canvas, state, images);
        finish();
      })
      .catch(function () { finish(); });
    return;
  }

  /* shot=editor: the editor itself is rendered by main.js; stash the config
     so main.js starts with the requested layout / grade / photo loaded. */
  if (shot === 'editor') {
    window.__shotConfig = { layout: layout, grade: grade, photo: photo };
  }
})();
