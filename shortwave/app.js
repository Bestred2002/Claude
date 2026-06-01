'use strict';

(function () {
  var RECEIVERS = window.RECEIVERS || [];
  var BANDS = window.BANDS || [];
  var DIRECTORIES = window.DIRECTORIES || [];
  var STORAGE_KEY = 'oc.activeRx';

  // Ricevitore attivo (default: il primo "stable", altrimenti il primo).
  function defaultRxId() {
    for (var i = 0; i < RECEIVERS.length; i++) {
      if (RECEIVERS[i].stable) return RECEIVERS[i].id;
    }
    return RECEIVERS.length ? RECEIVERS[0].id : null;
  }
  var activeId = localStorage.getItem(STORAGE_KEY) || defaultRxId();
  if (!RECEIVERS.some(function (r) { return r.id === activeId; })) {
    activeId = defaultRxId();
  }

  function getActive() {
    return RECEIVERS.filter(function (r) { return r.id === activeId; })[0] || RECEIVERS[0];
  }

  function setActive(id) {
    activeId = id;
    try { localStorage.setItem(STORAGE_KEY, id); } catch (e) {}
    renderChips();
    renderBands();
    renderList();
  }

  // Costruisce il deep-link di sintonia in base al tipo di ricevitore.
  function tuneUrl(rx, freqKHz, mode) {
    var base = (rx.url || '').replace(/\/+$/, '');
    if (rx.type === 'kiwi') {
      // KiwiSDR: ?f=<freqKHz><modo>  es. ?f=7100lsb
      return base + '/?f=' + freqKHz + mode;
    }
    // WebSDR: ?tune=<freqKHz><modo>  es. ?tune=7100lsb
    return base + '/?tune=' + freqKHz + mode;
  }

  function openExternal(url) {
    // Nuova scheda: massima compatibilità su iOS/Safari.
    var w = window.open(url, '_blank', 'noopener');
    if (!w) { location.href = url; } // fallback se il popup è bloccato
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function fmtFreq(khz) {
    return (khz / 1000).toFixed(khz % 1000 === 0 ? 3 : 3) + ' MHz';
  }

  // --- Chips ricevitore ---
  function renderChips() {
    var box = document.getElementById('rxChips');
    box.innerHTML = '';
    RECEIVERS.forEach(function (rx) {
      var chip = el('button', 'chip' + (rx.id === activeId ? ' active' : ''));
      chip.appendChild(el('span', 'chip-name', rx.name.split('—')[0].trim()));
      var meta = rx.city + (rx.type === 'websdr' ? ' · WebSDR' : ' · KiwiSDR');
      chip.appendChild(el('span', 'chip-meta', meta));
      chip.addEventListener('click', function () { setActive(rx.id); });
      box.appendChild(chip);
    });
  }

  // --- Sintonia rapida ---
  function renderBands() {
    var box = document.getElementById('bands');
    box.innerHTML = '';
    var rx = getActive();

    var active = el('p', 'active-rx');
    active.innerHTML = 'Ricevitore attivo: <strong>' + rx.name + '</strong> (' + rx.city + ')';
    box.appendChild(active);

    BANDS.forEach(function (grp) {
      var g = el('div', 'band-group');
      g.appendChild(el('h3', null, grp.group));
      if (grp.hint) g.appendChild(el('p', 'band-hint', grp.hint));
      var grid = el('div', 'band-grid');
      grp.items.forEach(function (b) {
        var btn = el('button', 'band-btn');
        btn.appendChild(el('span', 'band-label', b.label));
        btn.appendChild(el('span', 'band-freq', fmtFreq(b.freq) + ' · ' + b.mode.toUpperCase()));
        if (b.desc) btn.appendChild(el('span', 'band-desc', b.desc));
        btn.addEventListener('click', function () {
          openExternal(tuneUrl(rx, b.freq, b.mode));
        });
        grid.appendChild(btn);
      });
      g.appendChild(grid);
      box.appendChild(g);
    });
  }

  // --- Elenco ricevitori ---
  function renderList() {
    var box = document.getElementById('rxList');
    box.innerHTML = '';
    RECEIVERS.forEach(function (rx) {
      var card = el('div', 'rx-card' + (rx.id === activeId ? ' current' : ''));

      var head = el('div', 'rx-head');
      head.appendChild(el('span', 'rx-title', rx.name));
      var badge = el('span', 'rx-badge ' + (rx.type === 'websdr' ? 'websdr' : 'kiwi'),
        rx.type === 'websdr' ? 'WebSDR' : 'KiwiSDR');
      head.appendChild(badge);
      card.appendChild(head);

      var loc = el('p', 'rx-loc');
      loc.textContent = '📍 ' + rx.city + (rx.region ? ' (' + rx.region + ')' : '') + ' · ' + rx.coverage;
      card.appendChild(loc);

      if (rx.notes) card.appendChild(el('p', 'rx-notes', rx.notes));

      var actions = el('div', 'rx-actions');
      var openBtn = el('button', 'btn btn-amber', 'Apri ricevitore');
      openBtn.addEventListener('click', function () { openExternal(rx.url); });
      actions.appendChild(openBtn);

      if (rx.id !== activeId) {
        var selBtn = el('button', 'btn btn-ghost', 'Usa per sintonia');
        selBtn.addEventListener('click', function () { setActive(rx.id); });
        actions.appendChild(selBtn);
      } else {
        actions.appendChild(el('span', 'rx-current-tag', '★ attivo per la sintonia'));
      }
      card.appendChild(actions);
      box.appendChild(card);
    });
  }

  // --- Directory ---
  function renderDirectories() {
    var box = document.getElementById('dirList');
    box.innerHTML = '';
    DIRECTORIES.forEach(function (d) {
      var a = el('a', 'dir-item');
      a.href = d.url;
      a.target = '_blank';
      a.rel = 'noopener';
      a.appendChild(el('span', 'dir-name', d.name));
      a.appendChild(el('span', 'dir-desc', d.desc));
      box.appendChild(a);
    });
  }

  // Init
  renderChips();
  renderBands();
  renderList();
  renderDirectories();

  // Service worker (offline app-shell)
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    });
  }
})();
