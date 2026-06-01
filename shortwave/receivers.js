// Ricevitori SDR pubblici situati in ITALIA.
// I WebSDR/KiwiSDR sono veri ricevitori radio HF collegati a Internet:
// li sintonizzi dal browser e ascolti l'etere in tempo reale (solo ascolto).
//
// type: 'websdr'  -> deep-link con ?tune=<freqKHz><modo>   (es. ?tune=7100lsb)
//       'kiwi'    -> deep-link con ?f=<freqKHz><modo>       (es. ?f=7100lsb)
//
// NOTA: i KiwiSDR sono gestiti da appassionati e possono andare offline.
// Se un ricevitore non risponde, usa le mappe live nella sezione
// "Trova altri ricevitori" oppure prova il WebSDR di Torino (molto stabile).

window.RECEIVERS = [
  {
    id: 'torino',
    name: 'WebSDR Torino — I1YRB / CSP',
    city: 'Torino', region: 'Piemonte',
    type: 'websdr',
    url: 'http://websdr.ham.radio.it/',
    coverage: 'Onde corte (HF)',
    stable: true,
    notes: 'Storico WebSDR italiano gestito da Roberto Borri (I1YRB). Multi-utente e molto affidabile: ottimo per iniziare.'
  },
  {
    id: 'viverone',
    name: 'KiwiSDR Lago di Viverone — IK1YRA',
    city: 'Viverone (BI)', region: 'Piemonte',
    type: 'kiwi',
    url: 'http://21262.proxy.kiwisdr.com/',
    coverage: '0–30 MHz',
    notes: 'Ricevitore KiwiSDR2 con copertura completa 0–30 MHz e riferimento GPS. Buona posizione nel Nord Italia.'
  },
  {
    id: 'cagliari',
    name: 'KiwiSDR Cagliari',
    city: 'Cagliari', region: 'Sardegna',
    type: 'kiwi',
    url: 'http://sergiocorda.synology.me:28073/',
    coverage: '0–30 MHz',
    notes: 'Punto d’ascolto al centro del Mediterraneo: utile per i collegamenti dal Sud Europa e Nord Africa.'
  },
  {
    id: 'iz6198',
    name: 'KiwiSDR IZ6198SWL',
    city: 'Italia centrale', region: '',
    type: 'kiwi',
    url: 'http://iz6198swl.proxy.kiwisdr.com:8073/',
    coverage: '0–30 MHz',
    notes: 'KiwiSDR gestito da un radioascoltatore (SWL) italiano.'
  },
  {
    id: 'bergamo',
    name: 'KiwiSDR Bergamo — IW2KPL',
    city: 'Bergamo', region: 'Lombardia',
    type: 'kiwi',
    url: 'http://www.dxcluster.world:8073/',
    coverage: '0–30 MHz',
    unverified: true,
    notes: 'Ricevitore di Franco (IW2KPL) con dipolo Windom multibanda, in Lombardia. Disponibilità non verificata: se non risponde, prova un altro ricevitore o le mappe live.'
  },
  {
    id: 'milano',
    name: 'KiwiSDR Milano',
    city: 'Milano', region: 'Lombardia',
    type: 'kiwi',
    url: 'http://milano1602.dyndns.org:8073/',
    coverage: '0–30 MHz',
    unverified: true,
    notes: 'Ricevitore nell’area di Milano. Disponibilità non verificata.'
  }
];

// Mappe/elenchi LIVE per trovare altri ricevitori (sempre aggiornati).
window.DIRECTORIES = [
  { name: 'Mappa KiwiSDR mondiale (filtra l’Italia)', url: 'http://kiwisdr.com/public/',
    desc: 'Mappa di tutti i KiwiSDR attivi adesso. Cerca l’Italia per ricevitori vicini a te.' },
  { name: 'Mappa ricevitori a banda larga', url: 'http://rx.linkfanel.net/',
    desc: 'Mappa alternativa dei KiwiSDR con stato in tempo reale.' },
  { name: 'Elenco WebSDR mondiale', url: 'http://websdr.org/',
    desc: 'Lista ufficiale dei WebSDR. In fondo trovi anche quelli italiani.' },
  { name: 'A.I.R. — Ricevitori SDR online', url: 'https://www.air-radio.it/index.php/2017/07/14/ricevitori-sdr-online/',
    desc: 'Pagina dell’Associazione Italiana Radioascolto con ricevitori e risorse.' }
];

// Piano bande "sintonia rapida". Frequenze in kHz.
// Sotto i 10 MHz i radioamatori usano LSB, sopra usano USB.
window.BANDS = [
  {
    group: 'Radioamatori — voce (SSB)',
    hint: 'Qui senti i radioamatori parlare. Di sera funzionano bene 80m e 40m; di giorno 20m e superiori.',
    items: [
      { label: '80 m',  freq: 3700,  mode: 'lsb', desc: 'Sera/notte · contatti regionali (Italia/Europa)' },
      { label: '40 m',  freq: 7100,  mode: 'lsb', desc: 'La banda più attiva in Europa, soprattutto di sera' },
      { label: '20 m',  freq: 14200, mode: 'usb', desc: 'DX mondiale, ottima di giorno' },
      { label: '17 m',  freq: 18130, mode: 'usb', desc: 'Banda tranquilla, buona con propagazione attiva' },
      { label: '15 m',  freq: 21300, mode: 'usb', desc: 'Si apre con il Sole attivo, contatti lontani' },
      { label: '10 m',  freq: 28400, mode: 'usb', desc: 'Molto variabile: quando si apre, DX facile' }
    ]
  },
  {
    group: 'Telegrafia — Morse (CW)',
    hint: 'I "fischi" ritmici sono codice Morse. Imposta il modo CW per sentirli come toni puliti.',
    items: [
      { label: '40 m CW', freq: 7030,  mode: 'cw', desc: 'Tanta attività CW, anche stazioni lente per principianti' },
      { label: '20 m CW', freq: 14030, mode: 'cw', desc: 'CW DX mondiale di giorno' }
    ]
  },
  {
    group: 'Emittenti onde corte (AM)',
    hint: 'Stazioni broadcast internazionali (notiziari, musica, religiose). Modo AM.',
    items: [
      { label: '49 m', freq: 6000,  mode: 'am', desc: 'Banda broadcast serale, molto popolata' },
      { label: '41 m', freq: 7300,  mode: 'am', desc: 'Emittenti internazionali, sera' },
      { label: '31 m', freq: 9600,  mode: 'am', desc: 'Una delle bande broadcast più usate' },
      { label: '25 m', freq: 11700, mode: 'am', desc: 'Buona di giorno' },
      { label: '19 m', freq: 15300, mode: 'am', desc: 'Diurna, segnali da lontano' }
    ]
  },
  {
    group: 'Segnali particolari',
    hint: 'Stazioni curiose per capire la propagazione e l’ora esatta.',
    items: [
      { label: 'Ora 5 MHz',  freq: 5000,  mode: 'am', desc: 'Stazioni campione di tempo/frequenza' },
      { label: 'Ora 10 MHz', freq: 10000, mode: 'am', desc: 'Segnale orario, utile per testare la ricezione' },
      { label: 'Aeronautica', freq: 8951, mode: 'usb', desc: 'Comunicazioni aeree a lungo raggio (oceaniche)' }
    ]
  }
];
