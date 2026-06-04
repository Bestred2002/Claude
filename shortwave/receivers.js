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

// Piano bande, da ~100 kHz a ~1,3 GHz. freq in kHz.
// rxBand: 'hf' (usa il ricevitore HF scelto) | 'high' (usa ricevitore VHF/UHF)
// modi: am · lsb · usb · cw · fm (FM stretta) · fmw (FM larga = WFM)
window.BANDS = [
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
  { name: 'Mappa KiwiSDR (Italia)', url: 'http://kiwisdr.com/public/' },
  { name: 'Elenco WebSDR', url: 'http://websdr.org/' }
];
