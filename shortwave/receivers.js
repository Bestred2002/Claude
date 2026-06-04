// Ricevitori SDR pubblici in ITALIA + bande di ascolto.
// I ricevitori sono veri apparati radio collegati a Internet: si
// sintonizzano dal browser e si ascolta in diretta (solo ascolto).
//
// caps: capacità di banda del ricevitore
//   'hf'  = onde corte (0–30 MHz)
//   'vhf' = VHF, inclusi i 50 MHz / 6 metri
//
// type: come costruire il deep-link di sintonia
//   'websdr'    -> ?tune=<kHz><modo>
//   'kiwi'      -> ?f=<kHz><modo>
//   'openwebrx' -> #freq=<Hz>,mod=<modo>   (fm -> nfm)

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
    notes: 'KiwiSDR2 con copertura completa delle onde corte, riferimento GPS.'
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
    caps: ['hf', 'vhf'], coverage: 'HF + VHF (50 MHz / 6 m)', unverified: true,
    notes: 'OpenWebRX di Monte Viseggi (ARI La Spezia): copre anche la VHF e i 6 metri. Disponibilità non verificata.'
  }
];

// Bande organizzate in categorie semplici. freq in kHz.
window.BANDS = [
  {
    id: 'broadcast', label: 'Emittenti', icon: '📻', band: 'hf',
    sub: 'Notiziari e musica da tutto il mondo (AM)',
    items: [
      { name: '49 m', freq: 6000,  mode: 'am' },
      { name: '41 m', freq: 7300,  mode: 'am' },
      { name: '31 m', freq: 9600,  mode: 'am' },
      { name: '25 m', freq: 11700, mode: 'am' },
      { name: '19 m', freq: 15300, mode: 'am' }
    ]
  },
  {
    id: 'hams', label: 'Radioamatori', icon: '🎙️', band: 'hf',
    sub: 'Persone che parlano in diretta (voce SSB)',
    items: [
      { name: '80 m', freq: 3700,  mode: 'lsb', hint: 'Sera' },
      { name: '40 m', freq: 7100,  mode: 'lsb', hint: 'Sera · molto attiva' },
      { name: '20 m', freq: 14200, mode: 'usb', hint: 'Giorno · mondo' },
      { name: '15 m', freq: 21300, mode: 'usb', hint: 'Con sole attivo' },
      { name: '10 m', freq: 28400, mode: 'usb', hint: 'Variabile · DX' }
    ]
  },
  {
    id: 'vhf', label: '6 m / VHF', icon: '📡', band: 'vhf',
    sub: '50 MHz, la "banda magica". Usa il ricevitore di La Spezia',
    items: [
      { name: '6 m voce', freq: 50150, mode: 'usb', hint: 'SSB · aperture DX' },
      { name: '6 m FM',   freq: 51510, mode: 'fm',  hint: 'Chiamata FM' },
      { name: 'VHF bassa', freq: 45000, mode: 'am', hint: '40–50 MHz · spesso vuota' }
    ]
  },
  {
    id: 'cw', label: 'Morse', icon: '· –', band: 'hf',
    sub: 'Codice Morse (CW): fischi ritmici',
    items: [
      { name: '40 m', freq: 7030,  mode: 'cw', hint: 'Tanta attività' },
      { name: '20 m', freq: 14030, mode: 'cw', hint: 'DX di giorno' }
    ]
  }
];

// Mappe live per trovare altri ricevitori sempre aggiornati.
window.DIRECTORIES = [
  { name: 'Mappa KiwiSDR (Italia)', url: 'http://kiwisdr.com/public/' },
  { name: 'Elenco WebSDR', url: 'http://websdr.org/' }
];
