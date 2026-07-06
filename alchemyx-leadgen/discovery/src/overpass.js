/**
 * overpass.js — ricerca geografica di attività su OpenStreetMap via Overpass API.
 *
 * Motore condiviso della "ricerca geografica" Alchemyx: lo usa il CLI
 * (`src/index.js --overpass ...`) e la sua logica è replicata inline nella
 * mappa browser (`map/app.js`).
 *
 * Servizi pubblici e gratuiti usati (con relative policy):
 *   - Nominatim (https://operations.osmfoundation.org/policies/nominatim/):
 *     User-Agent descrittivo, max 1 req/s → rate limiter integrato.
 *   - Overpass API (https://overpass-api.de): istanza pubblica gratuita,
 *     una richiesta per ricerca, timeout ragionevole, niente aree enormi.
 *     Mirror di fallback: overpass.kumi.systems.
 *
 * Zero dipendenze: fetch globale di Node 18+.
 */

import { extractDomain, isJunk } from './normalize.js';

const NOMINATIM = 'https://nominatim.openstreetmap.org/search';
const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];
const USER_AGENT =
  'Alchemyx-LeadGen/1.0 (discovery module; contact: bestred2002@gmail.com)';

// Convenzione Overpass per convertire un oggetto OSM in area id.
const AREA_RELATION_OFFSET = 3600000000;
const AREA_WAY_OFFSET = 2400000000;

const MIN_INTERVAL_MS = 1100; // > 1 s: policy Nominatim (1 req/s)
let lastNominatimAt = 0;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Attende quanto serve per rispettare 1 richiesta/secondo verso Nominatim. */
async function nominatimRateLimit() {
  const wait = lastNominatimAt + MIN_INTERVAL_MS - Date.now();
  if (wait > 0) await sleep(wait);
  lastNominatimAt = Date.now();
}

/** Escapa un valore per un filtro Overpass QL tra doppi apici. */
function qlEscape(v) {
  return String(v).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/**
 * Costruisce una query Overpass QL a partire dai filtri di categoria e da
 * una clausola d'area.
 *
 * @param {Array<[string, string?]>} filters  es. [["amenity","restaurant"], ["shop"]]
 *        [chiave, valore] = tag esatto; [chiave] = wildcard (qualsiasi valore).
 * @param {{bbox?: [number,number,number,number], areaId?: number}} areaClause
 *        - bbox:   [sud, ovest, nord, est] → clausola `(s,w,n,e)`
 *        - areaId: id area Overpass → prelude `area(ID)->.a;` + clausola `(area.a)`
 * @param {{timeout?: number}} [opts]
 * @returns {string} query Overpass QL completa (union `( ... );` + `out tags center;`)
 */
export function buildOverpassQuery(filters, areaClause = {}, { timeout = 60 } = {}) {
  const list = Array.isArray(filters) ? filters : [];
  let prelude = '';
  let clause = '';

  if (Array.isArray(areaClause?.bbox) && areaClause.bbox.length === 4) {
    const [s, w, n, e] = areaClause.bbox.map(Number);
    clause = `(${s},${w},${n},${e})`;
  } else if (areaClause?.areaId != null) {
    prelude = `area(${Math.trunc(Number(areaClause.areaId))})->.a;\n`;
    clause = '(area.a)';
  }

  const lines = list
    .filter((f) => Array.isArray(f) && f.length >= 1 && f[0])
    .map((f) => {
      const tag = f.length >= 2 && f[1] != null
        ? `["${qlEscape(f[0])}"="${qlEscape(f[1])}"]`
        : `["${qlEscape(f[0])}"]`;
      return `  nwr${tag}${clause};`;
    });

  return (
    `[out:json][timeout:${Math.max(1, Math.trunc(timeout))}];\n` +
    prelude +
    '(\n' +
    lines.join('\n') +
    '\n);\n' +
    'out tags center;\n'
  );
}

/**
 * Risolve un nome di luogo italiano (comune o provincia) in un'area Overpass
 * tramite Nominatim.
 *
 * @param {string} placeName es. "Bologna", "Milano"
 * @param {{level?: 'citta'|'provincia'}} [opts]
 *        'citta' → preferisce admin_level 8 (comune, default);
 *        'provincia' → preferisce admin_level 6 (provincia / città metropolitana).
 * @returns {Promise<{osmType: string, osmId: number, displayName: string, areaId: number}|null>}
 *          Non lancia mai: null su errore rete / nessun risultato adatto.
 */
export async function resolveAreaId(placeName, { level = 'citta' } = {}) {
  try {
    const q = String(placeName ?? '').trim();
    if (!q) return null;

    const params = new URLSearchParams({
      format: 'jsonv2',
      q,
      countrycodes: 'it',
      limit: '5',
      extratags: '1',
    });

    await nominatimRateLimit();
    const res = await fetch(`${NOMINATIM}?${params}`, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'application/json',
        'Accept-Language': 'it',
      },
    });
    if (!res.ok) return null;

    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;

    const wantedLevel = level === 'provincia' ? '6' : '8';

    // Punteggio: preferisci relation, boundary amministrativo e admin_level giusto.
    let best = null;
    let bestScore = -Infinity;
    for (const item of data) {
      const osmType = item?.osm_type;
      if (osmType !== 'relation' && osmType !== 'way') continue;
      let score = 0;
      if (osmType === 'relation') score += 4;
      if (item?.class === 'boundary' && item?.type === 'administrative') score += 3;
      const adminLevel = item?.extratags?.admin_level ?? null;
      if (adminLevel === wantedLevel) score += 5;
      else if (adminLevel != null) score -= 1;
      if (score > bestScore) {
        bestScore = score;
        best = item;
      }
    }
    if (!best) return null;

    const osmId = Number(best.osm_id);
    const areaId = best.osm_type === 'relation'
      ? AREA_RELATION_OFFSET + osmId
      : AREA_WAY_OFFSET + osmId;

    return {
      osmType: best.osm_type,
      osmId,
      displayName: best.display_name || q,
      areaId,
    };
  } catch {
    // Rete assente, JSON malformato, ecc.: mai lanciare.
    return null;
  }
}

