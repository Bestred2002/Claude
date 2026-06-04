# Onde Corte · SDR Italia

PWA per **ascoltare la radio in diretta** — onde corte (HF) e **6 metri / VHF (50 MHz)** — da ricevitori SDR situati in **Italia**. Pensata per avvicinarsi al mondo dei radioamatori **prima di comprare hardware**. Solo ascolto: nessuna trasmissione, nessuna licenza necessaria.

Sito live: **https://bestred2002.github.io/Claude/shortwave/**

## Come funziona

Uno smartphone non ha un ricevitore radio HF/VHF, quindi non può captare l'etere direttamente. L'app usa **WebSDR / KiwiSDR / OpenWebRX**: veri ricevitori collegati a Internet, sintonizzabili dal browser in tempo reale.

Gamma coperta: da ~100 kHz (onde lunghe) fino a ~1,3 GHz, nei modi **AM · FM · FMW (WFM) · SSB · CW**.

Interfaccia a 3 gesti:

1. scegli una **categoria** (onde medie, emittenti OC, radioamatori, Morse, 6 m, FM 88–108, aerei, 2 m, 70 cm, 23 cm);
2. tocca una **banda**: il ricevitore si apre in una nuova scheda **già sintonizzato**;
3. opzionale: cambia **ricevitore** dalla barra in fondo (sopra i 30 MHz si usa un ricevitore VHF/UHF; con “Altri ›” trovi ricevitori per qualsiasi banda).

I ricevitori si aprono in una **nuova scheda** (l'approccio più affidabile su iPhone/Safari).

## Ricevitori inclusi (Italia)

| Ricevitore | Zona | Copertura | Note |
|---|---|---|---|
| WebSDR Torino (I1YRB) | Piemonte | HF | stabile, predefinito |
| KiwiSDR Viverone | Piemonte | 0–30 MHz | |
| KiwiSDR Cagliari | Sardegna | 0–30 MHz | |
| KiwiSDR Bergamo (IW2KPL) | Lombardia | 0–30 MHz | da verificare |
| KiwiSDR Milano | Lombardia | 0–30 MHz | da verificare |
| OpenWebRX La Spezia | Liguria | HF + **VHF/6 m** | da verificare |

La categoria **6 m / VHF** usa automaticamente il ricevitore di La Spezia (l'unico che copre i 50 MHz). Per aggiungere/aggiornare i ricevitori, modifica `receivers.js`.

## Deep-link di sintonia (freq in kHz)

- **WebSDR**: `…/?tune=7100lsb`
- **KiwiSDR**: `…/?f=7100lsb`
- **OpenWebRX**: `…/#freq=50150000,mod=usb` (FM → `nfm`)

## Avvio locale

```
cd shortwave
python3 -m http.server 8080
```

Apri `http://localhost:8080` (per il service worker serve `localhost` o HTTPS).

## Note

- Ricevitori = server pubblici di terzi: la disponibilità può variare. Quelli "da verificare" sono amatoriali e possono essere offline → usa le mappe live linkate nell'app.
- Alcuni usano `http://`: aperti come navigazione esterna, funzionano anche se la PWA è in HTTPS.
- Solo ascolto (SWL). Per trasmettere servono esame e licenza da radioamatore.
