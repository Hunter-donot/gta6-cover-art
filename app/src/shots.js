// VICE TIDE Cover Studio — screenshot mode.
//
// The app renders its own screenshots from a URL, so the maker never has to
// hand-edit one:
//
//   /app/index.html?shot=cover&w=1280&h=720&photo=boulevard
//       Just the cover, edge to edge, at exactly w x h. The hero panel uses
//       the photo named by &photo (boulevard by default); the other panels
//       keep the defaults. No editor chrome anywhere on the page.
//
//   /app/index.html?shot=cover&w=1080&h=1080
//       Square cover, same idea.
//
//   /app/index.html?shot=cover&w=1024&h=1280
//       Portrait cover, same idea.
//
//   /app/index.html?shot=editor
//       The full editor, 1280 x 720 window, hero7 layout and Vice Sunset
//       grade active with the boulevard photo loaded.
//
// A shot is done when window.__shotDone is true: fonts loaded, photos
// loaded, cover painted. Headless Chrome's --virtual-time-budget gives the
// page time to get there before the screenshot is taken.

(function () {
  'use strict';

  var VT = window.ViceTide;
  var params = new URLSearchParams(location.search);
  var SHOT = params.get('shot');
  if (!SHOT) return;

  function loadImage(src) {
    return new Promise(function (resolve, reject) {
      var im = new Image();
      im.onload = function () { resolve(im); };
      im.onerror = function () { reject(new Error('could not load ' + src)); };
      im.src = src;
    });
  }

  function waitFonts() {
    return Promise.all([
      document.fonts.load('90px Anton'),
      document.fonts.load('90px "Bebas Neue"'),
      document.fonts.load('60px Pacifico'),
      document.fonts.ready
    ]).catch(function () { /* fall back to system fonts */ });
  }

  function loadSamples() {
    var images = new Map();
    var loads = VT.SAMPLE_PHOTOS.map(function (p) {
      return loadImage(p.src).then(function (img) { images.set(p.id, img); });
    });
    return Promise.all(loads).then(function () { return images; });
  }

  function renderCoverShot() {
    var w = parseInt(params.get('w') || '1280', 10);
    var h = parseInt(params.get('h') || '720', 10);
    if (!(w > 0) || !(h > 0)) { w = 1280; h = 720; }
    var state = VT.defaultState();
    if (params.get('layout')) state.layout = params.get('layout');
    if (params.get('grade')) state.grade = params.get('grade');
    // &photo swaps the hero panel's photo (boulevard by default). The other
    // panels keep their defaults, so a pier hero is a deliberate choice.
    var heroPhoto = params.get('photo');
    if (heroPhoto && state.panels[0]) state.panels[0].photo = heroPhoto;

    // Hide every bit of editor chrome: the shot is the cover alone.
    var header = document.querySelector('header');
    if (header) header.style.display = 'none';
    var studio = document.getElementById('studio');
    if (studio) studio.style.display = 'none';
    document.body.classList.add('shot-cover');
    document.body.style.margin = '0';
    document.body.style.background = '#000000';

    var canvas = document.createElement('canvas');
    canvas.id = 'shotCanvas';
    canvas.width = w;
    canvas.height = h;
    canvas.style.display = 'block';
    canvas.style.margin = '0';
    canvas.style.padding = '0';
    document.body.appendChild(canvas);

    return Promise.all([waitFonts(), loadSamples()]).then(function (results) {
      var images = results[1];
      VT.drawCover(canvas, state, images);
      document.title = 'VICE TIDE cover ' + w + 'x' + h;
      window.__shotDone = true;
    }).catch(function (err) {
      document.title = 'shot failed: ' + err.message;
      window.__shotDone = true;
    });
  }

  function renderEditorShot() {
    // The editor initialises itself in main.js with the defaults this shot
    // wants (hero7, Vice Sunset, boulevard loaded). All this mode does is
    // wait for that first preview paint, then flag the shot done.
    var waited = 0;
    var timer = setInterval(function () {
      waited += 100;
      if ((window.ViceTideEditor && window.ViceTideEditor.isPreviewDrawn()) || waited > 20000) {
        clearInterval(timer);
        window.__shotDone = true;
      }
    }, 100);
  }

  function init() {
    if (SHOT === 'cover') renderCoverShot();
    else if (SHOT === 'editor') renderEditorShot();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
