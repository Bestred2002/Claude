/* ============================================================
   Alchemyx — Pipeline Lead · logica dashboard
   Vanilla JS, zero dipendenze. Funziona anche da file://.
   ============================================================ */

"use strict";

/* ------------------------------------------------------------
   Dati di fallback incorporati.
   Se il fetch di ../output/leads.json e ./sample-leads.json
   fallisce (tipico aprendo la pagina via file:// per via del
   blocco CORS sui file locali), la dashboard usa questi dati
   così la pagina renderizza SEMPRE qualcosa.
   Tenere allineati con sample-leads.json.
   ------------------------------------------------------------ */
const FALLBACK_LEADS = [
  {
    domain: "rossi-arredamenti.it",
    url: "https://www.rossi-arredamenti.it",
    reachable: true,
    advertises: true,
    adScore: 92,
    metaPixel: true,
    metaPixelId: "70144235981234",
    googleAds: true,
    googleAdsId: "AW-10877612345",
    gtm: true,
    ga4: true,
    signals: "Meta Pixel attivo; Google Ads conversion tag; GTM container; GA4; landing page con UTM da campagne",
    emails: "info@rossi-arredamenti.it, vendite@rossi-arredamenti.it",
    primaryEmail: "info@rossi-arredamenti.it",
    hasMx: true,
    checkedAt: "2026-07-04T09:12:31Z"
  },
  {
    domain: "bellavita-spa.it",
    url: "https://bellavita-spa.it",
    reachable: true,
    advertises: true,
    adScore: 78,
    metaPixel: true,
    metaPixelId: "553920184776251",
    googleAds: false,
    googleAdsId: "",
    gtm: false,
    ga4: true,
    signals: "Meta Pixel attivo; eventi ViewContent/Lead; GA4 presente",
    emails: "prenotazioni@bellavita-spa.it",
    primaryEmail: "prenotazioni@bellavita-spa.it",
    hasMx: true,
    checkedAt: "2026-07-04T09:14:02Z"
  },
  {
    domain: "idraulica-express.com",
    url: "https://www.idraulica-express.com",
    reachable: true,
    advertises: true,
    adScore: 71,
    metaPixel: false,
    metaPixelId: "",
    googleAds: true,
    googleAdsId: "AW-9934821650",
    gtm: true,
    ga4: false,
    signals: "Google Ads tag via GTM; numero di telefono tracciato; pagina 'richiedi preventivo'",
    emails: "contatti@idraulica-express.com, amministrazione@idraulica-express.com",
    primaryEmail: "contatti@idraulica-express.com",
    hasMx: true,
    checkedAt: "2026-07-04T09:15:47Z"
  },
  {
    domain: "palestra-titanium.it",
    url: "https://palestra-titanium.it",
    reachable: true,
    advertises: true,
    adScore: 64,
    metaPixel: true,
    metaPixelId: "889120453322710",
    googleAds: false,
    googleAdsId: "",
    gtm: true,
    ga4: false,
    signals: "Meta Pixel via GTM; pixel su form iscrizione",
    emails: "",
    primaryEmail: "",
    hasMx: false,
    checkedAt: "2026-07-04T09:18:20Z"
  },
  {
    domain: "studiodentisticoferri.it",
    url: "https://www.studiodentisticoferri.it",
    reachable: true,
    advertises: true,
    adScore: 55,
    metaPixel: false,
    metaPixelId: "",
    googleAds: true,
    googleAdsId: "AW-11203458876",
    gtm: false,
    ga4: true,
    signals: "Google Ads remarketing tag; GA4 con conversioni; click-to-call in header",
    emails: "segreteria@studiodentisticoferri.it",
    primaryEmail: "segreteria@studiodentisticoferri.it",
    hasMx: true,
    checkedAt: "2026-07-04T09:21:05Z"
  },
  {
    domain: "gelateria-nuvola.it",
    url: "https://gelateria-nuvola.it",
    reachable: true,
    advertises: false,
    adScore: 18,
    metaPixel: false,
    metaPixelId: "",
    googleAds: false,
    googleAdsId: "",
    gtm: false,
    ga4: true,
    signals: "Solo GA4 base, nessun tag pubblicitario",
    emails: "ciao@gelateria-nuvola.it",
    primaryEmail: "ciao@gelateria-nuvola.it",
    hasMx: true,
    checkedAt: "2026-07-04T09:23:44Z"
  },
  {
    domain: "autofficina-martini.com",
    url: "https://www.autofficina-martini.com",
    reachable: true,
    advertises: true,
    adScore: 83,
    metaPixel: true,
    metaPixelId: "412098765330912",
    googleAds: true,
    googleAdsId: "AW-10455092217",
    gtm: true,
    ga4: true,
    signals: "Meta Pixel + Google Ads attivi; GTM; GA4; retargeting su pagina servizi",
    emails: "",
    primaryEmail: "",
    hasMx: false,
    checkedAt: "2026-07-04T09:26:10Z"
  },
  {
    domain: "vecchio-borgo-ristorante.it",
    url: "http://vecchio-borgo-ristorante.it",
    reachable: false,
    advertises: false,
    adScore: 0,
    metaPixel: false,
    metaPixelId: "",
    googleAds: false,
    googleAdsId: "",
    gtm: false,
    ga4: false,
    signals: "Sito non raggiungibile (timeout)",
    emails: "info@vecchio-borgo-ristorante.it",
    primaryEmail: "info@vecchio-borgo-ristorante.it",
    hasMx: true,
    checkedAt: "2026-07-04T09:28:55Z"
  }
];

