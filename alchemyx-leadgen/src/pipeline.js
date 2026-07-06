/**
 * pipeline.js — orchestrazione riusabile del rilevatore Alchemyx.
 *
 * Unica fonte di verità della logica "dominio → record lead":
 * la usano sia il CLI (src/index.js) sia il server locale (server/server.js).
 *
 * Flusso per ogni dominio (identico allo storico index.js):
 *   1. fetch homepage (+ /contatti, /contact, /privacy per le email)
 *   2. rilevamento tag pubblicitari (Meta Pixel / Google Ads / GTM / GA4)
 *   3. estrazione email
 *   4. verifica record MX del dominio
 *
 * Zero dipendenze: solo built-in di Node 18+.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchPage, politeDelay } from './fetch.js';
import { detectAds, adScore } from './detect.js';
import { extractEmails, verifyMx, emailDomain } from './emails.js';

// Radice del pacchetto (cartella sopra src/): così i percorsi di default
// funzionano da qualunque directory venga lanciato lo script.
export const PKG_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Pausa di default tra un dominio e l'altro: siamo ospiti, non un DDoS.
export const DEFAULT_POLITE_MS = 1200;

// Pagine extra da tentare (best-effort) per trovare email di contatto.
const EXTRA_PATHS = ['/contatti', '/contact', '/privacy'];

/**
 * Normalizza una riga di input in { domain, url }.
 * - "esempio.it"              → https://esempio.it
 * - "http://www.esempio.it/x" → resta com'è (URL completo)
 */
export function normalizeTarget(line) {
  const raw = String(line).trim();
  if (/^https?:\/\//i.test(raw)) {
    // URL completo: lo teniamo così com'è, il dominio lo ricaviamo dall'URL.
    const u = new URL(raw);
    return { domain: u.hostname.replace(/^www\./, ''), url: raw };
  }
  // Dominio "nudo": togliamo eventuale path residuo e forziamo https.
  const bare = raw.replace(/^\/+/, '').split(/[/?#]/)[0].replace(/^www\./, '');
  return { domain: bare, url: `https://${bare}` };
}

/**
 * Analizza UN dominio (o URL completo) e ritorna il record lead.
 * Non lancia mai: i domini irraggiungibili producono comunque un record
 * completo con reachable=false e il motivo in `signals`.
 *
 * @param {string} domainOrUrl es. "esempio.it" oppure "https://esempio.it/x"
 * @returns {Promise<object>} record lead (stessa forma di output/leads.json)
 */
export async function detectDomain(domainOrUrl) {
  const { domain, url } = normalizeTarget(domainOrUrl);

  // Record di base: valori "vuoti" così anche i domini irraggiungibili
  // producono una riga completa in output.
  const lead = {
    domain,
    url,
    reachable: false,
    advertises: false,
    adScore: 0,
    metaPixel: false,
    metaPixelId: '',
    googleAds: false,
    googleAdsId: '',
    gtm: false,
    ga4: false,
    signals: '',
    emails: '',
    primaryEmail: '',
    hasMx: false,
    checkedAt: null,
  };

  try {
    // 1) Homepage
    const home = await fetchPage(url);
    lead.reachable = home.ok;

    let htmlForEmails = home.ok ? home.html : '';

    if (home.ok) {
      // 1b) Pagine extra (contatti/privacy): best-effort, solo per le email.
      const base = home.finalUrl || url;
      for (const extra of EXTRA_PATHS) {
        try {
          const page = await fetchPage(new URL(extra, base).href, { timeoutMs: 8000 });
          if (page.ok && page.html) htmlForEmails += '\n' + page.html;
        } catch {
          /* mai: fetchPage non lancia, ma restiamo paranoici */
        }
      }

      // 2) Rilevamento advertising SOLO sulla homepage (i tag stanno lì).
      const detection = detectAds(home.html);
      lead.metaPixel = detection.metaPixel;
      lead.metaPixelId = detection.metaPixelId || '';
      lead.googleAds = detection.googleAds;
      lead.googleAdsId = detection.googleAdsId || '';
      lead.gtm = detection.gtm;
      lead.ga4 = detection.ga4;
      lead.advertises = detection.advertises;
      lead.adScore = adScore(detection);
      lead.signals = detection.signals.join('; ');
    } else {
      lead.signals = home.error ? `errore fetch: ${home.error}` : `HTTP ${home.status}`;
    }

    // 3) Estrazione email dall'HTML concatenato (homepage + pagine contatti).
    const emails = extractEmails(htmlForEmails);
    lead.emails = emails.join(', ');
    // primaryEmail: prima email il cui dominio combacia col sito, altrimenti la prima.
    const sameDomain = emails.find((e) => emailDomain(e).endsWith(domain));
    lead.primaryEmail = sameDomain || emails[0] || '';

    // 4) Verifica MX del dominio registrabile (mai lancia).
    const mx = await verifyMx(domain);
    lead.hasMx = mx.hasMx;
  } catch (err) {
    // Rete di sicurezza: qualsiasi bug su un dominio non ferma il batch.
    lead.signals = `errore inatteso: ${(err && err.message) || err}`;
  }

  lead.checkedAt = new Date().toISOString();
  return lead;
}

/** Comparatore standard: adScore desc, poi chi fa advertising prima. */
export function sortLeads(leads) {
  return leads.sort(
    (a, b) => b.adScore - a.adScore || Number(b.advertises) - Number(a.advertises)
  );
}

/**
 * Analizza una lista di domini SEQUENZIALMENTE con pausa educata tra uno
 * e l'altro. Dopo ogni dominio invoca onProgress({index,total,domain,lead})
 * (index è 0-based). Ritorna l'array dei lead ordinato per adScore
 * decrescente (stesso ordinamento del CLI).
 *
 * @param {string[]} domains  domini o URL, uno per elemento
 * @param {{onProgress?: Function, politeMs?: number}} [opts]
 * @returns {Promise<object[]>}
 */
export async function runDetection(domains, { onProgress, politeMs = DEFAULT_POLITE_MS } = {}) {
  const list = Array.isArray(domains) ? domains : [];
  const leads = [];

  for (let i = 0; i < list.length; i++) {
    const lead = await detectDomain(list[i]);
    leads.push(lead);

    if (typeof onProgress === 'function') {
      try {
        onProgress({ index: i, total: list.length, domain: lead.domain, lead });
      } catch {
        /* un callback rotto non deve fermare il batch */
      }
    }

    // Pausa tra un target e l'altro (non dopo l'ultimo).
    if (i < list.length - 1) await politeDelay(politeMs);
  }

  return sortLeads(leads);
}

/**
 * Unisce due liste di lead deduplicando per dominio: a parità di dominio
 * vince il record di `incoming` (più recente). Ritorna un NUOVO array
 * ordinato per adScore decrescente.
 *
 * @param {object[]} existing  lead già presenti (es. output/leads.json)
 * @param {object[]} incoming  lead appena rilevati
 * @returns {object[]}
 */
export function mergeLeads(existing, incoming) {
  const byDomain = new Map();
  for (const lead of Array.isArray(existing) ? existing : []) {
    if (lead && lead.domain) byDomain.set(lead.domain, lead);
  }
  for (const lead of Array.isArray(incoming) ? incoming : []) {
    if (lead && lead.domain) byDomain.set(lead.domain, lead);
  }
  return sortLeads([...byDomain.values()]);
}

/** Quota un campo CSV se contiene virgole, virgolette o a-capo. */
function csvField(value) {
  const s = value === null || value === undefined ? '' : String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replaceAll('"', '""')}"`;
  }
  return s;
}

