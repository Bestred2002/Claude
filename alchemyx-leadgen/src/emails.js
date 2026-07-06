/**
 * emails.js — estrazione email dall'HTML + verifica MX del dominio.
 *
 * Solo built-in: regex per l'estrazione, node:dns/promises per gli MX.
 */

import { resolveMx } from 'node:dns/promises';

// Regex email "pratica": abbastanza permissiva da trovare indirizzi reali,
// abbastanza stretta da evitare la maggior parte del rumore.
const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

// Pattern di "finte email" tipiche: nomi di file immagine, placeholder,
// domini di tool/CDN che finiscono nell'HTML ma non sono contatti reali.
const JUNK_PATTERNS = [
  /\.(png|jpe?g|gif|svg|webp|ico|css|js|woff2?)@/i, // es. logo.png@2x
  /@\dx\b/i,                 // retina: @2x, @3x
  /^\d+x\d+@/i,              // dimensioni: 1x1@..., 300x250@...
  /@example\.(com|org|net|it)$/i,
  /^(email|user|nome|test|info)@(email|example|domain|dominio|test|sito)\./i,
  /sentry\.io$/i,            // DSN di Sentry sembrano email
  /sentry(-[a-z]+)?\.[a-z]+$/i,
  /wixpress/i,               // asset Wix
  /@(2x|3x)\./i,
  /^[0-9a-f]{16,}@/i,        // hash lunghi prima della @ (asset con fingerprint)
  /\.(min|bundle|chunk)\./i, // nomi di bundle JS
  /@schema\.org$/i,
  /@sentry\./i,
  /^(no-?reply|donotreply)@/i, // noreply: inutile per il contatto commerciale
];

// Prefissi "business" preferiti: se presenti, li mettiamo in testa alla lista.
const BUSINESS_PREFIXES = [
  'info', 'commerciale', 'vendite', 'sales', 'marketing', 'contatti',
  'contact', 'amministrazione', 'ordini', 'shop', 'hello', 'ciao', 'ufficio',
];

/**
 * Estrae le email da una stringa HTML (testo + link mailto:).
 * Deduplica, minuscole, filtra il rumore, ordina con le business-email prima.
 * @param {string} html
 * @returns {string[]}
 */
export function extractEmails(html) {
  const h = typeof html === 'string' ? html : '';
  const found = new Set();

  // 1) Link mailto: — la fonte più affidabile. Decodifichiamo le entità/percent-encoding.
  const mailtoRe = /mailto:([^"'?\s>]+)/gi;
  let m;
  while ((m = mailtoRe.exec(h)) !== null) {
    let addr = m[1];
    try {
      addr = decodeURIComponent(addr);
    } catch {
      /* percent-encoding malformato: teniamo il valore grezzo */
    }
    const inner = addr.match(EMAIL_RE);
    if (inner) inner.forEach((e) => found.add(e.toLowerCase()));
  }

  // 2) Email nel testo/markup della pagina.
  const inText = h.match(EMAIL_RE) || [];
  inText.forEach((e) => found.add(e.toLowerCase()));

  // 3) Filtro anti-rumore.
  const clean = [...found].filter((email) => {
    if (email.length > 80) return false; // stringhe assurde
    // Il TLD non deve essere puramente numerico o un'estensione di file
    if (/\.(png|jpg|jpeg|gif|svg|webp|js|css|woff2?)$/i.test(email)) return false;
    return !JUNK_PATTERNS.some((re) => re.test(email));
  });

  // 4) Ordinamento: prima gli indirizzi con prefisso "business" (info@, commerciale@...).
  clean.sort((a, b) => {
    const pa = BUSINESS_PREFIXES.includes(a.split('@')[0]) ? 0 : 1;
    const pb = BUSINESS_PREFIXES.includes(b.split('@')[0]) ? 0 : 1;
    return pa - pb || a.localeCompare(b);
  });

  return clean;
}

/**
 * Verifica se un dominio ha record MX (quindi può ricevere email).
 * Non lancia mai: in caso di errore DNS ritorna { hasMx:false, mx:[] }.
 * @param {string} domain - es. "esempio.it"
 * @returns {Promise<{hasMx:boolean, mx:string[]}>}
 */
export async function verifyMx(domain) {
  try {
    const records = await resolveMx(domain);
    const mx = (records || [])
      .sort((a, b) => a.priority - b.priority)
      .map((r) => r.exchange)
      .filter(Boolean);
    return { hasMx: mx.length > 0, mx };
  } catch {
    // ENOTFOUND, ENODATA, timeout DNS... nessun MX utilizzabile.
    return { hasMx: false, mx: [] };
  }
}

/**
 * Estrae il dominio da un indirizzo email ("info@acme.it" → "acme.it").
 * @param {string} email
 * @returns {string}
 */
export function emailDomain(email) {
  const at = String(email).lastIndexOf('@');
  return at === -1 ? '' : String(email).slice(at + 1).toLowerCase();
}

/**
 * "Indovina" il dominio aziendale a partire da una email:
 * come emailDomain, ma toglie l'eventuale sottodominio "www." o "mail.".
 * @param {string} email
 * @returns {string}
 */
export function guessDomain(email) {
  return emailDomain(email).replace(/^(www|mail|posta|smtp)\./, '');
}
