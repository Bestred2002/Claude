/**
 * detect.js — rilevamento tag pubblicitari nell'HTML di una pagina.
 *
 * Cerca le "impronte" lato client dei principali sistemi di advertising:
 * - Meta Pixel (Facebook/Instagram Ads)
 * - Google Ads (tag di conversione AW-...)
 * e, come segnali più deboli (analytics, non prova di advertising):
 * - Google Tag Manager (GTM-...)
 * - Google Analytics 4 (G-...)
 *
 * Tutto via regex su stringa HTML: zero dipendenze, zero parsing DOM.
 */

/**
 * Analizza l'HTML e ritorna un oggetto di rilevamento.
 * @param {string} html
 * @returns {{metaPixel:boolean, metaPixelId:string|null, googleAds:boolean,
 *            googleAdsId:string|null, gtm:boolean, ga4:boolean,
 *            advertises:boolean, signals:string[]}}
 */
export function detectAds(html) {
  const h = typeof html === 'string' ? html : '';
  const signals = [];

  // ---------- Meta Pixel (Facebook) ----------
  // Segnali: script fbevents.js da connect.facebook.net, oppure chiamate fbq(...)
  const hasFbScript = h.includes('connect.facebook.net') && h.includes('fbevents.js');
  const hasFbq = /fbq\s*\(/.test(h);
  const metaPixel = hasFbScript || hasFbq;

  // Estrazione ID pixel da fbq('init','<cifre>') — tolleriamo apici singoli/doppi e spazi.
  let metaPixelId = null;
  const fbqInit = h.match(/fbq\s*\(\s*['"]init['"]\s*,\s*['"](\d{5,20})['"]/);
  if (fbqInit) metaPixelId = fbqInit[1];

  if (metaPixel) {
    signals.push(
      metaPixelId
        ? `Meta Pixel attivo (id ${metaPixelId})`
        : 'Meta Pixel attivo (fbevents.js/fbq rilevato)'
    );
  }

  // ---------- Google Ads ----------
  // Segnali: ID conversione AW-..., domini di ad-serving Google, vecchie API di conversione.
  const awMatch = h.match(/AW-\d{6,}/); // primo ID AW- trovato
  const hasAdServices = h.includes('googleadservices.com');
  const hasDoubleclickAds = h.includes('googleads.g.doubleclick.net');
  const hasLegacyConv = h.includes('google_conversion_id');
  // gtag('config','AW-...') — tolleriamo apici e spazi
  const gtagAw = /gtag\s*\(\s*['"]config['"]\s*,\s*['"](AW-\d+)['"]/.exec(h);

  const googleAds = Boolean(awMatch || hasAdServices || hasDoubleclickAds || hasLegacyConv || gtagAw);
  const googleAdsId = (gtagAw && gtagAw[1]) || (awMatch && awMatch[0]) || null;

  if (googleAds) {
    const dettagli = [];
    if (googleAdsId) dettagli.push(`id ${googleAdsId}`);
    if (hasAdServices) dettagli.push('googleadservices.com');
    if (hasDoubleclickAds) dettagli.push('doubleclick.net');
    if (hasLegacyConv) dettagli.push('google_conversion_id');
    signals.push(`Google Ads attivo${dettagli.length ? ` (${dettagli.join(', ')})` : ''}`);
  }

  // ---------- Segnali deboli: GTM e GA4 ----------
  // Presenza di analytics/tag manager: utile contesto ma NON prova di advertising.
  const gtmMatch = h.match(/GTM-[A-Z0-9]{4,}/);
  const gtm = Boolean(gtmMatch || h.includes('googletagmanager.com/gtm.js'));
  if (gtm) {
    signals.push(
      gtmMatch
        ? `Google Tag Manager presente (${gtmMatch[0]}) — segnale debole`
        : 'Google Tag Manager presente — segnale debole'
    );
  }

  // GA4: measurement ID G-XXXXXXX oppure gtag('config','G-...')
  const ga4Match =
    h.match(/gtag\s*\(\s*['"]config['"]\s*,\s*['"](G-[A-Z0-9]{4,})['"]/) ||
    h.match(/\bG-[A-Z0-9]{6,}\b/);
  const ga4 = Boolean(ga4Match);
  if (ga4) {
    const id = ga4Match[1] || ga4Match[0];
    signals.push(`Google Analytics 4 presente (${id}) — segnale debole`);
  }

  // advertises = solo prova FORTE di advertising (pixel o tag di conversione).
  const advertises = metaPixel || googleAds;

  return { metaPixel, metaPixelId, googleAds, googleAdsId, gtm, ga4, advertises, signals };
}

/**
 * Punteggio euristico 0-100 di "quanto questo sito investe in advertising".
 * metaPixel=+50, googleAds=+50, gtm=+10, ga4=+5, tetto a 100.
 * @param {ReturnType<typeof detectAds>} detection
 * @returns {number}
 */
export function adScore(detection) {
  let score = 0;
  if (detection.metaPixel) score += 50;
  if (detection.googleAds) score += 50;
  if (detection.gtm) score += 10;
  if (detection.ga4) score += 5;
  return Math.min(score, 100);
}
