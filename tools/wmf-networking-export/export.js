#!/usr/bin/env node
/**
 * Esporta in Excel tutti i contatti della sezione "Networking" di https://wmf.ibrida.io
 *
 * Cosa fa:
 *   1. Apre il sito ed effettua il login con le credenziali fornite
 *   2. Se la password è sbagliata, lo segnala ed esce
 *   3. Va nella sezione networking (gestendo paginazione / scroll infinito)
 *   4. Apre la scheda di ogni contatto e raccoglie TUTTI i campi (incluso LinkedIn)
 *   5. Salva un file Excel: contatti_networking.xlsx
 *
 * Uso (sul TUO computer, dove la rete non e' bloccata):
 *   cd tools/wmf-networking-export
 *   npm install
 *   WMF_USER="fabio@alchemystlab.com" WMF_PASS="LA_TUA_PASSWORD" npm start
 *
 * Opzioni utili:
 *   HEADLESS=false   -> mostra il browser mentre lavora (utile per capire / fare login manuale)
 *   SLOWMO=200       -> rallenta le azioni di 200ms (per osservare)
 *
 * NOTA: i selettori del login e delle schede sono dedotti in modo generico.
 *       Se il login o l'estrazione non funzionano al primo colpo, lancia con
 *       HEADLESS=false e guarda dove si blocca: spesso basta aggiustare un selettore
 *       nelle costanti CONFIG qui sotto.
 */

const { chromium } = require('playwright');
const ExcelJS = require('exceljs');
const path = require('path');

const CONFIG = {
  baseUrl: 'https://wmf.ibrida.io',
  loginPath: '/login',                       // se il login e' altrove, cambia qui
  networkingPath: '/people/networking?back=/',
  user: process.env.WMF_USER || '',
  pass: process.env.WMF_PASS || '',
  headless: process.env.HEADLESS !== 'false',
  slowMo: parseInt(process.env.SLOWMO || '0', 10),
  outFile: path.join(process.cwd(), 'contatti_networking.xlsx'),
  // limita per test: METTI un numero piccolo (es. 3) per provare, 0 = tutti
  maxContacts: parseInt(process.env.MAX || '0', 10),
};

function log(...a) { console.log('[wmf]', ...a); }

