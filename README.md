# myTV

PWA per guardare TV in streaming e ascoltare radio italiane. Funziona su iPhone, iPad e Mac usando Safari (o qualsiasi browser moderno). Su iOS/iPadOS si può aggiungere alla schermata Home (Condividi → "Aggiungi a Home") per averla come app indipendente; su Mac si può "Aggiungi al Dock" da Safari.

## Caratteristiche

- Caricamento lista canali tramite URL (JSON in stile myTIVÙ oppure file M3U/M3U8).
- Player con controlli nativi, play/pausa, ricarica stream, fullscreen.
- Orientamento verticale e orizzontale.
- Cross-platform: iPhone, iPad, Mac, anche Android/desktop.
- Sezione Radio integrata:
  - RTL 102.5
  - Radio 105
  - Radio Subasio
  - Radio Subasio +
  - RDS
  - RDS Relax
  - Radio Sportiva
  - Radio 24
- Preferiti e ricerca.
- Funziona offline come app-shell (le liste/canali devono essere online).

## Formato lista canali

JSON:
```json
[
  { "name": "Rai 1", "stream": "https://.../rai1.m3u8", "logo": "https://..." },
  { "name": "Rai 2", "stream": "https://.../rai2.m3u8" }
]
```

Oppure M3U/M3U8:
```
#EXTM3U
#EXTINF:-1 tvg-logo="https://.../rai1.png",Rai 1
https://.../rai1.m3u8
```

## Avvio locale

Servire la cartella con qualsiasi web server statico, ad esempio:

```
python3 -m http.server 8080
```

Poi aprire `http://localhost:8080` in Safari/Chrome. Per il funzionamento del Service Worker e di alcune API serve HTTPS o `localhost`.

## Note sugli stream

Le URL dei flussi radio incluse sono indicative e possono cambiare nel tempo. Se una stazione non parte, l'emittente potrebbe aver cambiato endpoint. Stessa cosa vale per i canali TV: le liste myTIVÙ vanno aggiornate periodicamente perché i token/URL scadono.

## Browser e CORS

Gli stream HLS richiedono header CORS appropriati dal server di origine. Alcuni canali potrebbero richiedere DRM (Widevine/FairPlay) e non sono riproducibili con il player HTML5 standard.
