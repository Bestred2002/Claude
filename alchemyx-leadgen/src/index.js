#!/usr/bin/env node
/**
 * index.js — orchestratore CLI di Alchemyx Lead-Gen.
 *
 * Flusso per ogni dominio (implementato in ./pipeline.js, condiviso con il
 * server locale server/server.js):
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

import { readFile, access } from 'node:fs/promises';
import path from 'node:path';
import { PKG_ROOT, runDetection, writeLeads } from './pipeline.js';

/** Verifica se un file esiste (senza lanciare). */
async function fileExists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
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
    .filter((l) => l && !l.startsWith('#'));

  if (targets.length === 0) {
    console.error('[!] Nessun dominio valido nel file di input.');
    return;
  }

  console.error(`Alchemyx Lead-Gen — ${targets.length} domini da analizzare (input: ${inputPath})\n`);

  // --- Elaborazione sequenziale con pausa educata (vedi pipeline.js) ---
  const leads = await runDetection(targets, {
    onProgress({ index, total, domain, lead }) {
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
      console.error(`[${index + 1}/${total}] ${domain} → ${esito}, ${nEmails} email`);
    },
  });

  // --- Scrittura output (leads.json + leads.csv, già ordinati) ---
  const { jsonPath, csvPath } = await writeLeads(leads);

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
