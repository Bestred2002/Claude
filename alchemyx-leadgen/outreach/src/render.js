/**
 * Rendering minimale di template testuali con placeholder {{chiave}}.
 * Formato template: prima riga "Subject: ...", poi una riga vuota, poi il corpo.
 */

/**
 * Sostituisce tutti i {{placeholder}} in un testo.
 * I placeholder non presenti in `vars` vengono sostituiti con stringa vuota.
 * @param {string} text
 * @param {Record<string, unknown>} vars
 * @returns {string}
 */
function interpolate(text, vars) {
  return text.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_m, key) => {
    const value = vars[key];
    return value === undefined || value === null ? '' : String(value);
  });
}

/**
 * Renderizza un template completo.
 * @param {string} tplText - testo del template ("Subject: ..." + riga vuota + corpo)
 * @param {Record<string, unknown>} vars - variabili per i placeholder
 * @returns {{subject: string, body: string}}
 */
export function renderTemplate(tplText, vars = {}) {
  const rendered = interpolate(tplText, vars);
  const lines = rendered.split(/\r?\n/);

  let subject = '';
  let bodyStart = 0;

  if (lines.length > 0 && /^subject\s*:/i.test(lines[0])) {
    subject = lines[0].replace(/^subject\s*:\s*/i, '').trim();
    // Il corpo inizia dopo la prima riga vuota successiva al Subject.
    bodyStart = 1;
    while (bodyStart < lines.length && lines[bodyStart].trim() !== '') {
      bodyStart += 1;
    }
    while (bodyStart < lines.length && lines[bodyStart].trim() === '') {
      bodyStart += 1;
    }
  }

  const body = lines.slice(bodyStart).join('\n').replace(/\s+$/, '') + '\n';
  return { subject, body };
}

export default { renderTemplate };
