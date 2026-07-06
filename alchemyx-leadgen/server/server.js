#!/usr/bin/env node
/**
 * server.js — mini server locale Alchemyx LEAD GEN (zero dipendenze, node:http).
 *
 * Sostituisce `python3 -m http.server` nei launcher e abilita l'esperienza
 * "un clic": dalla mappa (discovery/map/) si lancia il rilevatore ADS
 * direttamente dal browser e la dashboard si aggiorna da sola.
 *
 * Responsabilità:
 *   1. FILE STATICI: serve l'intera cartella alchemyx-leadgen
 *      (/dashboard/, /discovery/map/, /output/leads.json, ...).
 *   2. API DI RILEVAMENTO (job in background, uno alla volta):
 *        POST /api/detect    {domains:[...]} → avvia un job, torna {jobId,...}
 *        GET  /api/status    → stato/progresso del job corrente o ultimo
 *        GET  /api/leads     → output/leads.json (no-cache), [] se assente
 *        POST /api/discover  → (best-effort) Overpass lato server
 *        GET  /api/ping      → {app:"alchemyx-leadgen"} (marker per i launcher)
 *   3. Porta libera a partire da 8347 (come i launcher); stampa l'URL.
 *
 * Avvio:  node server/server.js   (da qualunque directory: la radice del
 *         progetto è risolta rispetto a questo file)
 *
 * Il server non crasha mai per una richiesta malformata: risponde 400/404/500
 * con un JSON di errore e resta in piedi.
 */

import http from 'node:http';
import path from 'node:path';
import { readFile, stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { runDetection, mergeLeads, readLeads, writeLeads } from '../src/pipeline.js';
import { businessesInArea } from '../discovery/src/overpass.js';

// Radice del progetto = cartella sopra server/ (indipendente dalla CWD).
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const START_PORT = 8347; // stessa base dei launcher
const MAX_PORT = 8399;
const MAX_DOMAINS_PER_JOB = 500; // paracadute anti-batch-monstre

// Content-Type per le estensioni che il progetto serve davvero.
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.icns': 'image/x-icns',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.eml': 'message/rfc822',
};

// ---------------------------------------------------------------------------
// Stato del job di rilevamento (uno alla volta, in memoria).
// ---------------------------------------------------------------------------
let job = null; // { jobId, running, done, total, current, lastDomain, leads, advertisers, actionable, startedAt, finishedAt, error }
let jobCounter = 0;

function jobStatus() {
  if (!job) {
    return { running: false, jobId: null, done: 0, total: 0, current: null, lastDomain: null, advertisers: 0, actionable: 0, finishedAt: null };
  }
  return {
    running: job.running,
    jobId: job.jobId,
    done: job.done,
    total: job.total,
    current: job.current,
    lastDomain: job.lastDomain,
    advertisers: job.advertisers,
    actionable: job.actionable,
    startedAt: job.startedAt,
    finishedAt: job.finishedAt,
    error: job.error || null,
  };
}

/** Avvia il job in background (fire-and-forget, mai lascia rejection scoperte). */
function startJob(domains) {
  jobCounter += 1;
  job = {
    jobId: `job-${Date.now()}-${jobCounter}`,
    running: true,
    done: 0,
    total: domains.length,
    current: domains[0] || null,
    lastDomain: null,
    advertisers: 0,
    actionable: 0,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    error: null,
  };
  const thisJob = job;

  (async () => {
    try {
      const leads = await runDetection(domains, {
        onProgress({ index, total, domain, lead }) {
          thisJob.done = index + 1;
          thisJob.lastDomain = domain;
          thisJob.current = index + 1 < total ? domains[index + 1] : null;
          if (lead.advertises) thisJob.advertisers += 1;
          if (lead.emails && lead.hasMx) thisJob.actionable += 1;
          console.log(`[detect ${thisJob.jobId}] ${thisJob.done}/${total} ${domain} → adScore=${lead.adScore}`);
        },
      });

      // Accumula tra una ricerca e l'altra: merge con l'output esistente.
      const existing = await readLeads();
      const merged = mergeLeads(existing, leads);
      await writeLeads(merged);
      console.log(`[detect ${thisJob.jobId}] completato: ${leads.length} analizzati, ${merged.length} lead totali in output/`);
    } catch (err) {
      thisJob.error = (err && err.message) || String(err);
      console.error(`[detect ${thisJob.jobId}] errore: ${thisJob.error}`);
    } finally {
      thisJob.running = false;
      thisJob.current = null;
      thisJob.finishedAt = new Date().toISOString();
    }
  })();

  return thisJob;
}

