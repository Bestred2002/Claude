# myTV per Apple Watch (Ultra)

App nativa watchOS in SwiftUI per riprodurre Radio e TV italiane
direttamente dal polso. Niente companion iOS: la lista TV viene
scaricata direttamente dall'orologio dalle stesse fonti del sito web
(Free-TV/IPTV + iptv-org).

## Cosa fa

- **Radio** italiane principali (RTL 102.5, Radio 105, Subasio, Subasio+,
  RDS, RDS Relax, Radio Sportiva, Radio 24) — lista curata in `Catalog.swift`.
- **TV** italiana scaricata in tempo reale: Rai 1/2/3, Rete 4, Canale 5,
  Italia 1, La7, TV8, Nove, Real Time, Sky TG24, Rai News 24, TGCom 24,
  Cine34, Focus, e tutta la coda lunga di iptv-org. Pull-to-refresh per
  ricaricare.
- Player `AVPlayer` con audio in background (compatibile AirPods + speaker
  Watch Ultra). Vista "In onda" con play/pausa/stop.

## Setup (una sola volta, ~10 minuti)

Requisiti: Mac con Xcode installato (gratis dal Mac App Store), Apple ID,
Apple Watch Ultra abbinato a un iPhone.

### Opzione A — Automatica (consigliata)

```bash
cd apple-watch
chmod +x setup.sh
./setup.sh
```

Lo script installa Homebrew se manca, installa xcodegen, genera il
`myTVWatch.xcodeproj`, e apre Xcode automaticamente.

### Opzione B — Manuale

```bash
brew install xcodegen
cd apple-watch
xcodegen
open myTVWatch.xcodeproj
```

## In Xcode

1. Pannello laterale → clicca **myTVWatch** (livello progetto in alto).
2. **Signing & Capabilities** → Team → seleziona il tuo Apple ID
   (`Bestred2002 (Personal Team)` o il tuo Developer Team).
3. Collega iPhone via cavo USB (sblocca e abilita Developer Mode da
   `Impostazioni → Privacy e sicurezza → Modalità sviluppatore`).
4. Barra in alto di Xcode → destination → seleziona
   **"Apple Watch via <nome iPhone>"**.
5. **Cmd+R**. L'app si compila, si firma con il tuo Apple ID, viene
   installata sull'iPhone e poi trasferita al Watch (1-2 min).
6. Sull'iPhone → `Impostazioni → Generali → Gestione VPN e dispositivi`
   → tocca il tuo Apple ID → **Fidati**.
7. Apri l'app **myTV** sul Watch.

## Durata della firma

- **Apple ID gratis**: l'app dura **7 giorni**, poi va ricompilata da
  Xcode (collega iPhone, Cmd+R).
- **Apple Developer Program ($99/anno)**: dura **1 anno** e puoi
  distribuire l'app via TestFlight ad altri utenti.

## Struttura del codice

```
apple-watch/
├── README.md                       (questo file)
├── project.yml                     (config xcodegen)
├── setup.sh                        (genera + apre xcodeproj)
└── myTVWatch Watch App/
    ├── Info.plist                  (Background Audio, App Transport Security)
    ├── myTVWatchApp.swift          (entry point @main)
    ├── ContentView.swift           (UI: tab Radio/TV, lista, now playing)
    ├── PlayerStore.swift           (AVPlayer + cache UserDefaults)
    └── Catalog.swift               (radio statica + fetch Free-TV/IPTV async)
```

## Aggiornamenti futuri

Quando vuoi aggiungere/cambiare radio, edita `Catalog.swift` →
`Catalog.radio` e ricompila. Per la TV non serve toccare nulla: la lista
si aggiorna automaticamente da Free-TV/IPTV ad ogni avvio.

Per ricompilare basta riaprire `myTVWatch.xcodeproj` e Cmd+R.