async function doLogin(page) {
  log('Apro la pagina di login...');
  // Prova prima la home: spesso reindirizza al login
  await page.goto(CONFIG.baseUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(1500);

  // Trova i campi email e password in modo robusto
  const emailSel = [
    'input[type="email"]',
    'input[name*="email" i]',
    'input[id*="email" i]',
    'input[name="username"]',
    'input[autocomplete="username"]',
  ];
  const passSel = [
    'input[type="password"]',
    'input[name*="pass" i]',
    'input[autocomplete="current-password"]',
  ];

  async function firstVisible(selectors) {
    for (const s of selectors) {
      const el = page.locator(s).first();
      if (await el.count() && await el.isVisible().catch(() => false)) return el;
    }
    return null;
  }

  let email = await firstVisible(emailSel);
  let pass = await firstVisible(passSel);

  // se non trovati, prova ad andare esplicitamente alla pagina di login
  if (!email || !pass) {
    log('Campi non trovati in home, provo', CONFIG.loginPath);
    await page.goto(CONFIG.baseUrl + CONFIG.loginPath, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(1500);
    email = await firstVisible(emailSel);
    pass = await firstVisible(passSel);
  }

  if (!email || !pass) {
    throw new Error('Non trovo i campi email/password. Lancia con HEADLESS=false e controlla la pagina di login (potrebbe esserci un SSO o un pulsante "Accedi" da cliccare prima).');
  }

  log('Inserisco le credenziali...');
  await email.fill(CONFIG.user);
  await pass.fill(CONFIG.pass);

  // pulsante submit
  const submit = page.locator(
    'button[type="submit"], input[type="submit"], button:has-text("Accedi"), button:has-text("Login"), button:has-text("Entra"), button:has-text("Sign in")'
  ).first();

  await Promise.all([
    page.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => {}),
    submit.click().catch(async () => { await pass.press('Enter'); }),
  ]);
  await page.waitForTimeout(2500);

  // Verifica esito: se siamo ancora su una pagina con campo password o c'e' un messaggio di errore -> credenziali sbagliate
  const stillHasPassword = await page.locator('input[type="password"]').first().isVisible().catch(() => false);
  const errorText = await page.locator(
    'text=/credenziali|password.*errat|non valid|invalid|incorrect|sbagliat|errore di accesso/i'
  ).first().innerText().catch(() => '');

  if (stillHasPassword || errorText) {
    throw new Error('LOGIN_FAILED: la password sembra SBAGLIATA o l\'accesso e\' stato rifiutato.' + (errorText ? ' Messaggio dal sito: "' + errorText.trim() + '"' : ''));
  }

  log('Login riuscito. URL attuale:', page.url());
}

// Carica tutti i contatti gestendo "carica altro" / scroll infinito / paginazione
async function loadAllContacts(page) {
  log('Vado nella sezione networking...');
  await page.goto(CONFIG.baseUrl + CONFIG.networkingPath, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2500);

  // tenta scroll infinito ripetuto
  let prevCount = -1, stable = 0;
  for (let i = 0; i < 60 && stable < 3; i++) {
    // clicca eventuali "carica altro" / "load more" / "mostra altri"
    const more = page.locator('button:has-text("altro"), button:has-text("Carica"), button:has-text("more"), button:has-text("Mostra")').first();
    if (await more.count() && await more.isVisible().catch(() => false)) {
      await more.click().catch(() => {});
      await page.waitForTimeout(1500);
    }
    await page.mouse.wheel(0, 20000);
    await page.waitForTimeout(1200);

    const count = await page.locator('a[href*="/people/"], a[href*="networking"], [class*="card"], [class*="contact"], tr').count();
    if (count === prevCount) stable++; else { stable = 0; prevCount = count; }
  }
  log('Lista caricata. Estraggo i link delle schede...');

  // Raccogli i link unici verso le schede dei contatti
  let links = await page.$$eval('a[href]', as =>
    Array.from(new Set(
      as.map(a => a.getAttribute('href'))
        .filter(h => h && /\/people\//i.test(h) && !/networking/i.test(h))
    ))
  );
  // fallback: se non ci sono link a schede, restituisci null per estrazione "inline" dalla lista
  return links;
}

// Estrae tutte le coppie etichetta/valore + link da una pagina-scheda
async function extractCard(page) {
  return await page.evaluate(() => {
    const data = {};

    // 1) tutti i link (in particolare LinkedIn / email / sito)
    const links = Array.from(document.querySelectorAll('a[href]')).map(a => a.href);
    const linkedin = links.find(h => /linkedin\.com/i.test(h)) || '';
    if (linkedin) data['LinkedIn'] = linkedin;
    const mailto = links.find(h => /^mailto:/i.test(h));
    if (mailto) data['Email'] = mailto.replace(/^mailto:/i, '');
    const tel = links.find(h => /^tel:/i.test(h));
    if (tel) data['Telefono'] = tel.replace(/^tel:/i, '');

    // 2) coppie label/value comuni: <dt>/<dd>, righe con label, ecc.
    document.querySelectorAll('dl').forEach(dl => {
      const dts = dl.querySelectorAll('dt'); const dds = dl.querySelectorAll('dd');
      for (let i = 0; i < Math.min(dts.length, dds.length); i++) {
        const k = dts[i].innerText.trim(); const v = dds[i].innerText.trim();
        if (k && v) data[k] = v;
      }
    });

    // 3) pattern "label: valore" e contenitori con classi label/value
    document.querySelectorAll('[class*="field"], [class*="row"], li, tr').forEach(row => {
      const labelEl = row.querySelector('[class*="label"], th, strong, b, .key');
      const valueEl = row.querySelector('[class*="value"], td, .val');
      if (labelEl && valueEl && labelEl !== valueEl) {
        const k = labelEl.innerText.trim().replace(/:$/, '');
        const v = valueEl.innerText.trim();
        if (k && v && k.length < 60 && !(k in data)) data[k] = v;
      }
    });

    // 4) titolo / nome principale
    const h = document.querySelector('h1, h2, [class*="name"], [class*="title"]');
    if (h && h.innerText.trim()) data['Nome'] = data['Nome'] || h.innerText.trim();

    return data;
  });
}

async function main() {
  if (!CONFIG.user || !CONFIG.pass) {
    console.error('\nERRORE: imposta le variabili WMF_USER e WMF_PASS.\nEsempio:\n  WMF_USER="fabio@alchemystlab.com" WMF_PASS="laTuaPassword" npm start\n');
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: CONFIG.headless, slowMo: CONFIG.slowMo });
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 950 } });
  const page = await ctx.newPage();

  try {
    await doLogin(page);
    let links = await loadAllContacts(page);
    if (CONFIG.maxContacts > 0) links = links.slice(0, CONFIG.maxContacts);
    log('Schede trovate:', links.length);

    const rows = [];
    if (links.length === 0) {
      log('Nessun link-scheda trovato: provo a estrarre direttamente dalla lista visibile.');
      const card = await extractCard(page);
      if (Object.keys(card).length) rows.push(card);
    } else {
      for (let i = 0; i < links.length; i++) {
        const url = links[i].startsWith('http') ? links[i] : CONFIG.baseUrl + links[i];
        log(`(${i + 1}/${links.length}) ${url}`);
        try {
          await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
          await page.waitForTimeout(1200);
          const card = await extractCard(page);
          card['_url_scheda'] = url;
          rows.push(card);
        } catch (e) {
          log('  ! errore su questa scheda:', e.message);
          rows.push({ _url_scheda: url, _errore: e.message });
        }
      }
    }

    // Costruisci Excel con colonne = unione di tutte le chiavi trovate
    const allKeys = [];
    for (const r of rows) for (const k of Object.keys(r)) if (!allKeys.includes(k)) allKeys.push(k);
    // metti Nome / Email / LinkedIn davanti se presenti
    const preferred = ['Nome', 'Email', 'Telefono', 'LinkedIn'];
    const ordered = [...preferred.filter(k => allKeys.includes(k)), ...allKeys.filter(k => !preferred.includes(k))];

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Contatti Networking');
    ws.columns = ordered.map(k => ({ header: k, key: k, width: Math.min(40, Math.max(14, k.length + 4)) }));
    ws.getRow(1).font = { bold: true };
    for (const r of rows) ws.addRow(r);

    await wb.xlsx.writeFile(CONFIG.outFile);
    log('FATTO! Salvato:', CONFIG.outFile, '-', rows.length, 'contatti.');
  } catch (e) {
    if (String(e.message).startsWith('LOGIN_FAILED')) {
      console.error('\n========================================');
      console.error('  ' + e.message.replace('LOGIN_FAILED: ', ''));
      console.error('  >> La password e\' probabilmente SBAGLIATA. <<');
      console.error('========================================\n');
    } else {
      console.error('\nERRORE:', e.message, '\n');
    }
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main();