/* ------------------------------------------------------------
   Stato applicazione
   ------------------------------------------------------------ */
const state = {
  leads: [],          // tutti i lead caricati
  filtered: [],       // lead dopo i filtri correnti
  sortKey: "adScore", // colonna di ordinamento
  sortDir: "desc",    // "asc" | "desc"
  sourceLabel: ""     // origine dati mostrata nell'header
};

/* Riferimenti DOM (la pagina è statica, li risolviamo una volta sola) */
const el = {
  tbody: document.getElementById("leads-tbody"),
  emptyState: document.getElementById("empty-state"),
  rowCount: document.getElementById("row-count"),
  kpiTotal: document.getElementById("kpi-total"),
  kpiAds: document.getElementById("kpi-ads"),
  kpiActionable: document.getElementById("kpi-actionable"),
  kpiScore: document.getElementById("kpi-score"),
  search: document.getElementById("f-search"),
  channel: document.getElementById("f-channel"),
  minScore: document.getElementById("f-minscore"),
  minScoreVal: document.getElementById("f-minscore-val"),
  onlyAds: document.getElementById("f-ads"),
  onlyEmail: document.getElementById("f-email"),
  exportBtn: document.getElementById("btn-export"),
  fileInput: document.getElementById("file-input"),
  dropzone: document.getElementById("dropzone"),
  sourceLabel: document.getElementById("data-source-label"),
  table: document.getElementById("leads-table"),
  refreshBtn: document.getElementById("btn-refresh"),
  liveBanner: document.getElementById("live-banner"),
  liveFill: document.getElementById("live-fill"),
  liveText: document.getElementById("live-text")
};

/* ------------------------------------------------------------
   Server locale (LEAD GEN app / node server/server.js).
   Se la pagina è servita dal server Node, /api/* è disponibile:
   i lead si caricano da /api/leads e un banner mostra il
   progresso dei job di rilevamento avviati dalla mappa.
   Da file:// (o da un server statico) il ping fallisce in
   silenzio e la dashboard funziona esattamente come prima.
   ------------------------------------------------------------ */
const api = {
  available: false,
  pollMs: 1500,
  wasRunning: false
};

/** Ping del server locale: true solo se risponde il NOSTRO server. */
async function detectApi() {
  try {
    const res = await fetch("../api/ping", { cache: "no-store" });
    const data = res.ok ? await res.json() : null;
    api.available = Boolean(data && data.app === "alchemyx-leadgen");
  } catch (err) {
    api.available = false; // file:// o server statico: nessun problema
  }
  return api.available;
}

/* ------------------------------------------------------------
   Caricamento dati
   ------------------------------------------------------------ */

/** Normalizza un lead grezzo garantendo tipi e default sensati. */
function normalizeLead(raw) {
  return {
    domain: String(raw.domain || ""),
    url: String(raw.url || ""),
    reachable: Boolean(raw.reachable),
    advertises: Boolean(raw.advertises),
    adScore: Number.isFinite(Number(raw.adScore)) ? Number(raw.adScore) : 0,
    metaPixel: Boolean(raw.metaPixel),
    metaPixelId: String(raw.metaPixelId || ""),
    googleAds: Boolean(raw.googleAds),
    googleAdsId: String(raw.googleAdsId || ""),
    gtm: Boolean(raw.gtm),
    ga4: Boolean(raw.ga4),
    signals: String(raw.signals || ""),
    emails: String(raw.emails || ""),
    primaryEmail: String(raw.primaryEmail || ""),
    hasMx: Boolean(raw.hasMx),
    checkedAt: String(raw.checkedAt || "")
  };
}

