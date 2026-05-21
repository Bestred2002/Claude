# myTV per Apple Watch (Ultra)

App nativa watchOS in SwiftUI. Le PWA non girano su watchOS quindi è
necessario un target nativo. Questa cartella contiene i sorgenti Swift
da aggiungere a un progetto Xcode (template "watchOS App").

## Funzionalità

- Lista **Radio** con tutte le emittenti (RTL 102.5, Radio 105, Subasio,
  Subasio +, RDS, RDS Relax, Radio Sportiva, Radio 24) con loghi.
- Lista **TV** con i canali italiani principali con loghi. Gli stream TV
  vengono ricevuti dall'app iPhone tramite `WatchConnectivity` (perché
  richiedono token che scadono e devono restare aggiornati lato phone).
- Player audio (`AVPlayer`) compatibile con AirPods e altoparlante orologio.
- Pagine: scorri tra Radio / TV. Pulsante "waveform" in alto a destra per
  "In riproduzione" → play/pausa/stop.
- Compatibile Apple Watch Ultra (schermo grande, Always-On).

## Setup Xcode

1. Apri Xcode → New Project → **watchOS App** (Swift, SwiftUI).
2. Bundle ID consigliato: `com.mytv.app.watchkitapp`.
3. Sostituisci i file generati con quelli in
   `apple-watch/myTVWatch Watch App/`.
4. In *Signing & Capabilities* aggiungi **Background Modes → Audio,
   AirPlay, and Picture in Picture** così l'audio continua a riprodurre
   in background.
5. Build & Run su Apple Watch Ultra reale (il simulatore non riproduce
   sempre gli stream HLS).

## Pairing con iPhone

Per ricevere la lista canali TV con stream attivi, l'app companion iOS
deve chiamare:

```swift
let payload: [String: Any] = [
  "tv": [
    ["name": "Rai 1", "streamURL": "https://.../rai1.m3u8",
     "logoURL": "https://.../rai1.png"],
    // …
  ]
]
try? WCSession.default.updateApplicationContext(payload)
```

L'orologio salva la lista in `UserDefaults` per la riproduzione offline
del menu (gli stream restano comunque online).
