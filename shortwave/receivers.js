// Ricevitori SDR pubblici in ITALIA + piano bande di ascolto.
// I ricevitori sono veri apparati radio collegati a Internet: si
// sintonizzano dal browser e si ascolta in diretta (solo ascolto).
//
// caps: capacità di banda del ricevitore
//   'hf'  = onde lunghe/medie/corte (0–30 MHz)
//   'vhf' = VHF/UHF (50 MHz e oltre)
//
// type: come costruire il deep-link di sintonia
//   'websdr'    -> ?tune=<kHz><modo>
//   'kiwi'      -> ?f=<kHz><modo>
//   'openwebrx' -> #freq=<Hz>,mod=<modo>   (fm->nfm, fmw->wfm)

window.RECEIVERS = [
  {
    id: 'torino', name: 'WebSDR Torino', city: 'Torino', region: 'Piemonte',
    type: 'websdr', url: 'http://websdr.ham.radio.it/',
    caps: ['hf'], coverage: 'Onde corte', stable: true,
    notes: 'Storico WebSDR italiano (I1YRB). Affidabile: ottimo per iniziare.'
  },
  {
    id: 'viverone', name: 'KiwiSDR Viverone', city: 'Viverone (BI)', region: 'Piemonte',
    type: 'kiwi', url: 'http://21262.proxy.kiwisdr.com/',
    caps: ['hf'], coverage: '0–30 MHz',
    notes: 'KiwiSDR2 con copertura completa onde lunghe/medie/corte, GPS.'
  },
  {
    id: 'cagliari', name: 'KiwiSDR Cagliari', city: 'Cagliari', region: 'Sardegna',
    type: 'kiwi', url: 'http://sergiocorda.synology.me:28073/',
    caps: ['hf'], coverage: '0–30 MHz',
    notes: 'Buon punto d’ascolto al centro del Mediterraneo.'
  },
  {
    id: 'bergamo', name: 'KiwiSDR Bergamo', city: 'Bergamo', region: 'Lombardia',
    type: 'kiwi', url: 'http://www.dxcluster.world:8073/',
    caps: ['hf'], coverage: '0–30 MHz', unverified: true,
    notes: 'Ricevitore di Franco (IW2KPL) in Lombardia. Disponibilità non verificata.'
  },
  {
    id: 'milano', name: 'KiwiSDR Milano', city: 'Milano', region: 'Lombardia',
    type: 'kiwi', url: 'http://milano1602.dyndns.org:8073/',
    caps: ['hf'], coverage: '0–30 MHz', unverified: true,
    notes: 'Ricevitore nell’area di Milano. Disponibilità non verificata.'
  },
  {
    id: 'laspezia', name: 'OpenWebRX La Spezia', city: 'La Spezia', region: 'Liguria',
    type: 'openwebrx', url: 'http://185.9.148.140:19999/',
    caps: ['hf', 'vhf'], coverage: 'HF + VHF/UHF', unverified: true,
    notes: 'OpenWebRX di Monte Viseggi (ARI La Spezia): copre HF e bande VHF/UHF. Le singole bande dipendono dai profili attivi sul ricevitore. Disponibilità non verificata.'
  }
];

// Mostra SOLO alcune categorie (id o array). null = mostra tutte.
// "Preferite" resta la prima scheda; le altre bande (che funzionano da
// remoto) restano disponibili.
window.SHOW_ONLY = null;

