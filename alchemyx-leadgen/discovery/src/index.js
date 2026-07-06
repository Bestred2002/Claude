#!/usr/bin/env node
/**
 * index.js — CLI del modulo discovery Alchemyx.
 *
 * Unisce le fonti gratuite (file raw, OSM/Nominatim, link Ad Library) in una
 * lista deduplicata di domini aziendali italiani: output/domains.txt.
 *
 * Uso:
 *   node src/index.js                                # solo input/raw.example.txt
 *   node src/index.js --raw input/miofile.txt
 *   node src/index.js --osm "ristorante" "Bologna"
 *   node src/index.js --adlib "ecommerce abbigliamento"
 *   node src/index.js --overpass "ristoranti" "Segrate"
 *   node src/index.js --overpass "palestre" "Milano" --provincia --limit 100
 *
 * Zero dipendenze: solo built-in di Node 18+.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import process from 'node:process';

import { normalizeList } from './normalize.js';
import { metaAdLibraryUrl, googleAdsTransparencyUrl } from './adlibrary.js';
import { searchOsm } from './osm.js';
import { businessesInArea } from './overpass.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const DEFAULT_RAW = path.join(ROOT, 'input', 'raw.example.txt');
const OUTPUT_FILE = path.join(ROOT, 'output', 'domains.txt');
const CATEGORIES_FILE = path.join(ROOT, 'categories.json');

function parseArgs(argv) {
  const opts = { raw: DEFAULT_RAW, osm: [], adlib: [], overpass: [], provincia: false, limit: 0 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--raw') {
      opts.raw = argv[++i] ?? opts.raw;
    } else if (a === '--overpass') {
      const category = argv[++i];
      const place = argv[++i];
      if (!category || !place) {
        console.error('Uso: --overpass "categoria" "luogo" [--provincia] [--limit N]');
        process.exit(1);
      }
      opts.overpass.push({ category, place });
    } else if (a === '--provincia') {
      opts.provincia = true;
    } else if (a === '--limit') {
      const n = Number.parseInt(argv[++i], 10);
      if (!Number.isFinite(n) || n <= 0) {
        console.error('Uso: --limit N (numero intero positivo)');
        process.exit(1);
      }
      opts.limit = n;
    } else if (a === '--osm') {
      const category = argv[++i];
      const city = argv[++i];
      if (!category || !city) {
        console.error('Uso: --osm "categoria" "città"');
        process.exit(1);
      }
      opts.osm.push({ category, city });
    } else if (a === '--adlib') {
      const kw = argv[++i];
      if (!kw) {
        console.error('Uso: --adlib "keyword"');
        process.exit(1);
      }
      opts.adlib.push(kw);
    } else if (a === '--help' || a === '-h') {
      console.log(
        'Alchemyx discovery — fonti gratuite di domini aziendali IT\n\n' +
        '  --raw <file>                  file di input grezzo (default: input/raw.example.txt)\n' +
        '  --osm "categoria" "città"     ricerca POI su OSM/Nominatim (ripetibile)\n' +
        '  --adlib "keyword"             stampa i link Ad Library / Transparency da aprire a mano\n' +
        '  --overpass "categoria" "luogo" ricerca geografica via Overpass API (ripetibile)\n' +
        '      --provincia               cerca in tutta la provincia/città metropolitana\n' +
        '      --limit N                 massimo N attività con sito per ricerca\n\n' +
        'Le categorie Overpass sono in categories.json (chiave o etichetta, es.\n' +
        '"ristoranti", "palestre", "agenzie_immobiliari"). Esempi:\n' +
        '  node src/index.js --overpass "ristoranti" "Segrate"\n' +
        '  node src/index.js --overpass "Fitness / benessere / beauty" "Bergamo" --provincia\n'
      );
      process.exit(0);
    } else {
      console.error(`Argomento sconosciuto: ${a} (usa --help)`);
      process.exit(1);
    }
  }
  return opts;
}

/** Slug filesystem-safe per i nomi dei CSV sidecar (es. "ristoranti-segrate"). */
function slugify(...parts) {
  return parts
    .join(' ')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // rimuove gli accenti
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'ricerca';
}

