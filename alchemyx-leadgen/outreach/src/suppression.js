/**
 * Gestione della lista di soppressione (opt-out).
 * suppression.txt contiene una voce per riga: un indirizzo email completo
 * (sopprime solo quell'indirizzo) oppure un dominio (sopprime tutti gli
 * indirizzi @dominio). Righe vuote e commenti (#) vengono ignorati.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_FILE = path.join(__dirname, '..', 'suppression.txt');

const suppressedEmails = new Set();
const suppressedDomains = new Set();

/**
 * Carica (o ricarica) la lista di soppressione.
 * @param {string} [filePath] - percorso di suppression.txt (default: quello del modulo)
 * @returns {{emails: number, domains: number}} conteggi caricati
 */
export function loadSuppression(filePath = DEFAULT_FILE) {
  suppressedEmails.clear();
  suppressedDomains.clear();

  let raw = '';
  try {
    raw = readFileSync(filePath, 'utf8');
  } catch {
    // File assente: lista vuota, nessuna soppressione.
    return { emails: 0, domains: 0 };
  }

  for (const line of raw.split(/\r?\n/)) {
    const entry = line.trim().toLowerCase();
    if (entry === '' || entry.startsWith('#')) continue;
    if (entry.includes('@')) {
      suppressedEmails.add(entry);
    } else {
      suppressedDomains.add(entry);
    }
  }
  return { emails: suppressedEmails.size, domains: suppressedDomains.size };
}

/**
 * Verifica se un indirizzo email è soppresso (per email esatta o per dominio).
 * @param {string} email
 * @returns {boolean}
 */
export function isSuppressed(email) {
  if (!email || typeof email !== 'string') return false;
  const normalized = email.trim().toLowerCase();
  if (suppressedEmails.has(normalized)) return true;
  const at = normalized.lastIndexOf('@');
  if (at === -1) return false;
  const domain = normalized.slice(at + 1);
  return suppressedDomains.has(domain);
}

// Caricamento automatico al primo import (comodo per l'uso standard).
loadSuppression();

export default { loadSuppression, isSuppressed };