/** Imposta il dataset corrente e ridisegna tutto. */
function setLeads(rawArray, sourceLabel) {
  if (!Array.isArray(rawArray)) {
    throw new Error("Il JSON deve contenere un array di lead");
  }
  state.leads = rawArray.map(normalizeLead);
  state.sourceLabel = sourceLabel;
  el.sourceLabel.textContent = sourceLabel + " · " + state.leads.length + " lead";
  applyFilters();
}

/** Prova a caricare un JSON via fetch; ritorna l'array o lancia. */
async function tryFetchJson(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("HTTP " + res.status + " per " + url);
  return res.json();
}

/**
 * Strategia di avvio:
 * 1. ../output/leads.json (i dati reali del detector)
 * 2. ./sample-leads.json  (dati dimostrativi)
 * 3. FALLBACK_LEADS inline (aprendo via file:// il fetch locale
 *    è quasi sempre bloccato dal browser: la pagina deve comunque
 *    mostrare qualcosa)
 */
async function bootstrapData() {
  // 0. /api/leads: il server locale Node serve i dati vivi senza cache
  //    (solo se il ping ha confermato che il server è il nostro).
  if (api.available) {
    try {
      const data = await tryFetchJson("../api/leads");
      if (Array.isArray(data) && data.length > 0) {
        setLeads(data, "Dati reali (server locale)");
        return;
      }
    } catch (err) {
      // ignora e prova la sorgente successiva
    }
  }
  try {
    const data = await tryFetchJson("../output/leads.json");
    setLeads(data, "Dati reali (output/leads.json)");
    return;
  } catch (err) {
    // ignora e prova la sorgente successiva
  }
  try {
    const data = await tryFetchJson("./sample-leads.json");
    setLeads(data, "Dati di esempio (sample-leads.json)");
    return;
  } catch (err) {
    // ignora e usa il fallback inline
  }
  setLeads(FALLBACK_LEADS, "Dati di esempio (integrati)");
}

/**
 * Ricarica i lead dai dati vivi (manuale col bottone "Aggiorna" o
 * automatica alla fine di un job). Preferisce /api/leads (no-cache),
 * altrimenti riprova ../output/leads.json.
 * @param {boolean} silent true = niente alert in caso di errore
 */
async function refreshLeads(silent) {
  const sources = api.available
    ? [["../api/leads", "Dati reali (server locale)"]]
    : [["../output/leads.json", "Dati reali (output/leads.json)"]];

  for (const [url, label] of sources) {
    try {
      const data = await tryFetchJson(url);
      if (Array.isArray(data)) {
        setLeads(data, label + " · aggiornato " +
          new Date().toLocaleTimeString("it-IT"));
        return true;
      }
    } catch (err) {
      // prova la sorgente successiva (se c'è)
    }
  }
  if (!silent) {
    alert("Impossibile ricaricare i lead: nessuna sorgente raggiungibile.\n" +
      "Da file:// usa il bottone \"Carica leads.json\".");
  }
  return false;
}

/* ------------------------------------------------------------
   Banner "analisi in corso": polling di /api/status quando la
   dashboard gira sotto il server locale Node. Alla fine di un
   job la tabella e i KPI si aggiornano da soli.
   ------------------------------------------------------------ */
function renderLiveStatus(status) {
  const pct = status.total > 0
    ? Math.round((status.done / status.total) * 100)
    : 0;
  el.liveFill.style.width = pct + "%";
  el.liveText.textContent =
    "Analisi in corso: " + status.done + "/" + status.total +
    " domini — " + status.advertisers + " advertiser trovati" +
    (status.lastDomain ? " · ultimo: " + status.lastDomain : "");
  el.liveBanner.hidden = false;
}

function startStatusPolling() {
  setInterval(async () => {
    let status;
    try {
      const res = await fetch("../api/status", { cache: "no-store" });
      if (!res.ok) return;
      status = await res.json();
    } catch (err) {
      return; // server momentaneamente non raggiungibile: riprova al giro dopo
    }

    if (status.running) {
      api.wasRunning = true;
      renderLiveStatus(status);
      return;
    }

    el.liveBanner.hidden = true;
    if (api.wasRunning) {
      // Un job è appena terminato: ricarica automaticamente i dati.
      api.wasRunning = false;
      refreshLeads(true);
    }
  }, api.pollMs);
}

