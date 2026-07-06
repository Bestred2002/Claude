/**
 * fetch.js — helper HTTP "educato" (polite fetch).
 *
 * Usa SOLO built-in di Node 18+: global fetch + AbortController.
 * - Timeout configurabile (default 10s)
 * - User-Agent realistico + Accept-Language it-IT
 * - Segue i redirect (comportamento di default di fetch)
 * - Non lancia MAI eccezioni: ritorna sempre un oggetto risultato
 * - Limita la lettura del body a ~1.5MB per restare veloci
 */

// Limite di lettura del body: ~1.5MB di testo.
const MAX_BODY_CHARS = 1_500_000;

// User-Agent desktop realistico: molti siti servono HTML diverso (o 403) ai bot anonimi.
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

/**
 * Scarica una pagina HTML in modo sicuro.
 * @param {string} url - URL completo (es. https://esempio.it)
 * @param {{timeoutMs?: number}} [opts]
 * @returns {Promise<{ok:boolean,status:number,finalUrl?:string,html?:string,error?:string}>}
 */
export async function fetchPage(url, { timeoutMs = 10000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow', // default di fetch, esplicitato per chiarezza
      headers: {
        'User-Agent': USER_AGENT,
        'Accept':
          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'it-IT,it;q=0.9,en;q=0.5',
      },
    });

    // Leggiamo il testo e tagliamo a MAX_BODY_CHARS: ci interessa solo
    // l'HTML iniziale (tag/pixel stanno quasi sempre in <head> o inizio <body>).
    const text = await res.text();
    const html = text.length > MAX_BODY_CHARS ? text.slice(0, MAX_BODY_CHARS) : text;

    return {
      ok: res.ok,
      status: res.status,
      finalUrl: res.url || url, // URL finale dopo eventuali redirect
      html,
    };
  } catch (err) {
    // Timeout, DNS che non risolve, connessione rifiutata, TLS rotto...
    // Qualsiasi errore diventa un risultato "non ok", mai un'eccezione.
    const reason =
      err && err.name === 'AbortError'
        ? `timeout dopo ${timeoutMs}ms`
        : (err && err.message) || String(err);
    return { ok: false, status: 0, finalUrl: url, html: '', error: reason };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Pausa "educata" tra una richiesta e l'altra (rate limiting da buon cittadino).
 * @param {number} ms - millisecondi di attesa
 * @returns {Promise<void>}
 */
export function politeDelay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