/** Escapa un campo CSV (virgolette raddoppiate, quote se necessario). */
function csvField(v) {
  const s = String(v ?? '');
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * Trova la chiave di categoria in categories.json a partire da chiave o
 * etichetta (case-insensitive). Ritorna null se non trovata.
 */
function findCategoryKey(categories, wanted) {
  const w = String(wanted ?? '').trim().toLowerCase();
  for (const [key, entry] of Object.entries(categories)) {
    if (key.toLowerCase() === w) return key;
    if (String(entry?.label ?? '').toLowerCase() === w) return key;
  }
  return null;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const domains = new Set();
  const sources = []; // { label, count }

  // 1) File raw (URL, domini nudi, "Azienda - sito.it", ...).
  const rawPath = path.resolve(process.cwd(), opts.raw);
  try {
    const text = await readFile(rawPath, 'utf8');
    const found = normalizeList(text.split(/\r?\n/));
    for (const d of found) domains.add(d);
    sources.push({ label: `raw: ${path.relative(process.cwd(), rawPath) || rawPath}`, count: found.length });
  } catch (err) {
    console.error(`[raw] impossibile leggere ${rawPath}: ${err.message}`);
    sources.push({ label: `raw: ${rawPath} (non letto)`, count: 0 });
  }

  // 2) OSM / Nominatim (gratuito, rate-limited a 1 req/s dentro searchOsm).
  for (const { category, city } of opts.osm) {
    const results = await searchOsm(category, city);
    const found = normalizeList(results.map((r) => r.domain).filter(Boolean));
    for (const d of found) domains.add(d);
    sources.push({
      label: `osm: "${category}" @ ${city} (${results.length} POI)`,
      count: found.length,
    });
    console.log(`[osm] "${category}" a ${city}: ${results.length} POI, ${found.length} con sito web.`);
  }

  // 3) Overpass API: ricerca geografica per categoria + comune/provincia.
  if (opts.overpass.length > 0) {
    // 3a) Carica la tassonomia delle categorie.
    let categories = {};
    try {
      categories = JSON.parse(await readFile(CATEGORIES_FILE, 'utf8'));
    } catch (err) {
      console.error(`[overpass] impossibile leggere categories.json: ${err.message}`);
      process.exit(0);
    }

    // 3b) In modalità Overpass i domini vengono UNITI a quelli già presenti
    //     in output/domains.txt (mai persi tra una ricerca e l'altra).
    try {
      const existing = await readFile(OUTPUT_FILE, 'utf8');
      for (const d of normalizeList(existing.split(/\r?\n/))) domains.add(d);
    } catch {
      /* file non ancora creato: ok */
    }

    for (const { category, place } of opts.overpass) {
      const key = findCategoryKey(categories, category);
      if (!key) {
        console.log(`[overpass] categoria "${category}" non trovata. Categorie disponibili:`);
        for (const [k, entry] of Object.entries(categories)) {
          console.log(`  - ${k.padEnd(24)} ${entry.label}`);
        }
        process.exit(0);
      }

      const level = opts.provincia ? 'provincia' : 'citta';
      const scopeLabel = opts.provincia ? 'provincia' : 'comune';
      console.log(`[overpass] risolvo l'area "${place}" (${scopeLabel}) via Nominatim...`);

      const out = await businessesInArea({ category: key, place, level }, categories);
      if (!out.ok) {
        // Messaggio amichevole, mai stack trace; exit 0 in ogni caso.
        if (/area non trovata/i.test(out.error || '')) {
          console.log(`[overpass] area non trovata per "${place}": controlla il nome (es. "Segrate", "Bologna").`);
        } else if (/rate limit|429/i.test(out.error || '')) {
          console.log('[overpass] Overpass è al limite di richieste (servizio pubblico gratuito): riprova tra qualche minuto.');
        } else if (/timeout/i.test(out.error || '')) {
          console.log('[overpass] timeout lato Overpass: prova un\'area più piccola (comune invece di provincia).');
        } else {
          console.log(`[overpass] rete assente o servizio non raggiungibile (${out.error}). Riprova più tardi.`);
        }
        sources.push({ label: `overpass: "${category}" @ ${place} (errore)`, count: 0 });
        continue;
      }

      const areaName = out.area?.displayName?.split(',').slice(0, 2).join(',') || place;
      let results = out.results;
      if (opts.limit > 0 && results.length > opts.limit) results = results.slice(0, opts.limit);

      const found = normalizeList(results.map((r) => r.domain));
      for (const d of found) domains.add(d);
      console.log(`[overpass] Trovate ${out.total} attività, ${results.length} con sito web in ${areaName}.`);
      sources.push({ label: `overpass: "${key}" @ ${place} (${out.total} attività)`, count: found.length });

      // 3c) CSV sidecar di riferimento: name,domain,lat,lon.
      const csvPath = path.join(ROOT, 'output', `overpass-${slugify(key, place)}.csv`);
      const csv = ['name,domain,lat,lon']
        .concat(results.map((r) => [r.name, r.domain, r.lat ?? '', r.lon ?? ''].map(csvField).join(',')))
        .join('\n') + '\n';
      await mkdir(path.dirname(csvPath), { recursive: true });
      await writeFile(csvPath, csv, 'utf8');
      console.log(`[overpass] dettagli salvati in ${path.relative(process.cwd(), csvPath)}`);
    }
  }

  // 4) Ad Library / Transparency: SOLO link da aprire manualmente (ToS).
  for (const kw of opts.adlib) {
    console.log(`\n[adlib] Link da aprire MANUALMENTE per "${kw}" (nessun fetch automatico, rispetto ToS):`);
    console.log(`  Meta Ad Library (IT):       ${metaAdLibraryUrl(kw)}`);
    console.log(`  Google Ads Transparency:    ${googleAdsTransparencyUrl(kw)}`);
    console.log(`  (nel Transparency Center digita "${kw}" nella barra di ricerca della pagina)`);
    sources.push({ label: `adlib: "${kw}" (solo link manuali)`, count: 0 });
  }

  // 5) Scrivi output/domains.txt.
  const sorted = [...domains].sort();
  const header = [
    '# generato da Alchemyx discovery',
    `# data: ${new Date().toISOString()}`,
    `# fonti: ${sources.map((s) => s.label).join(' | ') || 'nessuna'}`,
    '',
  ].join('\n');
  await mkdir(path.dirname(OUTPUT_FILE), { recursive: true });
  await writeFile(OUTPUT_FILE, header + sorted.join('\n') + (sorted.length ? '\n' : ''), 'utf8');

  // 6) Riepilogo.
  console.log('\n=== Riepilogo Alchemyx discovery ===');
  for (const s of sources) console.log(`  - ${s.label}: ${s.count} domini`);
  console.log(`Fonti consultate: ${sources.length} | Domini unici: ${sorted.length} | Output: ${path.relative(process.cwd(), OUTPUT_FILE)}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(`Errore inatteso: ${err.message}`);
  process.exit(1);
});