/** Legge un File (input o drop) come JSON con FileReader. */
function loadFromFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(String(reader.result));
      setLeads(data, "File caricato (" + file.name + ")");
    } catch (err) {
      alert("File non valido: " + err.message);
    }
  };
  reader.onerror = () => alert("Impossibile leggere il file.");
  reader.readAsText(file);
}

/* ------------------------------------------------------------
   Filtri e ordinamento
   ------------------------------------------------------------ */

/** Canale pubblicitario del lead: "meta" | "google" | "both" | "none". */
function channelOf(lead) {
  if (lead.metaPixel && lead.googleAds) return "both";
  if (lead.metaPixel) return "meta";
  if (lead.googleAds) return "google";
  return "none";
}

/** Un lead è "azionabile" se fa ads e ha un'email con MX valido. */
function isActionable(lead) {
  return lead.advertises && lead.primaryEmail !== "" && lead.hasMx;
}

/** Applica i filtri correnti a state.leads e ridisegna la UI. */
function applyFilters() {
  const query = el.search.value.trim().toLowerCase();
  const onlyAds = el.onlyAds.checked;
  const onlyEmail = el.onlyEmail.checked;
  const channel = el.channel.value; // all | meta | google | both
  const minScore = Number(el.minScore.value);

  state.filtered = state.leads.filter((lead) => {
    if (query && !lead.domain.toLowerCase().includes(query)) return false;
    if (onlyAds && !lead.advertises) return false;
    if (onlyEmail && !lead.primaryEmail) return false;
    if (lead.adScore < minScore) return false;

    if (channel !== "all") {
      const ch = channelOf(lead);
      if (channel === "both" && ch !== "both") return false;
      // "Meta" e "Google" includono anche chi usa entrambi i canali
      if (channel === "meta" && !lead.metaPixel) return false;
      if (channel === "google" && !lead.googleAds) return false;
    }
    return true;
  });

  sortFiltered();
  render();
}

/** Ordina state.filtered in base a sortKey/sortDir. */
function sortFiltered() {
  const { sortKey, sortDir } = state;
  const dir = sortDir === "asc" ? 1 : -1;
  state.filtered.sort((a, b) => {
    const va = a[sortKey];
    const vb = b[sortKey];
    if (typeof va === "string") return va.localeCompare(vb) * dir;
    return (va - vb) * dir;
  });
}

/** Gestisce il click su un header ordinabile. */
function onSortClick(key) {
  if (state.sortKey === key) {
    state.sortDir = state.sortDir === "asc" ? "desc" : "asc";
  } else {
    state.sortKey = key;
    // default sensato: domini A→Z, punteggi dal più alto
    state.sortDir = key === "adScore" ? "desc" : "asc";
  }
  sortFiltered();
  render();
}

/* ------------------------------------------------------------
   Rendering
   ------------------------------------------------------------ */

