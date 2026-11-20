'use strict';
/* VICE TIDE Cover Studio — editor.
   Wires the 3-column editor: photo picker (left), live preview (centre), controls
   (right). Plain classic script; uses window.VICE from cover.js. */

(function () {
  var EXPORT_SIZES = [
    { id: '1080x1080', label: '1080 \u00d7 1080 (square)', w: 1080, h: 1080 },
    { id: '1080x1350', label: '1080 \u00d7 1350 (portrait)', w: 1080, h: 1350 },
    { id: '1920x1080', label: '1920 \u00d7 1080 (landscape)', w: 1920, h: 1080 },
  ];

  var state = window.VICE.defaultState();
  var images = {};
  var exportSize = EXPORT_SIZES[2];
  var uploadCount = 0;

  function $(id) { return document.getElementById(id); }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function render() {
    var canvas = $('preview');
    if (!canvas) return;
    canvas.width = exportSize.w;
    canvas.height = exportSize.h;
    window.VICE.drawCover(canvas, state, images);
    var info = $('previewInfo');
    if (info) info.textContent = exportSize.label + '  \u2022  ' + state.layout + '  \u2022  ' + (window.VICE.GRADES[state.grade] || {}).name;
  }

  function buildPhotoList() {
    var list = $('photoList');
    if (!list) return;
    list.innerHTML = '';
    var seen = {};
    window.VICE.PHOTOS.forEach(function (p) {
      if (seen[p.src]) return;
      seen[p.src] = true;
      var item = el('button', 'photo-item', '');
      item.type = 'button';
      var img = document.createElement('img');
      img.src = p.src;
      img.alt = p.place;
      item.appendChild(img);
      item.appendChild(el('span', 'photo-name', p.place));
      item.addEventListener('click', function () {
        state.panels[0].photo = p.id;
        render();
        markActive(list, item);
      });
      list.appendChild(item);
    });
    var upload = el('label', 'photo-item photo-upload', '+ Upload a photo');
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.hidden = true;
    input.addEventListener('change', function () {
      var file = input.files && input.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        var img = new Image();
        img.onload = function () {
          uploadCount++;
          var id = 'upload' + uploadCount;
          images[id] = img;
          state.panels[0].photo = id;
          var item = el('button', 'photo-item', '');
          item.type = 'button';
          var thumb = document.createElement('img');
          thumb.src = reader.result;
          thumb.alt = 'Your photo';
          item.appendChild(thumb);
          item.appendChild(el('span', 'photo-name', 'Your photo'));
          item.addEventListener('click', function () {
            state.panels[0].photo = id;
            render();
            markActive(list, item);
          });
          list.appendChild(item);
          render();
          markActive(list, item);
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
    upload.appendChild(input);
    list.appendChild(upload);
  }

  function markActive(list, item) {
    var items = list.querySelectorAll('.photo-item');
    for (var i = 0; i < items.length; i++) items[i].classList.remove('active');
    item.classList.add('active');
  }

  function buildOptionList(containerId, entries, current, onPick) {
    var box = $(containerId);
    if (!box) return;
    box.innerHTML = '';
    Object.keys(entries).forEach(function (key) {
      var b = el('button', 'opt' + (key === current ? ' active' : ''), entries[key].name);
      b.type = 'button';
      b.addEventListener('click', function () {
        onPick(key);
        var btns = box.querySelectorAll('.opt');
        for (var i = 0; i < btns.length; i++) btns[i].classList.remove('active');
        b.classList.add('active');
        render();
      });
      box.appendChild(b);
    });
  }

  function buildExportSizes() {
    var box = $('exportSizes');
    if (!box) return;
    box.innerHTML = '';
    EXPORT_SIZES.forEach(function (s) {
      var b = el('button', 'opt' + (s.id === exportSize.id ? ' active' : ''), s.label);
      b.type = 'button';
      b.addEventListener('click', function () {
        exportSize = s;
        var btns = box.querySelectorAll('.opt');
        for (var i = 0; i < btns.length; i++) btns[i].classList.remove('active');
        b.classList.add('active');
        render();
      });
      box.appendChild(b);
    });
  }

  function bindText(id, key) {
    var input = $(id);
    if (!input) return;
    input.value = state[key];
    input.addEventListener('input', function () {
      state[key] = input.value;
      render();
    });
  }

  function bindStrength() {
    var slider = $('strength');
    var label = $('strengthVal');
    if (!slider) return;
    slider.value = String(Math.round(state.strength * 100));
    if (label) label.textContent = Math.round(state.strength * 100) + '%';
    slider.addEventListener('input', function () {
      state.strength = parseInt(slider.value, 10) / 100;
      if (label) label.textContent = slider.value + '%';
      render();
    });
  }

  function bindExport() {
    var btn = $('exportBtn');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var off = document.createElement('canvas');
      off.width = exportSize.w;
      off.height = exportSize.h;
      window.VICE.drawCover(off, state, images);
      off.toBlob(function (blob) {
        if (!blob) return;
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'vice-tide-' + exportSize.id + '.png';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 5000);
      }, 'image/png');
    });
  }

  function applyShotConfig() {
    var cfg = window.__shotConfig;
    if (!cfg) return;
    if (cfg.layout && window.VICE.LAYOUTS[cfg.layout]) {
      state.layout = cfg.layout;
      state.panels = window.VICE.defaultPanels(cfg.layout);
    }
    if (cfg.grade && window.VICE.GRADES[cfg.grade]) state.grade = cfg.grade;
    if (cfg.photo && state.panels.length > 0) state.panels[0].photo = cfg.photo;
    state.strength = 1.0;
  }

  function init() {
    if (window.__shotCoverOnly) return; /* shot=cover renders its own canvas */
    applyShotConfig();
    buildPhotoList();
    buildOptionList('layoutList', window.VICE.LAYOUTS, state.layout, function (key) {
      state.layout = key;
      state.panels = window.VICE.defaultPanels(key);
    });
    buildOptionList('gradeList', window.VICE.GRADES, state.grade, function (key) {
      state.grade = key;
    });
    buildExportSizes();
    bindText('titleInput', 'title');
    bindText('scriptInput', 'script');
    bindText('quoteInput', 'quote');
    bindText('taglineInput', 'tagline');
    bindStrength();
    bindExport();
    window.VICE.ensureFonts()
      .then(function () { return window.VICE.loadPhotos(); })
      .then(function (loaded) {
        images = loaded;
        render();
        window.__shotReady = true;
        document.title = 'shot-ready';
      })
      .catch(function () {
        render();
        window.__shotReady = true;
        document.title = 'shot-ready';
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