/** Serializza i lead in CSV con header, nell'ordine di colonne storico. */
export function toCsv(leads) {
  const columns = [
    'domain', 'url', 'reachable', 'advertises', 'adScore',
    'metaPixel', 'metaPixelId', 'googleAds', 'googleAdsId',
    'gtm', 'ga4', 'hasMx', 'primaryEmail', 'emails', 'signals', 'checkedAt',
  ];
  const rows = [columns.join(',')];
  for (const lead of leads) {
    rows.push(columns.map((c) => csvField(lead[c])).join(','));
  }
  return rows.join('\n') + '\n';
}

/** Percorsi di output di default (output/leads.json e output/leads.csv). */
export function outputPaths(outDir = path.join(PKG_ROOT, 'output')) {
  return {
    outDir,
    jsonPath: path.join(outDir, 'leads.json'),
    csvPath: path.join(outDir, 'leads.csv'),
  };
}

/**
 * Legge output/leads.json. Ritorna [] se il file manca o è malformato
 * (mai lanciare: un output corrotto non deve rompere server/CLI).
 * @param {string} [outDir]
 * @returns {Promise<object[]>}
 */
export async function readLeads(outDir) {
  const { jsonPath } = outputPaths(outDir);
  try {
    const data = JSON.parse(await readFile(jsonPath, 'utf8'));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

/**
 * Scrive i lead in output/leads.json + output/leads.csv (crea la cartella
 * se manca). Formattazione identica allo storico CLI.
 * @param {object[]} leads
 * @param {string} [outDir]
 * @returns {Promise<{jsonPath: string, csvPath: string}>}
 */
export async function writeLeads(leads, outDir) {
  const { outDir: dir, jsonPath, csvPath } = outputPaths(outDir);
  await mkdir(dir, { recursive: true });
  await writeFile(jsonPath, JSON.stringify(leads, null, 2) + '\n', 'utf8');
  await writeFile(csvPath, toCsv(leads), 'utf8');
  return { jsonPath, csvPath };
}