// Piano bande, da ~100 kHz a ~1,3 GHz. freq in kHz.
// rxBand: 'hf' (usa il ricevitore HF scelto) | 'high' (usa ricevitore VHF/UHF)
// modi: am · lsb · usb · cw · fm (FM stretta) · fmw (FM larga = WFM)
window.BANDS = [
  {
    id: 'fav', label: 'Preferite', icon: '★', rxBand: 'high',
    sub: 'Lista Lombardia (link/ponti/DMR), tenuta come riferimento. Sono frequenze locali e in parte digitali (DMR): da remoto quasi sempre NON danno audio (servirebbe un ricevitore in zona). Nel frattempo le altre schede funzionano subito, gratis e senza comprare nulla.',
    items: [
      { divider: '76–79 MHz' },
      { name: '76.700', freq: 76700, mode: 'fm', hint: 'Bergamo' },
      { name: '77.750', freq: 77750, mode: 'fm', hint: 'Bergamo' },
      { name: '78.075', freq: 78075, mode: 'fm', hint: 'Bergamo' },
      { name: '78.250', freq: 78250, mode: 'fm', hint: 'Bergamo' },
      { name: '79.025', freq: 79025, mode: 'fm', hint: 'Bergamo/Milano' },
      { name: '73.062', freq: 73062, mode: 'fm', hint: 'Brescia Tx' },
      { name: '73.862', freq: 73862, mode: 'fm', hint: 'Brescia Rx' },
      { name: '78.725', freq: 78725, mode: 'fm', hint: 'Brescia' },
      { name: '76.850', freq: 76850, mode: 'fm', hint: 'Milano' },
      { name: '77.925', freq: 77925, mode: 'fm', hint: 'Milano' },
      { name: '78.000', freq: 78000, mode: 'fm', hint: 'Milano' },
      { name: '78.275', freq: 78275, mode: 'fm', hint: 'Milano' },
      { name: '78.325', freq: 78325, mode: 'fm', hint: 'Milano' },
      { name: '78.500', freq: 78500, mode: 'fm', hint: 'Milano' },
      { name: '78.675', freq: 78675, mode: 'fm', hint: 'Milano' },
      { name: '79.075', freq: 79075, mode: 'fm', hint: 'Milano' },
      { name: '79.100', freq: 79100, mode: 'fm', hint: 'Milano' },
      { name: '78.700', freq: 78700, mode: 'fm', hint: 'Monza' },
      { divider: '425–426 MHz · link UHF' },
      { name: '425.000', freq: 425000, mode: 'fm', hint: 'Monza' },
      { name: '425.050', freq: 425050, mode: 'fm', hint: 'Monza' },
      { name: '425.075', freq: 425075, mode: 'fm', hint: 'Milano' },
      { name: '425.125', freq: 425125, mode: 'fm', hint: 'Milano' },
      { name: '425.150', freq: 425150, mode: 'fm', hint: 'Monza' },
      { name: '425.225', freq: 425225, mode: 'fm', hint: 'Milano' },
      { name: '425.300', freq: 425300, mode: 'fm', hint: 'Abbiategrasso' },
      { name: '425.450', freq: 425450, mode: 'fm', hint: 'Milano' },
      { name: '425.600', freq: 425600, mode: 'fm', hint: 'Monza' },
      { name: '425.675', freq: 425675, mode: 'fm', hint: 'Monza' },
      { name: '425.750', freq: 425750, mode: 'fm', hint: 'Milano' },
      { name: '425.950', freq: 425950, mode: 'fm', hint: 'Bergamo' },
      { name: '425.975', freq: 425975, mode: 'fm', hint: 'Abbiategrasso' },
      { name: '426.000', freq: 426000, mode: 'fm', hint: 'Milano' },
      { name: '426.200', freq: 426200, mode: 'fm', hint: 'Bergamo' },
      { name: '426.325', freq: 426325, mode: 'fm', hint: 'Bergamo' },
      { name: '426.475', freq: 426475, mode: 'fm', hint: 'Abbiategrasso' },
      { name: '426.525', freq: 426525, mode: 'fm', hint: 'Abbiategrasso' },
      { name: '426.700', freq: 426700, mode: 'fm', hint: 'Abbiategrasso' },
      { name: '426.800', freq: 426800, mode: 'fm', hint: 'Bergamo' },
      { name: '426.900', freq: 426900, mode: 'fm', hint: 'Bergamo' },
      { divider: 'VHF 157–168 MHz' },
      { name: '157.300', freq: 157300, mode: 'fm', hint: 'Milano' },
      { name: '157.325', freq: 157325, mode: 'fm', hint: 'Milano' },
      { name: '157.400', freq: 157400, mode: 'fm', hint: 'Milano' },
      { name: '158.900', freq: 158900, mode: 'fm', hint: 'Milano' },
      { name: '160.175', freq: 160175, mode: 'fm', hint: 'Milano' },
      { name: '160.225', freq: 160225, mode: 'fm', hint: 'Milano' },
      { name: '160.400', freq: 160400, mode: 'fm', hint: 'Milano' },
      { name: '160.625', freq: 160625, mode: 'fm', hint: 'Vignate' },
      { name: '161.475', freq: 161475, mode: 'fm', hint: 'Cernusco SN' },
      { name: '168.450', freq: 168450, mode: 'fm', hint: 'Pioltello' },
      { divider: 'DMO / NFM (range)' },
      { name: 'VHF DMO', freq: 148000, mode: 'fm', hint: '148–174 · digitale (DMR)' },
      { name: 'UHF DMO', freq: 380000, mode: 'fm', hint: '380–400 · digitale (DMR)' },
      { name: 'NFM 404', freq: 404000, mode: 'fm', hint: '404–405.9 · MCPC' },
      { name: 'NFM 406', freq: 406200, mode: 'fm', hint: '406.2–410 · MCPC' },
      { name: 'NFM +10', freq: 410000, mode: 'fm', hint: '410–427' }
    ]
  },
  {
    id: 'mw', label: 'Onde medie', icon: '🌙', rxBand: 'hf',
    sub: 'Onde lunghe e medie in AM. Meglio con un ricevitore KiwiSDR.',
    items: [
      { name: 'OL 198',  freq: 198,  mode: 'am', hint: 'Onde lunghe' },
      { name: 'OM 999',  freq: 999,  mode: 'am', hint: 'Onde medie' },
      { name: 'OM 1530', freq: 1530, mode: 'am' }
    ]
  },
  {
    id: 'broadcast', label: 'Emittenti OC', icon: '📻', rxBand: 'hf',
    sub: 'Emittenti internazionali onde corte (AM)',
    items: [
      { name: '49 m', freq: 6000,  mode: 'am' },
      { name: '41 m', freq: 7300,  mode: 'am' },
      { name: '31 m', freq: 9600,  mode: 'am' },
      { name: '25 m', freq: 11700, mode: 'am' },
      { name: '19 m', freq: 15300, mode: 'am' }
    ]
  },
  {
    id: 'hams', label: 'Radioamatori', icon: '🎙️', rxBand: 'hf',
    sub: 'Voce radioamatori in onde corte (SSB)',
    items: [
      { name: '80 m', freq: 3700,  mode: 'lsb', hint: 'Sera' },
      { name: '40 m', freq: 7100,  mode: 'lsb', hint: 'Sera · molto attiva' },
      { name: '20 m', freq: 14200, mode: 'usb', hint: 'Giorno · mondo' },
      { name: '15 m', freq: 21300, mode: 'usb' },
      { name: '10 m', freq: 28400, mode: 'usb' }
    ]
  },
  {
    id: 'cw', label: 'Morse', icon: '· –', rxBand: 'hf',
    sub: 'Codice Morse (CW): fischi ritmici',
    items: [
      { name: '40 m', freq: 7030,  mode: 'cw' },
      { name: '20 m', freq: 14030, mode: 'cw' }
    ]
  },
  {
    id: '6m', label: '6 m · 50', icon: '📡', rxBand: 'high',
    sub: '50 MHz, la "banda magica". Usa il ricevitore VHF/UHF.',
    items: [
      { name: '6 m voce', freq: 50150, mode: 'usb', hint: 'SSB · aperture DX' },
      { name: '6 m FM',   freq: 51510, mode: 'fm' }
    ]
  },
  {
    id: 'fm', label: 'FM 88–108', icon: '📶', rxBand: 'high',
    sub: 'Radio commerciali in FM larga (FMW = WFM)',
    items: [
      { name: 'FM 96.0',  freq: 96000,  mode: 'fmw' },
      { name: 'FM 100.0', freq: 100000, mode: 'fmw' },
      { name: 'FM 104.0', freq: 104000, mode: 'fmw' }
    ]
  },
  {
    id: 'air', label: 'Aerei', icon: '✈️', rxBand: 'high',
    sub: 'Banda aeronautica (AM). Attività variabile per zona/orario.',
    items: [
      { name: 'Torre 119',     freq: 119000, mode: 'am' },
      { name: 'Avvicin. 124',  freq: 124000, mode: 'am' },
      { name: 'Area 132',      freq: 132000, mode: 'am' }
    ]
  },
  {
    id: '2m', label: '2 m · 144', icon: '📡', rxBand: 'high',
    sub: 'VHF radioamatori, 2 metri',
    items: [
      { name: '2 m FM',  freq: 145500, mode: 'fm',  hint: 'Chiamata FM' },
      { name: '2 m SSB', freq: 144300, mode: 'usb', hint: 'Voce SSB' }
    ]
  },
  {
    id: '70cm', label: '70 cm · 430', icon: '📡', rxBand: 'high',
    sub: 'UHF radioamatori, 70 cm',
    items: [
      { name: '70 cm FM',  freq: 433500, mode: 'fm' },
      { name: '70 cm SSB', freq: 432200, mode: 'usb' }
    ]
  },
  {
    id: '23cm', label: '23 cm · 1296', icon: '🛰️', rxBand: 'high',
    sub: '1296 MHz (verso 1,3 GHz): raro online, spesso nessun ricevitore.',
    items: [
      { name: '23 cm SSB', freq: 1296200, mode: 'usb', hint: 'Spesso non disponibile' }
    ]
  }
];

// Mappe live per trovare ricevitori che coprano una specifica banda.
window.DIRECTORIES = [
  { name: 'Ricevitori OpenWebRX (VHF/UHF)', url: 'https://www.receiverbook.de/' },
  { name: 'Mappa SDR (tutti i tipi)', url: 'https://rx-tx.info/map-sdr-points' },
  { name: 'Mappa KiwiSDR (Italia)', url: 'http://kiwisdr.com/public/' },
  { name: 'Elenco WebSDR', url: 'http://websdr.org/' }
];
