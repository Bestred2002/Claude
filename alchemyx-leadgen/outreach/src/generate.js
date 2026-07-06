#!/usr/bin/env node
/**
 * Alchemyx Outreach — generatore di BOZZE email (nessun invio).
 *
 * Legge i lead qualificati (leads.json prodotto dal modulo detector),
 * filtra quelli idonei (advertises, email presente, MX valido, non soppressi),
 * renderizza il template giusto per canale pubblicitario e scrive:
 *   - output/drafts.json  (array di bozze)
 *   - output/eml/<dominio>.eml  (una bozza RFC822 per lead)
 *
 * Uso: node src/generate.js [percorso/leads.json]
 * Default: ../output/leads.json (output del modulo detector).
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { renderTemplate } from './render.js';
import { loadSuppression, isSuppressed } from './suppression.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MODULE_ROOT = path.join(__dirname, '..');
const TEMPLATES_DIR = path.join(MODULE_ROOT, 'templates');
const OUTPUT_DIR = path.join(MODULE_ROOT, 'output');
const EML_DIR = path.join(OUTPUT_DIR, 'eml');
const DEFAULT_LEADS = path.join(MODULE_ROOT, '..', 'output', 'leads.json');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Deriva un nome azienda leggibile dal dominio: strip TLD, split su . e -, Title Case. */
function companyNameFromDomain(domain) {
  const host = String(domain || '')
    .toLowerCase()
    .replace(/^www\./, '');
  const parts = host.split('.');
  if (parts.length > 1) parts.pop(); // rimuove il TLD
  const words = parts
    .join(' ')
    .split(/[.\-\s]+/)
    .filter(Boolean);
  if (words.length === 0) return domain || '';
  return words
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/** Sceglie template e canale in base ai segnali pubblicitari del lead. */
function pickTemplate(lead) {
  if (lead.metaPixel && lead.googleAds) {
    return { file: 'intro_generic.txt', canale: 'Meta e Google' };
  }
  if (lead.metaPixel) {
    return { file: 'intro_meta.txt', canale: 'Meta' };
  }
  if (lead.googleAds) {
    return { file: 'intro_google.txt', canale: 'Google' };
  }
  return { file: 'intro_generic.txt', canale: 'online' };
}

/** Codifica il Subject in RFC 2047 (Base64 UTF-8) se contiene caratteri non ASCII. */
function encodeHeaderValue(value) {
  if (/^[\x20-\x7e]*$/.test(value)) return value;
  return `=?UTF-8?B?${Buffer.from(value, 'utf8').toString('base64')}?=`;
}

/** Costruisce la stringa .eml RFC822 (solo bozza: niente invio). */
function buildEml({ to, subject, body, config }) {
  const headers = [
    `From: ${config.mittente_nome} <${config.mittente_email}>`,
    `To: <${to}>`,
    `Subject: ${encodeHeaderValue(subject)}`,
    `Date: ${new Date().toUTCString().replace('GMT', '+0000')}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=utf-8',
    'Content-Transfer-Encoding: 8bit',
    `List-Unsubscribe: <${config.unsubscribe_url}>, <mailto:${config.mittente_email}?subject=unsubscribe>`,
    'List-Unsubscribe-Post: List-Unsubscribe=One-Click',
  ];
  // Righe email con terminatore CRLF come da RFC 5322.
  return headers.join('\r\n') + '\r\n\r\n' + body.replace(/\r?\n/g, '\r\n');
}

/** Nome file sicuro derivato dal dominio. */
function safeFileName(domain) {
  return String(domain).replace(/[^a-z0-9.\-_]/gi, '_');
}

// ---------------------------------------------------------------------------
// Fixture (per smoke test quando leads.json non esiste)
// ---------------------------------------------------------------------------

const FIXTURE_LEADS = [
  {
    domain: 'esempio-moda.it',
    url: 'https://esempio-moda.it',
    reachable: true,
    advertises: true,
    adScore: 7,
    metaPixel: true,
    metaPixelId: '123456789012345',
    googleAds: false,
    googleAdsId: '',
    gtm: true,
    ga4: true,
    signals: 'meta pixel, gtm, ga4',
    emails: 'info@esempio-moda.it',
    primaryEmail: 'info@esempio-moda.it',
    hasMx: true,
    checkedAt: new Date().toISOString(),
  },
  {
    domain: 'officina-verdi.it',
    url: 'https://officina-verdi.it',
    reachable: true,
    advertises: true,
    adScore: 5,
    metaPixel: false,
    metaPixelId: '',
    googleAds: true,
    googleAdsId: 'AW-1234567890',
    gtm: false,
    ga4: true,
    signals: 'google ads, ga4',
    emails: 'contatti@officina-verdi.it',
    primaryEmail: 'contatti@officina-verdi.it',
    hasMx: true,
    checkedAt: new Date().toISOString(),
  },
];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const leadsPath = process.argv[2]
    ? path.resolve(process.argv[2])
    : DEFAULT_LEADS;

  // 1) Carica lead (o crea fixture se il file manca).
  let leads;
  if (existsSync(leadsPath)) {
    try {
      leads = JSON.parse(readFileSync(leadsPath, 'utf8'));
    } catch (err) {
      console.error(`Errore: impossibile leggere/parsare ${leadsPath}: ${err.message}`);
      leads = [];
    }
  } else {
    console.log(`Avviso: ${leadsPath} non trovato. Uso una fixture di ${FIXTURE_LEADS.length} lead di esempio per lo smoke test.`);
    leads = FIXTURE_LEADS;
  }
  if (!Array.isArray(leads)) {
    console.error('Errore: il file dei lead non contiene un array. Nessuna bozza generata.');
    leads = [];
  }

  // 2) Carica configurazione e lista di soppressione.
  const config = JSON.parse(readFileSync(path.join(MODULE_ROOT, 'config.json'), 'utf8'));
  const supStats = loadSuppression();

  // 3) Pre-carica i template.
  const templates = {};
  for (const file of ['intro_meta.txt', 'intro_google.txt', 'intro_generic.txt']) {
    templates[file] = readFileSync(path.join(TEMPLATES_DIR, file), 'utf8');
  }

  // 4) Filtra e genera.
  mkdirSync(EML_DIR, { recursive: true });

  const drafts = [];
  const skipped = { nonAdvertises: 0, noEmail: 0, noMx: 0, suppressed: 0 };

  for (const lead of leads) {
    if (lead.advertises !== true) {
      skipped.nonAdvertises += 1;
      continue;
    }
    const to = (lead.primaryEmail || '').trim();
    if (to === '') {
      skipped.noEmail += 1;
      continue;
    }
    if (lead.hasMx !== true) {
      skipped.noMx += 1;
      continue;
    }
    if (isSuppressed(to)) {
      skipped.suppressed += 1;
      continue;
    }

    const { file, canale } = pickTemplate(lead);
    const vars = {
      azienda_target: companyNameFromDomain(lead.domain),
      dominio: lead.domain,
      canale_ads: canale,
      mittente_nome: config.mittente_nome,
      azienda: config.azienda,
      firma: config.firma,
      unsubscribe_url: config.unsubscribe_url,
      indirizzo_postale: config.indirizzo_postale,
    };
    const { subject, body } = renderTemplate(templates[file], vars);

    const draft = {
      to,
      subject,
      body,
      leadDomain: lead.domain,
      canale,
      adScore: lead.adScore ?? 0,
    };
    drafts.push(draft);

    const eml = buildEml({ to, subject, body, config });
    writeFileSync(path.join(EML_DIR, `${safeFileName(lead.domain)}.eml`), eml, 'utf8');
  }

  // 5) Scrivi drafts.json e stampa il riepilogo.
  const draftsPath = path.join(OUTPUT_DIR, 'drafts.json');
  writeFileSync(draftsPath, JSON.stringify(drafts, null, 2) + '\n', 'utf8');

  const totalSkipped =
    skipped.nonAdvertises + skipped.noEmail + skipped.noMx + skipped.suppressed;

  console.log('--- Alchemyx Outreach: riepilogo ---');
  console.log(`Lead totali:           ${leads.length}`);
  console.log(`Bozze generate:        ${drafts.length}`);
  console.log(`Scartati:              ${totalSkipped}`);
  console.log(`  - non advertizza:    ${skipped.nonAdvertises}`);
  console.log(`  - senza email:       ${skipped.noEmail}`);
  console.log(`  - senza MX:          ${skipped.noMx}`);
  console.log(`  - in soppressione:   ${skipped.suppressed}`);
  console.log(`Lista soppressione:    ${supStats.emails} email, ${supStats.domains} domini`);
  console.log(`Output JSON:           ${draftsPath}`);
  console.log(`Output .eml:           ${EML_DIR}${path.sep}<dominio>.eml (${drafts.length} file)`);
  console.log('Nota: sono BOZZE, nessuna email è stata inviata.');
}

try {
  main();
} catch (err) {
  console.error(`Errore inatteso: ${err.message}`);
}
process.exitCode = 0;
