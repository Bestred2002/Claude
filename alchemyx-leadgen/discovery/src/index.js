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

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const DEFAULT_RAW = path.join(ROOT, 'input', 'raw.example.txt');
const OUTPUT_FILE = path.join(ROOT, 'output', 'domains.txt');

function parseArgs(argv) {
  const opts = { raw: DEFAULT_RAW, osm: [], adlib: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--raw') {
      opts.raw = argv[++i] ?? opts.raw;
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
        '  --raw <file>              file di input grezzo (default: input/raw.example.txt)\n' +
        '  --osm "categoria" "città" ricerca POI su OSM/Nominatim (ripetibile)\n' +
        '  --adlib "keyword"         stampa i link Ad Library / Transparency da aprire a mano\n'
      );
      process.exit(0);
    } else {
      console.error(`Argomento sconosciuto: ${a} (usa --help)`);
      process.exit(1);
    }
  }
  return opts;
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

  // 3) Ad Library / Transparency: SOLO link da aprire manualmente (ToS).
  for (const kw of opts.adlib) {
    console.log(`\n[adlib] Link da aprire MANUALMENTE per "${kw}" (nessun fetch automatico, rispetto ToS):`);
    console.log(`  Meta Ad Library (IT):       ${metaAdLibraryUrl(kw)}`);
    console.log(`  Google Ads Transparency:    ${googleAdsTransparencyUrl(kw)}`);
    console.log(`  (nel Transparency Center digita "${kw}" nella barra di ricerca della pagina)`);
    sources.push({ label: `adlib: "${kw}" (solo link manuali)`, count: 0 });
  }

  // 4) Scrivi output/domains.txt.
  const sorted = [...domains].sort();
  const header = [
    '# generato da Alchemyx discovery',
    `# data: ${new Date().toISOString()}`,
    `# fonti: ${sources.map((s) => s.label).join(' | ') || 'nessuna'}`,
    '',
  ].join('\n');
  await mkdir(path.dirname(OUTPUT_FILE), { recursive: true });
  await writeFile(OUTPUT_FILE, header + sorted.join('\n') + (sorted.length ? '\n' : ''), 'utf8');

  // 5) Riepilogo.
  console.log('\n=== Riepilogo Alchemyx discovery ===');
  for (const s of sources) console.log(`  - ${s.label}: ${s.count} domini`);
  console.log(`Fonti consultate: ${sources.length} | Domini unici: ${sorted.length} | Output: ${path.relative(process.cwd(), OUTPUT_FILE)}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(`Errore inatteso: ${err.message}`);
  process.exit(1);
});
