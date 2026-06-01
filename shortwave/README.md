# Onde Corte · SDR Italia

PWA per **ascoltare le onde corte (HF) in diretta** da ricevitori SDR situati in **Italia**, pensata per chi vuole avvicinarsi al mondo dei radioamatori **prima di comprare hardware**. Solo ascolto: nessuna trasmissione, nessuna licenza necessaria.

## Come funziona (e perché non basta lo smartphone)

Uno smartphone **non ha** un ricevitore per le onde corte (3–30 MHz), quindi non può captare l'etere HF direttamente. Questa app usa invece i **WebSDR / KiwiSDR**: veri ricevitori radio collegati a Internet che chiunque può sintonizzare dal browser **in tempo reale**.

L'app:

1. ti fa scegliere un **ricevitore in Italia** (un ricevitore italiano capta comunque segnali da tutto il mondo grazie alla propagazione);
2. con la **sintonia rapida** apre il ricevitore **già sintonizzato** sulla banda/modo scelti (es. "40 m SSB", "20 m USB", "49 m AM", "Morse CW");
3. include una **guida** a cosa stai ascoltando, ai modi (USB/LSB/AM/CW), alla propagazione e alla parte legale.

I ricevitori si aprono in una **nuova scheda del browser**: è l'approccio più affidabile su iPhone/Safari (molti SDR bloccano l'incorporamento in iframe).

## Ricevitori inclusi (Italia)

- **WebSDR Torino — I1YRB / CSP** (`websdr.ham.radio.it`) — storico e molto stabile, consigliato per iniziare.
- **KiwiSDR Lago di Viverone — IK1YRA** — 0–30 MHz.
- **KiwiSDR Cagliari** — 0–30 MHz.
- **KiwiSDR IZ6198SWL** — 0–30 MHz.

I KiwiSDR amatoriali possono andare **offline**: in quel caso usa le **mappe live** linkate nell'app (KiwiSDR map, websdr.org, A.I.R.) per trovarne altri attivi. Per aggiungere/aggiornare i ricevitori, modifica `receivers.js`.

## Deep-link di sintonia

- **WebSDR**: `…/?tune=<freqKHz><modo>` → es. `?tune=7100lsb`
- **KiwiSDR**: `…/?f=<freqKHz><modo>` → es. `?f=7100lsb`

Regola modi: sotto 10 MHz i radioamatori usano **LSB**, sopra **USB**. La sintonia rapida lo imposta già correttamente.

## Avvio locale

```
cd shortwave
python3 -m http.server 8080
```

Apri `http://localhost:8080`. Per il service worker serve `localhost` o HTTPS.

## Installazione su iPhone

Apri l'app in Safari → **Condividi** → **"Aggiungi a Home"**. Avrai un'icona indipendente a schermo intero.

## Note

- I ricevitori sono server pubblici di terzi: la disponibilità può variare nel tempo.
- Alcuni ricevitori usano `http://` (non `https`): vengono aperti come navigazione esterna, quindi funzionano regolarmente anche se la PWA è servita in HTTPS.
- Solo ascolto (SWL). Per trasmettere servono esame e licenza da radioamatore.