// ---------------------------------------------------------------------------
// Helper HTTP.
// ---------------------------------------------------------------------------
function sendJson(res, status, obj, extraHeaders = {}) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    ...extraHeaders,
  });
  res.end(body);
}

/** Legge il body della richiesta e lo parsa come JSON (max ~2MB). */
function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > 2_000_000) {
        reject(new Error('body troppo grande (max 2MB)'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => {
      try {
        const text = Buffer.concat(chunks).toString('utf8');
        resolve(text ? JSON.parse(text) : {});
      } catch {
        reject(new Error('JSON non valido nel body'));
      }
    });
    req.on('error', reject);
  });
}

/** Normalizza/valida la lista domini di POST /api/detect. */
function sanitizeDomains(input) {
  if (!Array.isArray(input)) return null;
  const seen = new Set();
  const out = [];
  for (const item of input) {
    if (typeof item !== 'string') continue;
    const s = item.trim();
    if (!s || s.startsWith('#') || s.length > 300) continue;
    if (seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
}

// ---------------------------------------------------------------------------
// File statici (con protezione path-traversal).
// ---------------------------------------------------------------------------
async function serveStatic(req, res, pathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return sendJson(res, 400, { error: 'percorso malformato' });
  }

  // Normalizza e vincola dentro ROOT: niente `..` che scappa dalla radice.
  const rel = path.normalize(decoded).replace(/^([/\\])+/, '');
  let filePath = path.resolve(ROOT, rel);
  if (filePath !== ROOT && !filePath.startsWith(ROOT + path.sep)) {
    return sendJson(res, 403, { error: 'accesso negato' });
  }

  try {
    let info = await stat(filePath);
    if (info.isDirectory()) {
      // Directory senza slash finale → redirect (i path relativi delle pagine
      // funzionano solo con lo slash).
      if (!pathname.endsWith('/')) {
        res.writeHead(301, { Location: pathname + '/' });
        return res.end();
      }
      filePath = path.join(filePath, 'index.html');
      info = await stat(filePath); // se manca index.html → 404 dal catch
    }

    const ext = path.extname(filePath).toLowerCase();
    const headers = {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Content-Length': info.size,
    };
    // I dati vivi non vanno mai cachati (la dashboard li ricarica spesso).
    if (rel.startsWith('output' + path.sep) || ext === '.json' || ext === '.csv') {
      headers['Cache-Control'] = 'no-store, no-cache, must-revalidate';
    }
    res.writeHead(200, headers);
    if (req.method === 'HEAD') return res.end();

    const stream = createReadStream(filePath);
    stream.on('error', () => {
      // File sparito/illeggibile a metà: chiudi senza far crashare il server.
      if (!res.headersSent) sendJson(res, 500, { error: 'errore di lettura file' });
      else res.destroy();
    });
    stream.pipe(res);
  } catch {
    sendJson(res, 404, { error: `non trovato: ${pathname}` });
  }
}

// ---------------------------------------------------------------------------
// Router.
// ---------------------------------------------------------------------------
async function handleRequest(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const pathname = url.pathname;

  // ---- API ----
  if (pathname === '/api/ping') {
    return sendJson(res, 200, { app: 'alchemyx-leadgen', ok: true });
  }

  if (pathname === '/api/status') {
    return sendJson(res, 200, jobStatus());
  }

  if (pathname === '/api/leads') {
    const leads = await readLeads();
    return sendJson(res, 200, leads);
  }

  if (pathname === '/api/detect') {
    if (req.method !== 'POST') {
      return sendJson(res, 405, { error: 'usa POST con body JSON {domains:[...]}' });
    }
    let body;
    try {
      body = await readJsonBody(req);
    } catch (err) {
      return sendJson(res, 400, { error: err.message });
    }
    const domains = sanitizeDomains(body?.domains);
    if (!domains) {
      return sendJson(res, 400, { error: 'body atteso: {"domains": ["esempio.it", ...]}' });
    }
    if (domains.length === 0) {
      return sendJson(res, 400, { error: 'nessun dominio valido nella lista' });
    }
    if (domains.length > MAX_DOMAINS_PER_JOB) {
      return sendJson(res, 400, { error: `troppi domini (max ${MAX_DOMAINS_PER_JOB} per job)` });
    }

    // Un solo job alla volta: se ce n'è uno in corso, ritorna il suo stato.
    if (job && job.running) {
      return sendJson(res, 200, {
        jobId: job.jobId,
        total: job.total,
        status: 'running',
        alreadyRunning: true,
        done: job.done,
      });
    }

    const started = startJob(domains);
    return sendJson(res, 200, { jobId: started.jobId, total: started.total, status: 'running' });
  }

  if (pathname === '/api/discover') {
    if (req.method !== 'POST') {
      return sendJson(res, 405, { error: 'usa POST con body JSON {category, place | bbox}' });
    }
    let body;
    try {
      body = await readJsonBody(req);
    } catch (err) {
      return sendJson(res, 400, { error: err.message });
    }
    try {
      const categoriesJson = JSON.parse(
        await readFile(path.join(ROOT, 'discovery', 'categories.json'), 'utf8')
      );
      const result = await businessesInArea(
        {
          category: String(body?.category || ''),
          place: body?.place,
          level: body?.provincia ? 'provincia' : 'citta',
          bbox: Array.isArray(body?.bbox) ? body.bbox : undefined,
        },
        categoriesJson
      );
      if (!result.ok) {
        return sendJson(res, 502, { error: result.error, domains: [], results: [] });
      }
      return sendJson(res, 200, {
        domains: result.results.map((r) => r.domain),
        results: result.results,
        total: result.total,
        area: result.area,
      });
    } catch (err) {
      return sendJson(res, 500, { error: (err && err.message) || String(err) });
    }
  }

  if (pathname.startsWith('/api/')) {
    return sendJson(res, 404, { error: `API sconosciuta: ${pathname}` });
  }

  // ---- File statici ----
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return sendJson(res, 405, { error: 'metodo non consentito' });
  }
  if (pathname === '/') {
    res.writeHead(302, { Location: '/dashboard/' });
    return res.end();
  }
  return serveStatic(req, res, pathname);
}

