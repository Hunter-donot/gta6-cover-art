// VICE TIDE Cover Studio — editor wiring.
//
// Owns the three-column editor: photo library (left), live preview (centre)
// and controls (right). All cover painting goes through ViceTide.drawCover;
// this file only owns state, inputs and the preview canvas.
//
// In shot mode (?shot=cover) this file stands aside completely — shots.js
// draws the cover on its own canvas. In ?shot=editor mode the editor runs
// normally and flags window.__shotDone after its first preview paint.

(function () {
  'use strict';

  var VT = window.ViceTide;
  var params = new URLSearchParams(location.search);
  var SHOT = params.get('shot');

  if (SHOT === 'cover') return; // shots.js owns this page.

  var state = VT.defaultState();
  var images = new Map();
  var uploads = []; // { key, name, src }
  var uploadCount = 0;
  var selectedPanel = 0;
  var exportSize = VT.EXPORT_SIZES[0];
  var fontsReady = null;
  var previewDrawn = false;

  function $(id) { return document.getElementById(id); }

  function loadImage(src) {
    return new Promise(function (resolve, reject) {
      var im = new Image();
      im.onload = function () { resolve(im); };
      im.onerror = function () { reject(new Error('could not load ' + src)); };
      im.src = src;
    });
  }

  function waitFonts() {
    if (!fontsReady) {
      fontsReady = Promise.all([
        document.fonts.load('90px Anton'),
        document.fonts.load('90px "Bebas Neue"'),
        document.fonts.load('60px Pacifico'),
        document.fonts.ready
      ]).catch(function () { /* fall back to system fonts */ });
    }
    return fontsReady;
  }

  // ------------------------------------------------------------ preview paint
  function drawPreview() {
    var canvas = $('previewCanvas');
    if (!canvas) return Promise.resolve();
    canvas.width = exportSize.w;
    canvas.height = exportSize.h;
    return waitFonts().then(function () {
      VT.drawCover(canvas, state, images);
      // Gold outline around the selected panel so the user sees what the
      // right-hand panel editor is about to change.
      var ctx = canvas.getContext('2d');
      var collageH = VT.coverGeometry(canvas.height).collageH;
      var gutter = Math.max(4, Math.round(canvas.width * 0.008));
      var rects = VT.layoutCells(state.layout, canvas.width, collageH, gutter);
      var r = rects[selectedPanel] || rects[0];
      if (r) {
        ctx.save();
        ctx.strokeStyle = '#ffd166';
        ctx.lineWidth = Math.max(3, Math.round(canvas.width * 0.004));
        ctx.setLineDash([Math.round(canvas.width * 0.02), Math.round(canvas.width * 0.012)]);
        ctx.strokeRect(r.x + 2, r.y + 2, r.w - 4, r.h - 4);
        ctx.restore();
      }
      previewDrawn = true;
      if (SHOT === 'editor') window.__shotDone = true;
      setStatus('Preview: ' + exportSize.label + ' · ' + VT.layoutById(state.layout).name + ' · ' + VT.gradeById(state.grade).name);
    });
  }

  function redraw() {
    drawPreview().catch(function (err) {
      setStatus('Preview failed: ' + err.message);
    });
  }

  function setStatus(text) {
    var el = $('statusLine');
    if (el) el.textContent = text;
  }

  // ------------------------------------------------------------ photo library
  function allPhotos() {
    var list = [];
    for (var i = 0; i < VT.SAMPLE_PHOTOS.length; i++) {
      list.push({ key: VT.SAMPLE_PHOTOS[i].id, name: VT.SAMPLE_PHOTOS[i].name, src: VT.SAMPLE_PHOTOS[i].src });
    }
    for (var j = 0; j < uploads.length; j++) list.push(uploads[j]);
    return list;
  }

  function renderPhotoLibrary() {
    var list = $('photoList');
    if (!list) return;
    list.innerHTML = '';
    var photos = allPhotos();
    for (var i = 0; i < photos.length; i++) {
      (function (photo) {
        var item = document.createElement('button');
        item.type = 'button';
        item.className = 'photo-item';
        var thumb = document.createElement('img');
        thumb.src = photo.src;
        thumb.alt = photo.name;
        var label = document.createElement('span');
        label.textContent = photo.name;
        item.appendChild(thumb);
        item.appendChild(label);
        item.addEventListener('click', function () {
          assignPhotoToSelected(photo.key);
        });
        list.appendChild(item);
      })(photos[i]);
    }
  }

  function assignPhotoToSelected(key) {
    var panel = state.panels[selectedPanel];
    if (!panel) return;
    panel.photo = key;
    var sample = VT.sampleById(key);
    if (sample) panel.focusY = sample.focusY;
    renderPanelEditor();
    redraw();
  }

  // ------------------------------------------------------------ panel editor
  function panelName(index) {
    var layout = VT.layoutById(state.layout);
    if (index === 0 && (state.layout === 'hero7' || state.layout === 'hero5')) return 'Hero';
    return 'Panel ' + (index + 1) + ' of ' + layout.cells.length;
  }

  function renderPanelEditor() {
    var layout = VT.layoutById(state.layout);
    var count = layout.cells.length;
    if (selectedPanel >= count) selectedPanel = 0;
    var panel = state.panels[selectedPanel];
    var title = $('panelTitle');
    if (title) title.textContent = panelName(selectedPanel) + ' — ' + (panel.place || '');
    var photoRow = $('panelPhotoRow');
    if (photoRow) {
      photoRow.innerHTML = '';
      var photos = allPhotos();
      for (var i = 0; i < photos.length; i++) {
        (function (photo) {
          var b = document.createElement('button');
          b.type = 'button';
          b.className = 'mini-btn' + (panel.photo === photo.key ? ' active' : '');
          b.textContent = photo.name.split(' — ')[0];
          b.addEventListener('click', function () { assignPhotoToSelected(photo.key); });
          photoRow.appendChild(b);
        })(photos[i]);
      }
    }
    var focus = $('focusRange');
    if (focus) {
      focus.value = String(panel.focusY == null ? 0.3 : panel.focusY);
      var fv = $('focusVal');
      if (fv) fv.textContent = Math.round((panel.focusY || 0) * 100) + '% from top';
    }
    var place = $('placeInput'); if (place) place.value = panel.place || '';
    var time = $('timeInput'); if (time) time.value = panel.time || '';
    var tag = $('tagInput'); if (tag) tag.value = panel.tag || '';
  }

  // ------------------------------------------------------------ control lists
  function renderLayoutButtons() {
    var row = $('layoutRow');
    if (!row) return;
    row.innerHTML = '';
    for (var i = 0; i < VT.LAYOUTS.length; i++) {
      (function (layout) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'pick-btn' + (state.layout === layout.id ? ' active' : '');
        b.innerHTML = '';
        var name = document.createElement('strong');
        name.textContent = layout.name;
        var blurb = document.createElement('span');
        blurb.textContent = layout.blurb;
        b.appendChild(name);
        b.appendChild(blurb);
        b.addEventListener('click', function () {
          state.layout = layout.id;
          selectedPanel = 0;
          renderLayoutButtons();
          renderPanelEditor();
          redraw();
        });
        row.appendChild(b);
      })(VT.LAYOUTS[i]);
    }
  }

  function renderGradeButtons() {
    var row = $('gradeRow');
    if (!row) return;
    row.innerHTML = '';
    for (var i = 0; i < VT.GRADES.length; i++) {
      (function (grade) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'pick-btn' + (state.grade === grade.id ? ' active' : '');
        var name = document.createElement('strong');
        name.textContent = grade.name;
        var blurb = document.createElement('span');
        blurb.textContent = grade.desc;
        b.appendChild(name);
        b.appendChild(blurb);
        b.addEventListener('click', function () {
          state.grade = grade.id;
          renderGradeButtons();
          redraw();
        });
        row.appendChild(b);
      })(VT.GRADES[i]);
    }
  }

  function renderSizeButtons() {
    var row = $('sizeRow');
    if (!row) return;
    row.innerHTML = '';
    for (var i = 0; i < VT.EXPORT_SIZES.length; i++) {
      (function (size) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'mini-btn' + (exportSize.id === size.id ? ' active' : '');
        b.textContent = size.label;
        b.addEventListener('click', function () {
          exportSize = size;
          renderSizeButtons();
          redraw();
        });
        row.appendChild(b);
      })(VT.EXPORT_SIZES[i]);
    }
  }

  // ------------------------------------------------------------------- export
  function exportPNG() {
    var canvas = VT.renderCover(exportSize.w, exportSize.h, state, images);
    canvas.toBlob(function (blob) {
      if (!blob) {
        setStatus('Export failed — the browser refused the PNG.');
        return;
      }
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'vice-tide-' + exportSize.w + 'x' + exportSize.h + '.png';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 5000);
      setStatus('Exported vice-tide-' + exportSize.w + 'x' + exportSize.h + '.png');
    }, 'image/png');
  }

  // --------------------------------------------------------------------- init
  function bindInputs() {
    var title = $('titleInput');
    if (title) title.addEventListener('input', function () { state.title = title.value; redraw(); });
    var script = $('scriptInput');
    if (script) script.addEventListener('input', function () { state.script = script.value; redraw(); });
    var quote = $('quoteInput');
    if (quote) quote.addEventListener('input', function () { state.quote = quote.value; redraw(); });
    var tagline = $('taglineInput');
    if (tagline) tagline.addEventListener('input', function () { state.tagline = tagline.value; redraw(); });
    var strength = $('strengthRange');
    if (strength) {
      strength.addEventListener('input', function () {
        state.gradeStrength = parseFloat(strength.value);
        var sv = $('strengthVal');
        if (sv) sv.textContent = Math.round(state.gradeStrength * 100) + '%';
        redraw();
      });
    }
    var focus = $('focusRange');
    if (focus) {
      focus.addEventListener('input', function () {
        var panel = state.panels[selectedPanel];
        if (panel) panel.focusY = parseFloat(focus.value);
        var fv = $('focusVal');
        if (fv) fv.textContent = Math.round(parseFloat(focus.value) * 100) + '% from top';
        redraw();
      });
    }
    var place = $('placeInput');
    if (place) place.addEventListener('input', function () {
      var panel = state.panels[selectedPanel];
      if (panel) panel.place = place.value.toUpperCase();
      redraw();
    });
    var time = $('timeInput');
    if (time) time.addEventListener('input', function () {
      var panel = state.panels[selectedPanel];
      if (panel) panel.time = time.value;
      redraw();
    });
    var tag = $('tagInput');
    if (tag) tag.addEventListener('input', function () {
      var panel = state.panels[selectedPanel];
      if (panel) panel.tag = tag.value.toUpperCase();
      redraw();
    });
    var exportBtn = $('exportBtn');
    if (exportBtn) exportBtn.addEventListener('click', exportPNG);
    var uploadBtn = $('uploadBtn');
    var uploadInput = $('uploadInput');
    if (uploadBtn && uploadInput) {
      uploadBtn.addEventListener('click', function () { uploadInput.click(); });
      uploadInput.addEventListener('change', function () {
        var file = uploadInput.files && uploadInput.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function () {
          var key = 'upload:' + (++uploadCount);
          loadImage(String(reader.result)).then(function (img) {
            images.set(key, img);
            uploads.push({ key: key, name: file.name, src: String(reader.result) });
            renderPhotoLibrary();
            assignPhotoToSelected(key);
            setStatus('Loaded ' + file.name + ' into ' + panelName(selectedPanel) + '.');
          }).catch(function () {
            setStatus('Could not read ' + file.name + ' as a photo.');
          });
        };
        reader.readAsDataURL(file);
        uploadInput.value = '';
      });
    }
    var canvas = $('previewCanvas');
    if (canvas) {
      canvas.addEventListener('click', function (ev) {
        var rect = canvas.getBoundingClientRect();
        var px = (ev.clientX - rect.left) * (canvas.width / rect.width);
        var py = (ev.clientY - rect.top) * (canvas.height / rect.height);
        var hit = VT.panelAt(state, canvas.width, canvas.height, px, py);
        if (hit >= 0) {
          selectedPanel = hit;
          renderPanelEditor();
          redraw();
        }
      });
    }
  }

  function init() {
    var title = $('titleInput'); if (title) title.value = state.title;
    var script = $('scriptInput'); if (script) script.value = state.script;
    var quote = $('quoteInput'); if (quote) quote.value = state.quote;
    var tagline = $('taglineInput'); if (tagline) tagline.value = state.tagline;
    var strength = $('strengthRange');
    if (strength) strength.value = String(state.gradeStrength);
    renderLayoutButtons();
    renderGradeButtons();
    renderSizeButtons();
    renderPanelEditor();
    bindInputs();
    // Load the bundled samples, then paint the first preview.
    var loads = VT.SAMPLE_PHOTOS.map(function (p) {
      return loadImage(p.src).then(function (img) { images.set(p.id, img); });
    });
    Promise.all(loads).then(function () {
      renderPhotoLibrary();
      redraw();
    }).catch(function () {
      renderPhotoLibrary();
      redraw();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Small handle for shots.js and for debugging from the console.
  window.ViceTideEditor = {
    getState: function () { return state; },
    getImages: function () { return images; },
    redraw: redraw,
    exportPNG: exportPNG,
    isPreviewDrawn: function () { return previewDrawn; }
  };
})();
