/**
 * app.js — mappa "Trova lead" di Alchemyx.
 *
 * Disegna un'area sulla mappa, scegli una categoria e interroga Overpass API
 * DIRETTAMENTE dal browser (Overpass supporta CORS). I risultati con sito web
 * diventano marker + righe in tabella; i domini si scaricano come domains.txt
 * da salvare in discovery/output/.
 *
 * La logica Overpass (query QL + estrazione dominio) rispecchia
 * ../src/overpass.js e ../src/normalize.js — tenerle allineate a mano.
 */
/* global L */
(() => {
  'use strict';

  // ------------------------------------------------------------------
  // Costanti condivise con il motore Node (copie inline: la pagina può
  // girare anche da file:// senza moduli).
  // ------------------------------------------------------------------
  const OVERPASS_ENDPOINTS = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
  ];
  // Soglie di area (in gradi²): oltre WARN avvisa, oltre HARD chiede conferma.
  const AREA_WARN_DEG2 = 0.05;  // ~ 25 km × 18 km
  const AREA_HARD_DEG2 = 0.5;   // aree enormi: Overpass quasi certamente in timeout

  // Mini junk-list (copia ridotta di normalize.js): domini social/piattaforma.
  const JUNK = new Set([
    'facebook.com', 'fb.com', 'fb.me', 'm.facebook.com', 'instagram.com',
    'whatsapp.com', 'wa.me', 'google.com', 'google.it', 'goo.gl', 'g.page',
    'youtube.com', 'youtu.be', 'linkedin.com', 'tiktok.com', 'twitter.com',
    'x.com', 't.co', 'pinterest.com', 'booking.com', 'tripadvisor.it',
    'tripadvisor.com', 'paginegialle.it', 'subito.it', 'linktr.ee', 'bit.ly',
    'amazon.it', 'amazon.com', 'wixsite.com', 'sites.google.com', 'blogspot.com',
    'wordpress.com', 't.me', 'telegram.me',
  ]);

  // Suffissi a due etichette per il "dominio registrabile" (come normalize.js).
  const SECOND_LEVEL_SUFFIXES = new Set([
    'co.uk', 'org.uk', 'com.br', 'com.ar', 'com.mx', 'com.au', 'com.es',
    'co.jp', 'co.in', 'co.nz', 'co.za', 'edu.it', 'gov.it',
  ]);
  const DOMAIN_RE = /([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}/i;

  /** Riduce un hostname al dominio registrabile (best effort). */
  function registrable(hostname) {
    const labels = hostname.split('.').filter(Boolean);
    if (labels.length <= 2) return labels.join('.');
    const lastTwo = labels.slice(-2).join('.');
    if (SECOND_LEVEL_SUFFIXES.has(lastTwo)) return labels.slice(-3).join('.');
    return lastTwo;
  }

  /** Estrae il dominio registrabile da URL/stringa (mini-copia di normalize.js). */
  function extractDomain(str) {
    if (typeof str !== 'string') return null;
    let s = str.trim();
    if (!s) return null;
    let hostname = null;
    const urlish = s.match(/https?:\/\/[^\s"'<>)\]]+/i);
    if (urlish) {
      try { hostname = new URL(urlish[0]).hostname; } catch { /* ignora */ }
    }
    if (!hostname) {
      const m = s.match(DOMAIN_RE);
      if (!m) return null;
      hostname = m[0];
    }
    hostname = hostname.toLowerCase().replace(/\.+$/, '');
    if (hostname.startsWith('www.')) hostname = hostname.slice(4);
    if (!DOMAIN_RE.test(hostname)) return null;
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) return null;
    return registrable(hostname) || null;
  }

  /**
   * Costruisce la query Overpass QL per un bbox (specchio di
   * buildOverpassQuery in ../src/overpass.js, solo variante bbox).
   */
  function buildOverpassQuery(filters, bbox, timeout = 60) {
    const [s, w, n, e] = bbox;
    const clause = `(${s},${w},${n},${e})`;
    const esc = (v) => String(v).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    const lines = filters.map((f) =>
      f.length >= 2 && f[1] != null
        ? `  nwr["${esc(f[0])}"="${esc(f[1])}"]${clause};`
        : `  nwr["${esc(f[0])}"]${clause};`
    );
    return `[out:json][timeout:${timeout}];\n(\n${lines.join('\n')}\n);\nout tags center;\n`;
  }

  // ------------------------------------------------------------------
  // Categorie: fetch di ../categories.json con fallback inline (file://
  // blocca il fetch locale in molti browser).
  // ------------------------------------------------------------------
  const FALLBACK_CATEGORIES = {
    servizi: { label: 'Aziende di servizi', group: 'Gruppi principali', filters: [['office'], ['craft']] },
    retail: { label: 'Retail / negozi', group: 'Gruppi principali', filters: [['shop']] },
    ristorazione: {
      label: 'Ristorazione / ospitalità', group: 'Gruppi principali',
      filters: [['amenity', 'restaurant'], ['amenity', 'bar'], ['amenity', 'cafe'], ['amenity', 'fast_food'],
        ['amenity', 'pub'], ['amenity', 'ice_cream'], ['tourism', 'hotel'], ['tourism', 'guest_house'],
        ['tourism', 'apartment'], ['tourism', 'hostel']],
    },
    servizi_professionali: {
      label: 'Servizi professionali', group: 'Gruppi principali',
      filters: [['office', 'estate_agent'], ['office', 'lawyer'], ['office', 'accountant'], ['office', 'insurance'],
        ['office', 'financial'], ['office', 'company'], ['office', 'it'], ['office', 'architect'],
        ['office', 'engineer'], ['amenity', 'dentist'], ['healthcare']],
    },
    fitness_benessere: {
      label: 'Fitness / benessere / beauty', group: 'Gruppi principali',
      filters: [['leisure', 'fitness_centre'], ['leisure', 'sports_centre'], ['shop', 'beauty'],
        ['shop', 'hairdresser'], ['shop', 'massage'], ['amenity', 'spa']],
    },
    ristoranti: { label: 'Ristoranti', group: 'Categorie specifiche', filters: [['amenity', 'restaurant']] },
    bar_caffe: { label: 'Bar e caffè', group: 'Categorie specifiche', filters: [['amenity', 'bar'], ['amenity', 'cafe']] },
    gelaterie: { label: 'Gelaterie', group: 'Categorie specifiche', filters: [['amenity', 'ice_cream']] },
    hotel: { label: 'Hotel e strutture ricettive', group: 'Categorie specifiche', filters: [['tourism', 'hotel'], ['tourism', 'guest_house']] },
    agenzie_immobiliari: { label: 'Agenzie immobiliari', group: 'Categorie specifiche', filters: [['office', 'estate_agent']] },
    avvocati: { label: 'Studi legali / avvocati', group: 'Categorie specifiche', filters: [['office', 'lawyer']] },
    commercialisti: { label: 'Commercialisti / contabili', group: 'Categorie specifiche', filters: [['office', 'accountant']] },
    assicurazioni: { label: 'Agenzie assicurative', group: 'Categorie specifiche', filters: [['office', 'insurance']] },
    dentisti: { label: 'Dentisti / studi dentistici', group: 'Categorie specifiche', filters: [['amenity', 'dentist']] },
    palestre: { label: 'Palestre', group: 'Categorie specifiche', filters: [['leisure', 'fitness_centre']] },
    parrucchieri: { label: 'Parrucchieri', group: 'Categorie specifiche', filters: [['shop', 'hairdresser']] },
    centri_estetici: { label: 'Centri estetici', group: 'Categorie specifiche', filters: [['shop', 'beauty'], ['shop', 'massage']] },
    negozi_abbigliamento: { label: 'Negozi di abbigliamento', group: 'Categorie specifiche', filters: [['shop', 'clothes'], ['shop', 'shoes']] },
    negozi_arredamento: { label: 'Negozi di arredamento', group: 'Categorie specifiche', filters: [['shop', 'furniture'], ['shop', 'interior_decoration']] },
    ottici: { label: 'Ottici', group: 'Categorie specifiche', filters: [['shop', 'optician']] },
    elettronica: { label: 'Negozi di elettronica', group: 'Categorie specifiche', filters: [['shop', 'electronics'], ['shop', 'computer'], ['shop', 'mobile_phone']] },
    officine_auto: { label: 'Officine e carrozzerie', group: 'Categorie specifiche', filters: [['shop', 'car_repair']] },
    concessionarie: { label: 'Concessionarie auto', group: 'Categorie specifiche', filters: [['shop', 'car']] },
    fotografi: { label: 'Fotografi', group: 'Categorie specifiche', filters: [['craft', 'photographer'], ['shop', 'photo']] },
    agenzie_viaggi: { label: 'Agenzie di viaggi', group: 'Categorie specifiche', filters: [['shop', 'travel_agency']] },
  };

  let categories = FALLBACK_CATEGORIES;

  // ------------------------------------------------------------------
  // Aree rapide: comuni preimpostati (copia inline di ../aree.json, che
  // resta la fonte di verità riusabile). bbox = [sud, ovest, nord, est],
  // un rettangolo "sensato" centrato sul comune (non l'intero confine
  // amministrativo: per Overpass è meglio un'area urbana compatta).
  // ------------------------------------------------------------------
  const FALLBACK_AREAS = {
    milano: { label: 'Milano', group: 'Città chiave', lat: 45.4642, lon: 9.19, zoom: 11, bbox: [45.386, 9.04, 45.536, 9.28] },
    torino: { label: 'Torino', group: 'Città chiave', lat: 45.0703, lon: 7.6869, zoom: 12, bbox: [44.99, 7.58, 45.14, 7.77] },
    roma: { label: 'Roma', group: 'Città chiave', lat: 41.8933, lon: 12.4829, zoom: 11, bbox: [41.8, 12.4, 41.99, 12.6] },
    firenze: { label: 'Firenze', group: 'Città chiave', lat: 43.7696, lon: 11.2558, zoom: 12, bbox: [43.72, 11.15, 43.83, 11.34] },
    bergamo: { label: 'Bergamo', group: 'Lombardia', lat: 45.6983, lon: 9.6773, zoom: 13, bbox: [45.66, 9.62, 45.73, 9.72] },
    monza: { label: 'Monza', group: 'Lombardia', lat: 45.5845, lon: 9.2744, zoom: 13, bbox: [45.55, 9.23, 45.62, 9.32] },
    como: { label: 'Como', group: 'Lombardia', lat: 45.808, lon: 9.0852, zoom: 13, bbox: [45.77, 9.03, 45.84, 9.13] },
    brescia: { label: 'Brescia', group: 'Lombardia', lat: 45.5416, lon: 10.2118, zoom: 12, bbox: [45.49, 10.15, 45.6, 10.27] },
    laquila: { label: "L'Aquila", group: 'Abruzzo', lat: 42.3498, lon: 13.3995, zoom: 13, bbox: [42.3, 13.32, 42.4, 13.48] },
    pescara: { label: 'Pescara', group: 'Abruzzo', lat: 42.4618, lon: 14.2161, zoom: 13, bbox: [42.42, 14.16, 42.5, 14.27] },
    chieti: { label: 'Chieti', group: 'Abruzzo', lat: 42.3512, lon: 14.1675, zoom: 13, bbox: [42.32, 14.12, 42.39, 14.21] },
    teramo: { label: 'Teramo', group: 'Abruzzo', lat: 42.6589, lon: 13.7044, zoom: 13, bbox: [42.62, 13.65, 42.7, 13.76] },
    ancona: { label: 'Ancona', group: 'Marche', lat: 43.6158, lon: 13.5189, zoom: 13, bbox: [43.55, 13.44, 43.65, 13.58] },
    pesaro: { label: 'Pesaro', group: 'Marche', lat: 43.9102, lon: 12.9133, zoom: 13, bbox: [43.86, 12.85, 43.95, 12.97] },
    macerata: { label: 'Macerata', group: 'Marche', lat: 43.2999, lon: 13.4534, zoom: 13, bbox: [43.27, 13.4, 43.33, 13.51] },
    ascoli_piceno: { label: 'Ascoli Piceno', group: 'Marche', lat: 42.8536, lon: 13.5749, zoom: 13, bbox: [42.82, 13.52, 42.89, 13.63] },
    fermo: { label: 'Fermo', group: 'Marche', lat: 43.1607, lon: 13.7184, zoom: 13, bbox: [43.13, 13.67, 43.2, 13.77] },
    bari: { label: 'Bari', group: 'Puglia', lat: 41.1171, lon: 16.8719, zoom: 12, bbox: [41.06, 16.78, 41.16, 16.96] },
    lecce: { label: 'Lecce', group: 'Puglia', lat: 40.3516, lon: 18.1718, zoom: 13, bbox: [40.31, 18.11, 40.4, 18.23] },
    taranto: { label: 'Taranto', group: 'Puglia', lat: 40.4644, lon: 17.247, zoom: 13, bbox: [40.41, 17.18, 40.52, 17.31] },
    foggia: { label: 'Foggia', group: 'Puglia', lat: 41.4622, lon: 15.5446, zoom: 13, bbox: [41.42, 15.49, 41.5, 15.6] },
    brindisi: { label: 'Brindisi', group: 'Puglia', lat: 40.6327, lon: 17.9418, zoom: 13, bbox: [40.59, 17.88, 40.67, 18.0] },
    andria: { label: 'Andria', group: 'Puglia', lat: 41.227, lon: 16.2965, zoom: 13, bbox: [41.19, 16.25, 41.26, 16.35] },
    palermo: { label: 'Palermo', group: 'Sicilia', lat: 38.1157, lon: 13.3615, zoom: 12, bbox: [38.06, 13.26, 38.22, 13.45] },
    catania: { label: 'Catania', group: 'Sicilia', lat: 37.5079, lon: 15.083, zoom: 12, bbox: [37.44, 15.0, 37.55, 15.12] },
    messina: { label: 'Messina', group: 'Sicilia', lat: 38.1938, lon: 15.554, zoom: 12, bbox: [38.13, 15.48, 38.27, 15.6] },
    siracusa: { label: 'Siracusa', group: 'Sicilia', lat: 37.0755, lon: 15.2866, zoom: 13, bbox: [37.03, 15.22, 37.12, 15.32] },
    ragusa: { label: 'Ragusa', group: 'Sicilia', lat: 36.9264, lon: 14.7255, zoom: 13, bbox: [36.89, 14.67, 36.96, 14.78] },
    trapani: { label: 'Trapani', group: 'Sicilia', lat: 38.0176, lon: 12.5365, zoom: 13, bbox: [37.98, 12.48, 38.05, 12.59] },
    agrigento: { label: 'Agrigento', group: 'Sicilia', lat: 37.3111, lon: 13.5765, zoom: 13, bbox: [37.27, 13.52, 37.35, 13.63] },
    caltanissetta: { label: 'Caltanissetta', group: 'Sicilia', lat: 37.4901, lon: 14.0629, zoom: 13, bbox: [37.45, 14.01, 37.53, 14.11] },
    enna: { label: 'Enna', group: 'Sicilia', lat: 37.5671, lon: 14.2795, zoom: 13, bbox: [37.53, 14.23, 37.6, 14.33] },
  };

  let areas = FALLBACK_AREAS;

  /** Popola la <select> con <optgroup> per gruppo. */
  function populateCategorySelect() {
    const select = document.getElementById('category');
    select.innerHTML = '';
    const groups = new Map(); // nome gruppo -> optgroup
    for (const [key, entry] of Object.entries(categories)) {
      const groupName = entry.group || 'Altre categorie';
      if (!groups.has(groupName)) {
        const og = document.createElement('optgroup');
        og.label = groupName;
        groups.set(groupName, og);
        select.appendChild(og);
      }
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = entry.label || key;
      groups.get(groupName).appendChild(opt);
    }
  }

  async function loadCategories() {
    try {
      const res = await fetch('../categories.json');
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data === 'object' && Object.keys(data).length > 0) categories = data;
      }
    } catch {
      // file:// o server assente: si usa la copia inline.
    }
    populateCategorySelect();
  }

  /** Popola la <select> delle aree rapide con <optgroup> per regione/gruppo. */
  function populateAreaSelect() {
    const select = document.getElementById('preset-area');
    select.innerHTML = '';
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = '— scegli un comune (o disegna a mano) —';
    select.appendChild(placeholder);
    const groups = new Map();
    for (const [key, entry] of Object.entries(areas)) {
      const groupName = entry.group || 'Altri comuni';
      if (!groups.has(groupName)) {
        const og = document.createElement('optgroup');
        og.label = groupName;
        groups.set(groupName, og);
        select.appendChild(og);
      }
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = entry.label || key;
      groups.get(groupName).appendChild(opt);
    }
  }

  async function loadAreas() {
    try {
      const res = await fetch('../aree.json');
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data === 'object' && Object.keys(data).length > 0) areas = data;
      }
    } catch {
      // file:// o server assente: si usa la copia inline.
    }
    populateAreaSelect();
  }

  // ------------------------------------------------------------------
  // Mappa Leaflet + strumenti di disegno.
  // ------------------------------------------------------------------
  const map = L.map('map').setView([45.4642, 9.19], 12); // Milano
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);

  // Qualche stringa di Leaflet.draw in italiano.
  if (L.drawLocal) {
    L.drawLocal.draw.toolbar.buttons.rectangle = 'Disegna un rettangolo (area di ricerca)';
    L.drawLocal.draw.toolbar.buttons.polygon = 'Disegna un poligono (area di ricerca)';
    L.drawLocal.draw.handlers.rectangle.tooltip.start = 'Clicca e trascina per disegnare l\'area.';
    L.drawLocal.draw.handlers.polygon.tooltip = {
      start: 'Clicca per iniziare il poligono.',
      cont: 'Clicca per continuare.',
      end: 'Clicca sul primo punto per chiudere.',
    };
    L.drawLocal.edit.toolbar.buttons.edit = 'Modifica l\'area';
    L.drawLocal.edit.toolbar.buttons.remove = 'Elimina l\'area';
  }

  const drawnItems = new L.FeatureGroup().addTo(map);   // area disegnata dall'utente
  const markersLayer = new L.FeatureGroup().addTo(map); // marker dei risultati

  map.addControl(new L.Control.Draw({
    draw: {
      rectangle: { shapeOptions: { color: '#5b3df5', weight: 2 } },
      polygon: { shapeOptions: { color: '#5b3df5', weight: 2 } },
      polyline: false, circle: false, circlemarker: false, marker: false,
    },
    edit: { featureGroup: drawnItems },
  }));

  // Una sola area alla volta: la nuova sostituisce la precedente.
  map.on(L.Draw.Event.CREATED, (e) => {
    drawnItems.clearLayers();
    drawnItems.addLayer(e.layer);
    setStatus('Area disegnata. Scegli la categoria e premi "Cerca attività".');
  });

  // ------------------------------------------------------------------
  // Stato UI.
  // ------------------------------------------------------------------
  const els = {
    status: document.getElementById('status-text'),
    spinner: document.getElementById('spinner'),
    search: document.getElementById('btn-search'),
    searchView: document.getElementById('btn-search-view'),
    download: document.getElementById('btn-download'),
    copy: document.getElementById('btn-copy'),
    count: document.getElementById('results-count'),
    table: document.getElementById('results-table'),
    tbody: document.getElementById('results-tbody'),
    empty: document.getElementById('results-empty'),
    category: document.getElementById('category'),
    presetArea: document.getElementById('preset-area'),
  };

  // Domini unici accumulati in tutte le ricerche della sessione.
  const allDomains = new Set();
  let busy = false;

  function setStatus(text, { spinning = false, error = false } = {}) {
    els.status.textContent = text;
    els.status.classList.toggle('error', error);
    els.spinner.hidden = !spinning;
  }

  function setBusy(v) {
    busy = v;
    els.search.disabled = v;
    els.searchView.disabled = v;
  }

  /** bbox [sud, ovest, nord, est] dall'area disegnata, o null. */
  function drawnBbox() {
    const layers = drawnItems.getLayers();
    if (layers.length === 0) return null;
    const b = layers[0].getBounds();
    return [b.getSouth(), b.getWest(), b.getNorth(), b.getEast()];
  }

  /** bbox dalla vista corrente della mappa. */
  function viewBbox() {
    const b = map.getBounds();
    return [b.getSouth(), b.getWest(), b.getNorth(), b.getEast()];
  }

  /** Area del bbox in gradi² (misura spannometrica, basta per l'avviso). */
  function bboxDeg2([s, w, n, e]) {
    return Math.max(0, n - s) * Math.max(0, e - w);
  }

  // ------------------------------------------------------------------
  // Ricerca Overpass.
  // ------------------------------------------------------------------
  async function runSearch(bbox) {
    if (busy) return;
    const key = els.category.value;
    const entry = categories[key];
    if (!entry) { setStatus('Scegli una categoria.', { error: true }); return; }

    const deg2 = bboxDeg2(bbox);
    if (deg2 > AREA_HARD_DEG2) {
      const ok = window.confirm(
        'L\'area selezionata è molto grande: Overpass quasi certamente andrà in timeout.\n' +
        'Meglio un\'area più piccola (un comune o un quartiere). Provare comunque?'
      );
      if (!ok) return;
    } else if (deg2 > AREA_WARN_DEG2) {
      setStatus('Attenzione: area grande, Overpass potrebbe metterci molto o andare in timeout. Se fallisce, riduci l\'area.', { spinning: true });
    }

    const query = buildOverpassQuery(entry.filters, bbox, 60);
    setBusy(true);
    if (deg2 <= AREA_WARN_DEG2) setStatus(`Cerco "${entry.label}"… (Overpass è gratuito, un po' di pazienza)`, { spinning: true });

    let data = null;
    let lastErr = 'servizio non raggiungibile';
    for (const endpoint of OVERPASS_ENDPOINTS) {
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `data=${encodeURIComponent(query)}`,
        });
        if (res.status === 429) { lastErr = 'troppe richieste (rate limit)'; continue; }
        if (res.status === 504 || res.status === 502) { lastErr = 'timeout del server (area troppo grande?)'; continue; }
        if (!res.ok) { lastErr = `HTTP ${res.status}`; continue; }
        data = await res.json();
        break;
      } catch {
        lastErr = 'rete non raggiungibile';
      }
    }

    setBusy(false);

    if (!data) {
      setStatus(
        `Ricerca fallita: ${lastErr}. Overpass è un servizio pubblico gratuito: ` +
        'riprova tra qualche minuto o riduci l\'area di ricerca.',
        { error: true }
      );
      return;
    }

    renderResults(Array.isArray(data.elements) ? data.elements : [], entry.label);
  }

  /** Estrae i risultati con sito, aggiorna marker + tabella + contatori. */
  function renderResults(elements, categoryLabel) {
    markersLayer.clearLayers();
    els.tbody.innerHTML = '';

    const byDomain = new Map();
    for (const el of elements) {
      const tags = el.tags || {};
      const site = tags.website || tags['contact:website'] || tags.url || null;
      if (!site) continue;
      const domain = extractDomain(site);
      if (!domain || JUNK.has(domain)) continue;
      if (byDomain.has(domain)) continue;
      byDomain.set(domain, {
        name: tags.name || '(senza nome)',
        domain,
        lat: el.lat ?? (el.center && el.center.lat) ?? null,
        lon: el.lon ?? (el.center && el.center.lon) ?? null,
      });
    }

    const results = [...byDomain.values()].sort((a, b) => a.domain.localeCompare(b.domain));
    for (const r of results) {
      allDomains.add(r.domain);
      // Marker solo per chi ha coordinate.
      if (r.lat != null && r.lon != null) {
        L.marker([r.lat, r.lon])
          .bindPopup(
            `<strong>${escapeHtml(r.name)}</strong><br>` +
            `<a href="https://${encodeURIComponent(r.domain).replace(/%2E/gi, '.')}" target="_blank" rel="noopener">${escapeHtml(r.domain)}</a>`
          )
          .addTo(markersLayer);
      }
      // Riga di tabella.
      const tr = document.createElement('tr');
      const tdName = document.createElement('td');
      tdName.textContent = r.name;
      const tdDom = document.createElement('td');
      const a = document.createElement('a');
      a.href = `https://${r.domain}`;
      a.target = '_blank';
      a.rel = 'noopener';
      a.textContent = r.domain;
      tdDom.appendChild(a);
      tr.append(tdName, tdDom);
      els.tbody.appendChild(tr);
    }

    const n = elements.length;
    const m = results.length;
    els.count.textContent = `${n} attività, ${m} con sito`;
    els.table.hidden = m === 0;
    els.empty.hidden = m > 0;
    if (m === 0) {
      els.empty.textContent = n === 0
        ? 'Nessuna attività trovata in quest\'area: prova una zona o categoria diversa.'
        : `${n} attività trovate ma nessuna ha un sito web mappato su OSM.`;
    }
    els.download.disabled = allDomains.size === 0;
    els.copy.disabled = allDomains.size === 0;
    setStatus(`"${categoryLabel}": ${n} attività, ${m} con sito web. Domini unici in sessione: ${allDomains.size}.`);
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
  }

  // ------------------------------------------------------------------
  // Area rapida: vola sul comune scelto e imposta l'area di ricerca al
  // suo bbox (rettangolo visibile e modificabile con gli strumenti di
  // disegno: disegnarne uno nuovo lo sostituisce).
  // ------------------------------------------------------------------
  els.presetArea.addEventListener('change', () => {
    const entry = areas[els.presetArea.value];
    if (!entry) return;
    // bbox dichiarato in aree.json, oppure rettangolo di ripiego ~5 km
    // intorno al centro del comune.
    const bbox = Array.isArray(entry.bbox) && entry.bbox.length === 4
      ? entry.bbox
      : [entry.lat - 0.045, entry.lon - 0.06, entry.lat + 0.045, entry.lon + 0.06];
    const [s, w, n, e] = bbox.map(Number);
    drawnItems.clearLayers();
    drawnItems.addLayer(L.rectangle([[s, w], [n, e]], { color: '#5b3df5', weight: 2 }));
    map.flyTo([entry.lat, entry.lon], entry.zoom || 13);
    setStatus(`Area impostata su ${entry.label} (comune). Scegli la categoria e premi "Cerca attività".`);
  });

  // Se l'utente disegna a mano, il preset non è più "l'area attiva".
  map.on(L.Draw.Event.CREATED, () => { els.presetArea.value = ''; });

  // ------------------------------------------------------------------
  // Azioni: cerca / scarica / copia.
  // ------------------------------------------------------------------
  els.search.addEventListener('click', () => {
    const bbox = drawnBbox();
    if (!bbox) {
      setStatus('Nessuna area disegnata: uso la vista corrente della mappa.', { spinning: true });
      runSearch(viewBbox());
      return;
    }
    runSearch(bbox);
  });

  els.searchView.addEventListener('click', () => runSearch(viewBbox()));

  function domainsFileText() {
    const lines = [
      '# generato da Alchemyx discovery (mappa Overpass)',
      `# data: ${new Date().toISOString()}`,
      '# salva questo file come discovery/output/domains.txt (o uniscilo a quello esistente)',
      '',
      ...[...allDomains].sort(),
      '',
    ];
    return lines.join('\n');
  }

  els.download.addEventListener('click', () => {
    const blob = new Blob([domainsFileText()], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'domains.txt';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setStatus(`Scaricato domains.txt con ${allDomains.size} domini. Salvalo in discovery/output/.`);
  });

  els.copy.addEventListener('click', async () => {
    const text = [...allDomains].sort().join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setStatus(`${allDomains.size} domini copiati negli appunti.`);
    } catch {
      // Fallback: prompt (clipboard API può essere bloccata su file://).
      window.prompt('Copia manualmente i domini:', text);
    }
  });

  // Avvio.
  loadCategories();
  loadAreas();
})();