// ---------------------------------------------------------------------------
// Avvio con ricerca porta libera (EADDRINUSE → porta successiva).
// ---------------------------------------------------------------------------
const server = http.createServer((req, res) => {
  handleRequest(req, res).catch((err) => {
    // Ultima rete di sicurezza: mai far cadere il processo per una richiesta.
    console.error(`[server] errore richiesta ${req.method} ${req.url}: ${(err && err.stack) || err}`);
    try {
      if (!res.headersSent) sendJson(res, 500, { error: 'errore interno del server' });
      else res.destroy();
    } catch {
      /* socket già chiuso */
    }
  });
});

server.on('listening', () => {
  // Da qui in poi il retry-su-porta non serve più: eventuali errori
  // runtime del server vengono solo loggati.
  server.removeAllListeners('error');
  server.on('error', (err) => console.error(`[server] errore: ${(err && err.message) || err}`));
  const port = server.address().port;
  // URL su stdout: i launcher (e l'utente) leggono da qui.
  console.log(`Alchemyx LEAD GEN — server locale attivo`);
  console.log(`Dashboard:  http://localhost:${port}/dashboard/`);
  console.log(`Mappa:      http://localhost:${port}/discovery/map/`);
  console.log(`(radice servita: ${ROOT})`);
});

function listen(port) {
  if (port > MAX_PORT) {
    console.error(`[server] nessuna porta libera trovata (${START_PORT}-${MAX_PORT}).`);
    process.exit(1);
  }
  server.once('error', (err) => {
    if (err && err.code === 'EADDRINUSE') {
      listen(port + 1); // porta occupata: prova la successiva
    } else {
      console.error(`[server] errore di avvio: ${(err && err.message) || err}`);
      process.exit(1);
    }
  });
  server.listen(port);
}

listen(Number(process.env.PORT) || START_PORT);
