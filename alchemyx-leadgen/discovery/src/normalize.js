/**
 * normalize.js — normalizzazione e dedupe di domini da input misti.
 *
 * Zero dipendenze: solo built-in di Node (node:url).
 *
 * export:
 *   - JUNK           Set di domini social/piattaforma/junk da scartare
 *   - extractDomain  estrae il dominio registrabile da URL / dominio nudo / stringa sporca
 *   - normalizeList  normalizza + deduplica un array di righe miste
 */

import { URL } from 'node:url';

/**
 * Domini social / piattaforme / shortener / junk che NON sono siti aziendali
 * dei lead: vanno sempre scartati.
 */
export const JUNK = new Set([
  'facebook.com',
  'fb.com',
  'fb.me',
  'l.facebook.com',
  'lm.facebook.com',
  'm.facebook.com',
  'business.facebook.com',
  'instagram.com',
  'l.instagram.com',
  'messenger.com',
  'whatsapp.com',
  'wa.me',
  'wa.link',
  'google.com',
  'google.it',
  'goo.gl',
  'g.page',
  'maps.google.com',
  'youtube.com',
  'youtu.be',
  'linkedin.com',
  'lnkd.in',
  'tiktok.com',
  'twitter.com',
  'x.com',
  't.co',
  'pinterest.com',
  'pinterest.it',
  'amazon.com',
  'amazon.it',
  'amzn.to',
  'amzn.eu',
  'ebay.it',
  'ebay.com',
  'etsy.com',
  'bit.ly',
  'tinyurl.com',
  'linktr.ee',
  'telegram.me',
  't.me',
  'apple.com',
  'play.google.com',
  'wikipedia.org',
  'tripadvisor.it',
  'tripadvisor.com',
  'booking.com',
  'paginegialle.it',
  'subito.it',
  'blogspot.com',
  'wordpress.com',
  'wixsite.com',
  'sites.google.com',
  'adstransparency.google.com',
]);

// Suffissi multi-label comuni per cui il "dominio registrabile" ha 3 etichette
// (es. azienda.co.uk, azienda.com.br). Mini-lista pragmatica, niente PSL esterna.
const SECOND_LEVEL_SUFFIXES = new Set([
  'co.uk', 'org.uk', 'ac.uk', 'gov.uk',
  'com.br', 'com.ar', 'com.mx', 'com.au', 'com.tr', 'com.es',
  'co.jp', 'co.kr', 'co.in', 'co.nz', 'co.za',
  'edu.it', 'gov.it',
]);

const DOMAIN_RE = /([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}/i;

/**
 * Riduce un hostname al dominio registrabile (eTLD+1, best effort).
 * es. "shop.azienda.it" -> "azienda.it", "foo.bar.co.uk" -> "bar.co.uk"
 */
function registrable(hostname) {
  const labels = hostname.split('.').filter(Boolean);
  if (labels.length <= 2) return labels.join('.');
  const lastTwo = labels.slice(-2).join('.');
  if (SECOND_LEVEL_SUFFIXES.has(lastTwo)) return labels.slice(-3).join('.');
  return lastTwo;
}

/**
 * Estrae il dominio registrabile da una stringa qualsiasi:
 * URL completo, dominio nudo, "Azienda - www.sito.it", email, ecc.
 * Ritorna una stringa lowercase senza "www." oppure null se non trova nulla
 * di valido.
 *
 * NON filtra i domini junk: quello lo fa normalizeList (così extractDomain
 * resta riusabile anche per analisi dei junk stessi).
 */
export function extractDomain(str) {
  if (typeof str !== 'string') return null;
  let s = str.trim();
  if (!s) return null;

  // 1) Prova come URL (aggiungendo lo schema se sembra un URL senza schema).
  let hostname = null;
  const urlish = s.match(/https?:\/\/[^\s"'<>)\]]+/i);
  if (urlish) {
    try { hostname = new URL(urlish[0]).hostname; } catch { /* ignore */ }
  }

  // 2) Fallback: cerca il primo token che assomiglia a un dominio.
  if (!hostname) {
    // Scarta la parte prima di una @ (email) per tenere il dominio.
    const at = s.lastIndexOf('@');
    if (at !== -1) s = s.slice(at + 1);
    const m = s.match(DOMAIN_RE);
    if (!m) return null;
    hostname = m[0];
  }

  hostname = hostname.toLowerCase().replace(/\.+$/, '');
  if (hostname.startsWith('www.')) hostname = hostname.slice(4);
  if (!DOMAIN_RE.test(hostname)) return null;
  // Scarta IP nudi.
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) return null;

  const dom = registrable(hostname);
  return dom || null;
}

/** true se il dominio è nella junk-list (confronto sul registrabile). */
export function isJunk(domain) {
  if (!domain) return true;
  return JUNK.has(domain) || JUNK.has(`www.${domain}`);
}

/**
 * Normalizza + deduplica una lista di righe miste (URL, domini nudi,
 * "Azienda - sito.it", ...). Ignora righe vuote e commenti (#).
 * Scarta i domini social/piattaforma/junk. Ritorna array ordinato di
 * domini aziendali unici.
 */
export function normalizeList(lines) {
  const input = Array.isArray(lines) ? lines : String(lines ?? '').split(/\r?\n/);
  const out = new Set();
  for (const raw of input) {
    if (typeof raw !== 'string') continue;
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const dom = extractDomain(line);
    if (dom && !isJunk(dom)) out.add(dom);
  }
  return [...out].sort();
}
