/**
 * osm.js — ricerca POI aziendali su OpenStreetMap via Nominatim (gratuito).
 *
 * Nominatim è un servizio pubblico e gratuito, senza API key. La usage policy
 * (https://operations.osmfoundation.org/policies/nominatim/) richiede:
 *   - uno User-Agent descrittivo che identifichi l'applicazione;
 *   - massimo 1 richiesta al secondo;
 *   - nessun uso massivo/bulk.
 * Questo modulo rispetta tutti e tre i vincoli (rate limiter integrato).
 *
 * Zero dipendenze: fetch globale di Node 18+.
 */

import { extractDomain, isJunk } from './normalize.js';

const NOMINATIM = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT =
  'Alchemyx-LeadGen/1.0 (discovery module; contact: bestred2002@gmail.com)';
const MIN_INTERVAL_MS = 1100; // > 1s per stare larghi sulla policy 1 req/s

let lastRequestAt = 0;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Attende quanto serve per non superare 1 richiesta/secondo. */
async function rateLimit() {
  const wait = lastRequestAt + MIN_INTERVAL_MS - Date.now();
  if (wait > 0) await sleep(wait);
  lastRequestAt = Date.now();
}

/**
 * Cerca POI su Nominatim per categoria + città (limitato all'Italia) e
 * restituisce quelli che dichiarano un sito web nei tag OSM.
 *
 * @param {string} category es. "ristorante", "parrucchiere", "ecommerce"
 * @param {string} city     es. "Bologna"
 * @param {{limit?: number}} [opts]
 * @returns {Promise<Array<{name: string, domain: string|null, lat: number, lon: number}>>}
 *          Non lancia mai: in caso di errore di rete/HTTP ritorna [].
 */
export async function searchOsm(category, city, { limit = 25 } = {}) {
  try {
    const params = new URLSearchParams({
      format: 'jsonv2',
      q: `${String(category ?? '').trim()} ${String(city ?? '').trim()}`.trim(),
      countrycodes: 'it',
      limit: String(limit),
      extratags: '1',
      addressdetails: '1',
    });

    await rateLimit();
    const res = await fetch(`${NOMINATIM}?${params}`, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'application/json',
        'Accept-Language': 'it',
      },
    });
    if (!res.ok) return [];

    const data = await res.json();
    if (!Array.isArray(data)) return [];

    const out = [];
    for (const item of data) {
      const extra = item?.extratags ?? {};
      const site =
        extra.website ||
        extra['contact:website'] ||
        extra.url ||
        null;
      let domain = site ? extractDomain(site) : null;
      if (domain && isJunk(domain)) domain = null;
      out.push({
        name: item?.name || item?.display_name?.split(',')[0]?.trim() || '',
        domain,
        lat: Number(item?.lat),
        lon: Number(item?.lon),
      });
    }
    return out;
  } catch {
    // Rete assente, timeout, JSON malformato, ecc.: mai lanciare.
    return [];
  }
}
