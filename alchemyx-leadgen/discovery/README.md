# Alchemyx — Modulo Discovery

Modulo Node.js a **costo zero e zero dipendenze** che produce una lista
deduplicata e normalizzata di domini di aziende **italiane**
(`output/domains.txt`), pronta per essere data in pasto al modulo
ADS-detector di Alchemyx.

- Node 18+ (usa `fetch` globale e solo built-in: `node:fs/promises`, `node:url`).
- Nessuna API a pagamento, nessun abbonamento, nessuna dipendenza npm.
- Solo fonti **gratuite e legittime** (vedi sotto la posizione legale di ciascuna).

## Struttura

```
discovery/
  src/
    normalize.js   normalizza + deduplica domini da input misti
    adlibrary.js   costruttori URL Meta Ad Library / Google Ads Transparency + parser export manuali
    osm.js         ricerca POI su OpenStreetMap via Nominatim (gratuito, senza API key)
    index.js       CLI che unisce le fonti in output/domains.txt
  input/
    raw.example.txt  esempio di input grezzo misto (URL, domini, "Azienda - sito.it")
  output/
    domains.txt      generato dal CLI (un dominio per riga)
```

## Fonti gratuite e posizione legale / ToS

### 1. OpenStreetMap / Nominatim — 100% gratuito e lecito
Nominatim (`nominatim.openstreetmap.org`) è il geocoder pubblico di OSM:
gratuito, senza API key, dati con licenza aperta (ODbL). L'uso è
perfettamente lecito **a patto di rispettare la
[usage policy](https://operations.osmfoundation.org/policies/nominatim/)**:

- inviare uno **User-Agent descrittivo** che identifichi l'applicazione
  (il modulo invia `Alchemyx-LeadGen/1.0 (...)`);
- **massimo 1 richiesta al secondo** (rate limiter integrato in `osm.js`,
  ~1,1 s tra le richieste);
- **nessun uso massivo/bulk**: usare il modulo per ricerche mirate
  (categoria + città), non per aspirare l'intero database.

Molti POI aziendali su OSM dichiarano il proprio sito nei tag
`website` / `contact:website`: da lì estraiamo il dominio.

### 2. Open data (Registro Imprese, elenchi pubblici) — lecito
Elenchi pubblici e open data (es. estratti gratuiti del Registro Imprese,
albi/elenchi pubblicati da enti e associazioni di categoria, pagine
pubbliche delle aziende) sono fonti lecite. Il modulo li consuma tramite
`--raw <file>`: incolla in un file di testo qualsiasi mix di URL, domini
nudi o righe "Azienda - sito.it" e `normalize.js` li ripulisce, deduplica
e scarta i domini social/junk.

### 3. Meta Ad Library / Google Ads Transparency Center — dati pubblici, MA…
I dati sono pubblici e consultabili gratuitamente da chiunque, **ma lo
scraping automatico è contro i Termini di Servizio** di Meta e Google.
Per questo il modulo **non effettua alcuna richiesta automatica** a quelle
piattaforme. Fornisce soltanto:

- i **link diretti** alla ricerca (da aprire manualmente nel browser);
- un **parser** (`parseAdLibraryExport`) per pagine/estratti che hai
  **salvato manualmente** (Ctrl+S, copia-incolla, export dal network tab),
  da usare **a basso volume** e per consultazione personale.

Nota: nel Google Ads Transparency Center la ricerca per parola chiave si
fa **nella UI della pagina** (non è passabile in query string): il CLI ti
ricorda la keyword da digitare.

## Comandi di esempio

```bash
cd alchemyx-leadgen/discovery

# Normalizza il file di esempio e genera output/domains.txt
npm run discover

# File raw personalizzato
node src/index.js --raw input/mieifile.txt

# Ricerca POI su OSM (gratuita, 1 req/s) — ripetibile
node src/index.js --osm "ristorante" "Bologna"
node src/index.js --osm "parrucchiere" "Torino" --osm "palestra" "Bari"

# Stampa i link Ad Library / Transparency da aprire a mano (nessun fetch)
node src/index.js --adlib "ecommerce abbigliamento"

# Tutto insieme
node src/index.js --raw input/raw.example.txt --osm "gelateria" "Roma" --adlib "arredamento"
```

L'output è `output/domains.txt`, un dominio per riga, con un'intestazione
`# generato da Alchemyx discovery`. Il CLI stampa un riepilogo: quante
fonti sono state consultate, quanti domini unici e da dove arrivano.

## API (uso come modulo)

```js
import { extractDomain, normalizeList } from './src/normalize.js';
import { metaAdLibraryUrl, googleAdsTransparencyUrl, parseAdLibraryExport } from './src/adlibrary.js';
import { searchOsm } from './src/osm.js';

extractDomain('Pizzeria Da Gino - https://www.dagino.it/menu'); // 'dagino.it'
normalizeList(['www.sito.it', 'https://facebook.com/x']);       // ['sito.it']
await searchOsm('ristorante', 'Bologna', { limit: 25 });        // [{name, domain, lat, lon}, ...]
```