/** Escape HTML per inserire testo arbitrario in innerHTML. */
function esc(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** HTML dei badge canale per una riga. */
function channelBadges(lead) {
  const badges = [];
  if (lead.metaPixel) badges.push('<span class="badge badge-meta">Meta</span>');
  if (lead.googleAds) badges.push('<span class="badge badge-google">Google</span>');
  if (badges.length === 0) badges.push('<span class="badge badge-none">—</span>');
  return badges.join("");
}

/** Classe colore del chip punteggio. */
function scoreClass(score) {
  if (score >= 70) return "score-high";
  if (score >= 40) return "score-mid";
  return "score-low";
}

/** Aggiorna i KPI in base ai lead FILTRATI. */
function renderKpis() {
  const rows = state.filtered;
  const total = rows.length;
  const ads = rows.filter((l) => l.advertises).length;
  const actionable = rows.filter(isActionable).length;
  const avg = total
    ? Math.round(rows.reduce((sum, l) => sum + l.adScore, 0) / total)
    : 0;

  el.kpiTotal.textContent = String(total);
  el.kpiAds.textContent = String(ads);
  el.kpiActionable.textContent = String(actionable);
  el.kpiScore.textContent = total ? String(avg) : "–";
}

/** Aggiorna gli indicatori di ordinamento sugli header. */
function renderSortIndicators() {
  el.table.querySelectorAll("th.sortable").forEach((th) => {
    th.classList.remove("sorted-asc", "sorted-desc");
    if (th.dataset.sort === state.sortKey) {
      th.classList.add(state.sortDir === "asc" ? "sorted-asc" : "sorted-desc");
    }
  });
}

/** Disegna la tabella dei lead filtrati. */
function renderTable() {
  const rows = state.filtered;

  el.emptyState.hidden = rows.length > 0;
  el.rowCount.textContent =
    rows.length + " di " + state.leads.length + " lead visualizzati";

  el.tbody.innerHTML = rows
    .map((lead) => {
      const domainCell = lead.url
        ? '<a class="domain-link" href="' + esc(lead.url) +
          '" target="_blank" rel="noopener noreferrer">' + esc(lead.domain) + "</a>"
        : esc(lead.domain);

      const emailCell = lead.primaryEmail
        ? '<a class="email-link" href="mailto:' + esc(lead.primaryEmail) + '">' +
          esc(lead.primaryEmail) + "</a>"
        : '<span class="muted">—</span>';

      const mxCell = lead.hasMx
        ? '<span class="mx-yes">✓</span>'
        : '<span class="mx-no">—</span>';

      return (
        '<tr class="' + (lead.advertises ? "advertiser" : "") + '">' +
        "<td>" + domainCell + "</td>" +
        "<td>" + channelBadges(lead) + "</td>" +
        '<td><span class="score-chip ' + scoreClass(lead.adScore) + '">' +
          lead.adScore + "</span></td>" +
        "<td>" + emailCell + "</td>" +
        "<td>" + mxCell + "</td>" +
        '<td class="signals-cell" title="' + esc(lead.signals) + '">' +
          esc(lead.signals) + "</td>" +
        "</tr>"
      );
    })
    .join("");
}

/** Rendering completo (KPI + tabella + indicatori). */
function render() {
  renderKpis();
  renderSortIndicators();
  renderTable();
}

/* ------------------------------------------------------------
   Esportazione CSV
   ------------------------------------------------------------ */

/** Quota un valore per il CSV (RFC 4180). */
function csvQuote(value) {
  const str = String(value == null ? "" : value);
  if (/[",\n\r]/.test(str)) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

/** Costruisce il testo CSV dalle righe passate. */
function toCSV(rows) {
  const columns = [
    "domain", "url", "reachable", "advertises", "adScore",
    "metaPixel", "metaPixelId", "googleAds", "googleAdsId",
    "gtm", "ga4", "signals", "emails", "primaryEmail",
    "hasMx", "checkedAt"
  ];
  const lines = [columns.join(",")];
  for (const row of rows) {
    lines.push(columns.map((col) => csvQuote(row[col])).join(","));
  }
  return lines.join("\r\n");
}

/** Scarica i lead FILTRATI come CSV tramite Blob (nessuna libreria). */
function exportCSV() {
  if (state.filtered.length === 0) {
    alert("Nessuna riga da esportare con i filtri correnti.");
    return;
  }
  const csv = toCSV(state.filtered);
  // BOM per far riconoscere l'UTF-8 a Excel
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = "alchemyx-leads-" + stamp + ".csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* ------------------------------------------------------------
   Event listeners
   ------------------------------------------------------------ */

function initEvents() {
  // Filtri
  el.search.addEventListener("input", applyFilters);
  el.channel.addEventListener("change", applyFilters);
  el.onlyAds.addEventListener("change", applyFilters);
  el.onlyEmail.addEventListener("change", applyFilters);
  el.minScore.addEventListener("input", () => {
    el.minScoreVal.textContent = el.minScore.value;
    applyFilters();
  });

  // Ordinamento colonne
  el.table.querySelectorAll("th.sortable").forEach((th) => {
    th.addEventListener("click", () => onSortClick(th.dataset.sort));
  });

  // Export
  el.exportBtn.addEventListener("click", exportCSV);

  // Aggiorna manuale (ricarica i dati vivi)
  el.refreshBtn.addEventListener("click", () => refreshLeads(false));

  // Input file
  el.fileInput.addEventListener("change", (event) => {
    loadFromFile(event.target.files[0]);
    event.target.value = ""; // permette di ricaricare lo stesso file
  });

  // Drag & drop
  ["dragenter", "dragover"].forEach((type) => {
    el.dropzone.addEventListener(type, (event) => {
      event.preventDefault();
      el.dropzone.classList.add("dragover");
    });
  });
  ["dragleave", "drop"].forEach((type) => {
    el.dropzone.addEventListener(type, (event) => {
      event.preventDefault();
      el.dropzone.classList.remove("dragover");
    });
  });
  el.dropzone.addEventListener("drop", (event) => {
    const file = event.dataTransfer && event.dataTransfer.files[0];
    loadFromFile(file);
  });
}

/* ------------------------------------------------------------
   Avvio
   ------------------------------------------------------------ */

initEvents();
detectApi().then(() => {
  bootstrapData();
  if (api.available) startStatusPolling();
});
