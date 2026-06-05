'use strict';

(function () {
  var RECEIVERS = window.RECEIVERS || [];
  var BANDS = window.BANDS || [];
  var DIRECTORIES = window.DIRECTORIES || [];

  // Mostra solo alcune categorie, se richiesto (window.SHOW_ONLY = id o array di id)
  if (window.SHOW_ONLY) {
    var onlyArr = Array.isArray(window.SHOW_ONLY) ? window.SHOW_ONLY : [window.SHOW_ONLY];
    var filtered = BANDS.filter(function (b) { return onlyArr.indexOf(b.id) >= 0; });
    if (filtered.length) BANDS = filtered;
  }

  var hfReceivers = RECEIVERS.filter(function (r) { return r.caps.indexOf('hf') >= 0; });
  var vhfReceiver = RECEIVERS.filter(function (r) { return r.caps.indexOf('vhf') >= 0; })[0] || null;

  // Stato
  var activeCat = localStorage.getItem('oc.cat') || 'hams';
  if (!BANDS.some(function (b) { return b.id === activeCat; })) activeCat = BANDS[0].id;

  var hfId = localStorage.getItem('oc.hf');
  if (!hfReceivers.some(function (r) { return r.id === hfId; })) {
    var stable = hfReceivers.filter(function (r) { return r.stable; })[0];
    hfId = (stable || hfReceivers[0]).id;
  }
  var panelOpen = false;

  function activeHf() { return hfReceivers.filter(function (r) { return r.id === hfId; })[0]; }
  function activeCategory() { return BANDS.filter(function (b) { return b.id === activeCat; })[0]; }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  // Deep-link di sintonia in base al tipo di ricevitore. freq in kHz.
  function tuneUrl(rx, freqKHz, mode) {
    var base = (rx.url || '').replace(/\/+$/, '');
    if (rx.type === 'kiwi')      return base + '/?f=' + freqKHz + mode;
    if (rx.type === 'openwebrx') {
      var m = mode === 'fm' ? 'nfm' : (mode === 'fmw' ? 'wfm' : mode); // FM->nfm, FMW->wfm
      return base + '/#freq=' + (freqKHz * 1000) + ',mod=' + m;
    }
    return base + '/?tune=' + freqKHz + mode;          // websdr
  }

  function open(url) {
    var w = window.open(url, '_blank', 'noopener');
    if (!w) location.href = url;
  }

  function fmtFreq(khz) {
    if (khz < 1000) return khz + ' kHz';
    return (khz / 1000).toFixed(3).replace(/0+$/, '').replace(/\.$/, '') + ' MHz';
  }

  // Ricevitore usato dalla categoria attiva
  function receiverFor(cat) {
    return cat.rxBand === 'high' ? (vhfReceiver || activeHf()) : activeHf();
  }

  // --- Categorie ---
  function renderCats() {
    var box = document.getElementById('cats');
    box.innerHTML = '';
    box.style.display = BANDS.length <= 1 ? 'none' : '';   // nascondi se una sola scheda
    BANDS.forEach(function (c) {
      var b = el('button', 'cat' + (c.id === activeCat ? ' on' : ''));
      b.appendChild(el('span', 'cat-ico', c.icon));
      b.appendChild(el('span', 'cat-lbl', c.label));
      b.addEventListener('click', function () {
        activeCat = c.id;
        try { localStorage.setItem('oc.cat', c.id); } catch (e) {}
        renderAll();
      });
      box.appendChild(b);
    });
  }

  // --- Bande (pulsanti) ---
  function renderBands() {
    var cat = activeCategory();
    document.getElementById('catSub').textContent = cat.sub;
    var box = document.getElementById('bands');
    box.innerHTML = '';
    var rx = receiverFor(cat);
    cat.items.forEach(function (it) {
      if (it.divider) { box.appendChild(el('div', 'band-divider', it.divider)); return; }
      var btn = el('button', 'band');
      btn.appendChild(el('span', 'band-name', it.name));
      btn.appendChild(el('span', 'band-freq', fmtFreq(it.freq) + ' · ' + it.mode.toUpperCase()));
      if (it.hint) btn.appendChild(el('span', 'band-hint', it.hint));
      btn.addEventListener('click', function () {
        if (!rx) return;
        open(tuneUrl(rx, it.freq, it.mode));
      });
      box.appendChild(btn);
    });
  }

  // --- Barra ricevitore ---
  function renderRxBar() {
    var cat = activeCategory();
    var bar = document.getElementById('rxBar');
    bar.innerHTML = '';

    if (cat.rxBand === 'high') {
      // VHF/UHF: ricevitore fisso (wideband) + scorciatoia per trovarne altri
      var info = el('div', 'rx-fixed');
      var left = el('span', 'rx-fixed-main');
      left.appendChild(el('span', 'rx-fixed-lbl', 'Ricevitore VHF/UHF'));
      var name = el('span', 'rx-fixed-name', vhfReceiver ? vhfReceiver.name : '—');
      if (vhfReceiver && vhfReceiver.unverified) name.appendChild(el('span', 'tag', 'da verificare'));
      left.appendChild(name);
      info.appendChild(left);
      if (DIRECTORIES[0]) {
        var find = el('a', 'rx-find', 'Altri ›');
        find.href = DIRECTORIES[0].url; find.target = '_blank'; find.rel = 'noopener';
        info.appendChild(find);
      }
      bar.appendChild(info);
      document.getElementById('rxPanel').classList.add('hidden');
      panelOpen = false;
      return;
    }

    var rx = activeHf();
    var toggle = el('button', 'rx-toggle');
    toggle.appendChild(el('span', 'rx-toggle-lbl', 'Ricevitore'));
    var val = el('span', 'rx-toggle-val', rx.name);
    val.appendChild(el('span', 'chev', panelOpen ? '▴' : '▾'));
    toggle.appendChild(val);
    toggle.addEventListener('click', function () {
      panelOpen = !panelOpen;
      renderRxBar();
      renderRxPanel();
    });
    bar.appendChild(toggle);
  }

  // --- Pannello scelta ricevitore HF ---
  function renderRxPanel() {
    var panel = document.getElementById('rxPanel');
    panel.innerHTML = '';
    if (!panelOpen || activeCategory().rxBand === 'high') {
      panel.classList.add('hidden');
      return;
    }
    panel.classList.remove('hidden');
    hfReceivers.forEach(function (r) {
      var row = el('button', 'rx-row' + (r.id === hfId ? ' on' : ''));
      var left = el('span', 'rx-row-main');
      var nm = el('span', 'rx-row-name', r.name);
      if (r.unverified) nm.appendChild(el('span', 'tag', 'da verificare'));
      left.appendChild(nm);
      left.appendChild(el('span', 'rx-row-loc', (r.region || r.city) + ' · ' + r.coverage));
      row.appendChild(left);
      row.appendChild(el('span', 'rx-row-check', r.id === hfId ? '✓' : ''));
      row.addEventListener('click', function () {
        hfId = r.id;
        try { localStorage.setItem('oc.hf', r.id); } catch (e) {}
        panelOpen = false;
        renderAll();
      });
      panel.appendChild(row);
    });
  }

  function renderDirs() {
    var box = document.getElementById('dirs');
    if (!box) return;
    box.innerHTML = 'Altri ricevitori: ';
    DIRECTORIES.forEach(function (d, i) {
      var a = el('a', null, d.name);
      a.href = d.url; a.target = '_blank'; a.rel = 'noopener';
      box.appendChild(a);
      if (i < DIRECTORIES.length - 1) box.appendChild(document.createTextNode(' · '));
    });
  }

  function renderAll() {
    renderCats();
    renderBands();
    renderRxBar();
    renderRxPanel();
  }

  renderAll();
  renderDirs();

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    });
  }
})();