/**
 * Esegue una query Overpass QL (POST urlencoded) e ne estrae le attività.
 * Prova prima l'endpoint principale, poi il mirror su errore / 429 / 504.
 *
 * @param {string} query  query Overpass QL (da buildOverpassQuery)
 * @param {{endpoint?: string}} [opts]  endpoint principale alternativo
 * @returns {Promise<{ok: boolean, results: Array<{name: string, domain: string, lat: number|null, lon: number|null}>, total: number, error: string|null}>}
 *          results = solo attività con sito web (dominio non junk), deduplicate
 *          per dominio. total = numero totale di attività trovate (anche senza
 *          sito). Non lancia mai.
 */
export async function runOverpass(query, { endpoint } = {}) {
  const endpoints = endpoint
    ? [endpoint, ...OVERPASS_ENDPOINTS.filter((e) => e !== endpoint)]
    : OVERPASS_ENDPOINTS;

  let lastError = 'nessun endpoint raggiungibile';
  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': USER_AGENT,
          'Accept': 'application/json',
        },
        body: `data=${encodeURIComponent(query)}`,
      });

      if (res.status === 429) {
        lastError = 'rate limit Overpass (429): troppe richieste, riprova tra qualche minuto';
        continue; // prova il mirror
      }
      if (res.status === 504 || res.status === 502) {
        lastError = `timeout lato server Overpass (${res.status}): area troppo grande o servizio carico`;
        continue; // prova il mirror
      }
      if (!res.ok) {
        lastError = `HTTP ${res.status} da ${url}`;
        continue;
      }

      const data = await res.json();
      const elements = Array.isArray(data?.elements) ? data.elements : [];

      const byDomain = new Map();
      for (const el of elements) {
        const tags = el?.tags ?? {};
        const site = tags.website || tags['contact:website'] || tags.url || null;
        if (!site) continue;
        const domain = extractDomain(site);
        if (!domain || isJunk(domain)) continue;
        if (byDomain.has(domain)) continue;
        byDomain.set(domain, {
          name: tags.name || '',
          domain,
          lat: el?.lat ?? el?.center?.lat ?? null,
          lon: el?.lon ?? el?.center?.lon ?? null,
        });
      }

      return { ok: true, results: [...byDomain.values()], total: elements.length, error: null };
    } catch (err) {
      lastError = `rete non raggiungibile (${err?.message || 'errore sconosciuto'})`;
    }
  }

  return { ok: false, results: [], total: 0, error: lastError };
}

/**
 * Helper "tutto in uno": categoria + luogo (o bbox) → attività con sito web.
 *
 * @param {{category: string, place?: string, level?: 'citta'|'provincia',
 *          bbox?: [number,number,number,number]}} params
 * @param {object} categoriesJson  contenuto di categories.json
 * @returns {Promise<{ok: boolean, results: Array, total: number,
 *                    area: {displayName: string}|null, error: string|null}>}
 *          Non lancia mai.
 */
export async function businessesInArea({ category, place, level = 'citta', bbox } = {}, categoriesJson = {}) {
  const entry = categoriesJson?.[category];
  if (!entry || !Array.isArray(entry.filters)) {
    return { ok: false, results: [], total: 0, area: null, error: `categoria sconosciuta: ${category}` };
  }

  let areaClause;
  let area = null;
  if (Array.isArray(bbox) && bbox.length === 4) {
    areaClause = { bbox };
  } else {
    area = await resolveAreaId(place, { level });
    if (!area) {
      return { ok: false, results: [], total: 0, area: null, error: `area non trovata: "${place}"` };
    }
    areaClause = { areaId: area.areaId };
  }

  const query = buildOverpassQuery(entry.filters, areaClause, { timeout: 90 });
  const run = await runOverpass(query);
  return { ...run, area };
}
