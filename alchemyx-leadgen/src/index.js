#!/usr/bin/env node
/**
 * index.js — orchestratore CLI di Alchemyx Lead-Gen.
 *
 * Flusso per ogni dominio:
 *   1. fetch homepage (+ /contatti, /contact, /privacy per le email)
 *   2. rilevamento tag pubblicitari (Meta Pixel / Google Ads / GTM / GA4)
 *   3. estrazione email
 *   4. verifica record MX del dominio
 *   5. record lead → output/leads.json + output/leads.csv
 *
 * Uso:  node src/index.js [file-domini]
 *       default: input/domains.txt (fallback: input/domains.example.txt)
 *
 * Esce SEMPRE con codice 0: gli errori dei singoli domini sono riportati
 * nel record (reachable=false) senza far fallire il batch.
 */

import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchPage, politeDelay } from './fetch.js';
import { detectAds, adScore } from './detect.js';
import { extractEmails, verifyMx, emailDomain } from './emails.js';

// Radice del pacchetto (cartella sopra src/): così i percorsi di default
// funzionano da qualunque directory venga lanciato lo script.
const PKG_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Pausa tra un dominio e l'altro: siamo ospiti, non un DDoS.
const DELAY_MS = 1200;

// Pagine extra da tentare (best-effort) per trovare email di contatto.
const EXTRA_PATHS = ['/contatti', '/contact', '/privacy'];

/** Verifica se un file esiste (senza lanciare). */
async function fileExists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

/**
 * Normalizza una riga di input in { domain, url }.
 * - "esempio.it"              → https://esempio.it
 * - "http://www.esempio.it/x" → resta com'è (URL completo)
 */
function normalizeTarget(line) {
  const raw = line.trim();
  if (/^https?:\/\//i.test(raw)) {
    // URL completo: lo teniamo così com'è, il dominio lo ricaviamo dall'URL.
    const u = new URL(raw);
    return { domain: u.hostname.replace(/^www\./, ''), url: raw };
  }
  // Dominio "nudo": togliamo eventuale path residuo e forziamo https.
  const bare = raw.replace(/^\/+/, '').split(/[/?#]/)[0].replace(/^www\./, '');
  return { domain: bare, url: `https://${bare}` };
}

/** Quota un campo CSV se contiene virgole, virgolette o a-capo. */
function csvField(value) {
  const s = value === null || value === undefined ? '' : String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replaceAll('"', '""')}"`;
  }
  return s;
}

/** Serializza i lead in CSV con header, nell'ordine di colonne richiesto. */
function toCsv(leads) {
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

/** Elabora un singolo target e ritorna il record lead (non lancia mai). */
async function processTarget({ domain, url }) {
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

async function main() {
  // --- Input: argv[2] o default, con fallback sull'esempio ---
  let inputPath = process.argv[2]
    ? path.resolve(process.cwd(), process.argv[2])
    : path.join(PKG_ROOT, 'input', 'domains.txt');

  if (!(await fileExists(inputPath))) {
    const fallback = path.join(PKG_ROOT, 'input', 'domains.example.txt');
    console.error(
      `[!] File di input non trovato: ${inputPath}\n[!] Uso il file di esempio: ${fallback}`
    );
    inputPath = fallback;
    if (!(await fileExists(inputPath))) {
      console.error('[!] Nemmeno il file di esempio esiste. Nulla da fare.');
      return; // exit 0 comunque
    }
  }

  // --- Parsing: una riga = un dominio; ignora vuote e commenti (#) ---
  const raw = await readFile(inputPath, 'utf8');
  const targets = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'))
    .map(normalizeTarget);

  if (targets.length === 0) {
    console.error('[!] Nessun dominio valido nel file di input.');
    return;
  }

  console.error(`Alchemyx Lead-Gen — ${targets.length} domini da analizzare (input: ${inputPath})\n`);

  // --- Elaborazione sequenziale con pausa educata ---
  const leads = [];
  for (let i = 0; i < targets.length; i++) {
    const t = targets[i];
    const lead = await processTarget(t);
    leads.push(lead);

    // Riga di progresso "live" su stderr.
    const nEmails = lead.emails ? lead.emails.split(', ').length : 0;
    let esito;
    if (!lead.reachable) {
      esito = 'irraggiungibile ✗';
    } else if (lead.advertises) {
      const canali = [lead.metaPixel && 'Meta', lead.googleAds && 'Google'].filter(Boolean).join('+');
      esito = `ADS ✓ (${canali}) score=${lead.adScore}`;
    } else {
      esito = `no ads (score=${lead.adScore})`;
    }
    console.error(`[${i + 1}/${targets.length}] ${t.domain} → ${esito}, ${nEmails} email`);

    // Pausa tra un target e l'altro (non dopo l'ultimo).
    if (i < targets.length - 1) await politeDelay(DELAY_MS);
  }

  // --- Ordinamento: adScore desc, poi chi fa advertising prima ---
  leads.sort((a, b) => b.adScore - a.adScore || Number(b.advertises) - Number(a.advertises));

  // --- Scrittura output ---
  const outDir = path.join(PKG_ROOT, 'output');
  await mkdir(outDir, { recursive: true });
  const jsonPath = path.join(outDir, 'leads.json');
  const csvPath = path.join(outDir, 'leads.csv');
  await writeFile(jsonPath, JSON.stringify(leads, null, 2) + '\n', 'utf8');
  await writeFile(csvPath, toCsv(leads), 'utf8');

  // --- Riepilogo su stdout ---
  const advertisers = leads.filter((l) => l.advertises).length;
  const actionable = leads.filter((l) => l.emails && l.hasMx).length;
  console.log('\n===== RIEPILOGO ALCHEMYX =====');
  console.log(`Domini analizzati:            ${leads.length}`);
  console.log(`Fanno advertising (lead!):    ${advertisers}`);
  console.log(`Con email + MX (azionabili):  ${actionable}`);
  console.log(`Output JSON: ${jsonPath}`);
  console.log(`Output CSV:  ${csvPath}`);
}

// Mai crashare: qualunque errore top-level viene loggato e usciamo con 0.
main()
  .catch((err) => {
    console.error(`[!] Errore fatale (gestito): ${(err && err.stack) || err}`);
  })
  .finally(() => {
    process.exitCode = 0;
  });
