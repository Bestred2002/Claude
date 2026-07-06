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
    overpass.js    motore di ricerca geografica via Overpass API (categoria + comune/provincia/bbox)
    index.js       CLI che unisce le fonti in output/domains.txt
  categories.json  tassonomia categorie → filtri tag OSM (usata da CLI e mappa)
  aree.json        comuni preimpostati per la mappa ("Area rapida": label, lat/lon/zoom, bbox)
  map/
    index.html     mappa browser "Trova lead": disegna un'area + scegli categoria
    app.js         logica mappa (Leaflet + Overpass direttamente dal browser)
    styles.css     stile coerente con la dashboard
  input/
    raw.example.txt  esempio di input grezzo misto (URL, domini, "Azienda - sito.it")
  output/
    domains.txt      generato dal CLI (un dominio per riga)
    overpass-*.csv   sidecar delle ricerche Overpass (name,domain,lat,lon)
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

## Ricerca geografica con Overpass (mappa + terminale)

La ricerca geografica interroga l'**Overpass API** di OpenStreetMap: scegli
una **categoria** (da `categories.json`) e un'**area** (un comune, una
provincia, o un rettangolo disegnato sulla mappa) e ottieni le attività della
zona **che hanno mappato un sito web su OSM**. Da lì si estraggono i domini.

Lo stesso motore è usato in due modi:

### Dal terminale

```bash
cd alchemyx-leadgen/discovery

# Categoria + comune (default)
node src/index.js --overpass "ristoranti" "Segrate"

# Tutta la provincia / città metropolitana
node src/index.js --overpass "palestre" "Bergamo" --provincia

# Limita il numero di risultati e combina più ricerche
node src/index.js --overpass "dentisti" "Monza" --overpass "ottici" "Monza" --limit 50

# La categoria può essere la chiave o l'etichetta italiana
node src/index.js --overpass "Fitness / benessere / beauty" "Como"

# Categoria sbagliata? Il CLI stampa l'elenco delle categorie disponibili
node src/index.js --overpass "boh" "Milano"
```

Le categorie vivono in `categories.json`: gruppi ampi (`servizi`, `retail`,
`ristorazione`, `servizi_professionali`, `fitness_benessere`) e sotto-categorie
specifiche (`ristoranti`, `hotel`, `agenzie_immobiliari`, `palestre`,
`parrucchieri`, `dentisti`, `negozi_abbigliamento`, ...). Ogni chiave mappa su
filtri di tag OSM (es. `amenity=restaurant`, `shop=*`).

I domini trovati vengono **uniti** a `output/domains.txt` (niente va perso tra
una ricerca e l'altra) e ogni ricerca salva anche un CSV di riferimento
`output/overpass-<categoria>-<luogo>.csv` con `name,domain,lat,lon`.

### Dalla mappa nel browser

Apri la mappa in uno dei due modi:

- con l'app **LEAD GEN** avviata: <http://localhost:8347/discovery/map/>
- oppure doppio click su `discovery/map/index.html` (funziona anche da `file://`).

Flusso: scegli un comune dal menu **"Area rapida"** (Milano, Torino, Roma,
Firenze + Lombardia, Abruzzo, Marche, Puglia e Sicilia: la mappa vola sul
comune e imposta l'area di ricerca) **oppure disegna un rettangolo** (o
poligono) sull'area che ti interessa → scegli la categoria dal menu →
**🔍 Cerca attività** (oppure "Cerca in questa vista" per usare
l'inquadratura corrente). I risultati con sito web compaiono come marker e in
tabella. Poi **⬇️ Scarica domains.txt**, salvalo in `discovery/output/` e dai
i domini al detector:

```bash
node src/index.js            # (facoltativo) rinormalizza/unisce le fonti
cd .. && node src/index.js discovery/output/domains.txt   # detector ADS
```

### Etiquette Overpass (servizio pubblico gratuito)

Overpass e Nominatim sono servizi **gratuiti mantenuti da volontari**: niente
API key, ma un po' di buon senso è dovuto. Cerca su **aree non enormi** (un
comune o un quartiere: su una provincia intera può volerci molto o andare in
timeout), abbi **pazienza sui tempi di risposta**, e se ricevi un errore di
rate-limit aspetta qualche minuto prima di riprovare (il modulo prova
automaticamente un mirror). Ricorda inoltre che **esce un dominio solo per le
attività che hanno mappato il proprio sito web su OSM**: in molte zone è una
frazione dei negozi reali — è la natura del dato libero, non un bug.

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
import { buildOverpassQuery, resolveAreaId, runOverpass, businessesInArea } from './src/overpass.js';

extractDomain('Pizzeria Da Gino - https://www.dagino.it/menu'); // 'dagino.it'
normalizeList(['www.sito.it', 'https://facebook.com/x']);       // ['sito.it']
await searchOsm('ristorante', 'Bologna', { limit: 25 });        // [{name, domain, lat, lon}, ...]

// Ricerca geografica Overpass (mai lancia eccezioni)
await resolveAreaId('Bologna', { level: 'citta' });             // {osmType, osmId, displayName, areaId} | null
buildOverpassQuery([['amenity','restaurant']], { bbox: [44.4, 11.2, 44.6, 11.4] });
await runOverpass(query);                                       // {ok, results, total, error}
await businessesInArea({ category: 'ristoranti', place: 'Bologna' }, categoriesJson);
```
