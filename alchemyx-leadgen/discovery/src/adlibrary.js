/**
 * adlibrary.js — Meta Ad Library + Google Ads Transparency Center (Italia).
 *
 * IMPORTANTE (ToS): questo modulo NON effettua scraping automatico di
 * Facebook/Meta né di Google. Lo scraping automatizzato di quelle pagine
 * viola i Termini di Servizio delle piattaforme. Qui forniamo solo:
 *   1. costruttori di URL pubblici da aprire MANUALMENTE nel browser;
 *   2. un parser best-effort per testo/HTML/JSON che l'utente ha salvato
 *      manualmente da quelle pagine (Ctrl+S / copia-incolla), da usare a
 *      basso volume.
 *
 * Zero dipendenze: solo built-in di Node.
 */

import { extractDomain, isJunk } from './normalize.js';

/**
 * URL di ricerca pubblica nella Meta Ad Library (inserzioni attive in Italia).
 * Da aprire manualmente nel browser: la pagina è pubblica e consultabile
 * senza login.
 */
export function metaAdLibraryUrl(keyword, { country = 'IT' } = {}) {
  const q = encodeURIComponent(String(keyword ?? '').trim());
  return `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=${encodeURIComponent(country)}&q=${q}&media_type=all`;
}

/**
 * URL del Google Ads Transparency Center per la regione indicata.
 * NOTA: il Transparency Center non supporta la keyword nella query string —
 * la ricerca per parola chiave/inserzionista va fatta lato UI, nella barra
 * di ricerca della pagina. Restituiamo l'URL della regione e la keyword
 * viene stampata come promemoria dal CLI.
 */
export function googleAdsTransparencyUrl(keyword, { region = 'IT' } = {}) {
  // keyword è accettata solo per simmetria d'API: va digitata manualmente
  // nella UI (vedi nota sopra).
  void keyword;
  return `https://adstransparency.google.com/?region=${encodeURIComponent(region)}`;
}

const NAME_NEAR_RE =
  /(?:Sponsorizzato|Sponsored|Pagina|Page)\s*(?:·|:|-|—)?\s*["“']?([A-ZÀ-Ù][\w&'’.\- À-ÿ]{2,60})["”']?/g;
const PAGE_NAME_JSON_RE =
  /"(?:page_name|pageName|advertiser_name|advertiserName|name)"\s*:\s*"([^"\\]{2,80})"/g;
const HREF_RE = /href=["']([^"']+)["']/gi;
const URLISH_RE = /https?:\/\/[^\s"'<>\\)\]]+/gi;

/**
 * Parser best-effort di un export salvato MANUALMENTE da una pagina della
 * Ad Library / Transparency Center (HTML "Salva pagina", JSON copiato dal
 * network tab, o semplice copia-incolla di testo).
 *
 * Estrae:
 *   - names:   nomi di pagine/inserzionisti trovati vicino a marker tipo
 *              "Sponsorizzato"/"Pagina" o in campi JSON noti;
 *   - domains: domini registrabili trovati in href/URL, ripuliti dai domini
 *              junk (facebook.com, l.facebook.com, google.com, ...).
 *
 * @param {string} text contenuto salvato/incollato dall'utente
 * @returns {{names: string[], domains: string[]}}
 */
export function parseAdLibraryExport(text) {
  const src = String(text ?? '');
  const names = new Set();
  const domains = new Set();

  // Nomi vicino a marker testuali ("Sponsorizzato", "Pagina", ...).
  for (const m of src.matchAll(NAME_NEAR_RE)) {
    const name = m[1].trim().replace(/\s{2,}/g, ' ');
    if (name.length >= 3) names.add(name);
  }
  // Nomi in strutture JSON note (export dal network tab).
  for (const m of src.matchAll(PAGE_NAME_JSON_RE)) {
    const name = m[1].trim();
    if (name.length >= 3 && !/^https?:/i.test(name)) names.add(name);
  }

  // Domini da href e da URL sparsi nel testo.
  const candidates = [];
  for (const m of src.matchAll(HREF_RE)) candidates.push(m[1]);
  for (const m of src.matchAll(URLISH_RE)) candidates.push(m[0]);
  for (const cand of candidates) {
    // I link in uscita di Facebook passano da l.facebook.com/l.php?u=<url>:
    // proviamo prima a estrarre il parametro u.
    let target = cand;
    const uMatch = cand.match(/[?&]u=([^&"']+)/);
    if (uMatch) {
      try { target = decodeURIComponent(uMatch[1]); } catch { /* keep raw */ }
    }
    const dom = extractDomain(target);
    if (dom && !isJunk(dom)) domains.add(dom);
  }

  return { names: [...names].sort(), domains: [...domains].sort() };
}
