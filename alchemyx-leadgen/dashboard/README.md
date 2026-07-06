# Alchemyx — Dashboard Pipeline Lead

Dashboard statica, **zero dipendenze** (HTML + CSS + JavaScript vanilla), per
visualizzare i lead prodotti dal detector di Alchemyx (`leads.json`).
Nessun build step, nessun npm, nessuna risorsa esterna: tutto funziona anche
offline e nessun dato lascia il browser.

## Come aprire la dashboard

**Opzione 1 — doppio click.**
Basta fare doppio click su `index.html`: la pagina si apre nel browser via
`file://`. In questa modalità il browser di solito blocca il caricamento
automatico dei file JSON locali (CORS), quindi la dashboard parte con i dati
di esempio integrati — carica poi i tuoi dati reali come descritto sotto.

**Opzione 2 — mini server locale (consigliata).**
Da terminale, dentro questa cartella:

```bash
cd alchemyx-leadgen/dashboard
python3 -m http.server 8000
```

Poi apri <http://localhost:8000>. Servita via HTTP, la pagina prova
automaticamente a caricare `../output/leads.json` (i dati reali del detector)
e, se non lo trova, ripiega su `sample-leads.json`.

## Come caricare i dati reali (`../output/leads.json`)

La dashboard prova a caricare i dati in questo ordine:

1. `../output/leads.json` — l'output reale del detector (funziona solo se la
   pagina è servita via HTTP, opzione 2);
2. `./sample-leads.json` — dati dimostrativi;
3. dati di esempio integrati in `app.js` — così la pagina mostra sempre
   qualcosa, anche aperta via `file://`.

Per caricare **manualmente** il file reale (indispensabile se hai aperto la
pagina con doppio click):

- clicca il pulsante **"Carica leads.json"** in alto e seleziona
  `alchemyx-leadgen/output/leads.json`, **oppure**
- **trascina** il file `leads.json` direttamente sulla zona tratteggiata in
  cima alla pagina.

Il file viene letto in locale con `FileReader`: non viene inviato da nessuna
parte. L'etichetta in alto a destra indica sempre quale sorgente dati è
attualmente visualizzata.

## Cosa mostra la dashboard

### KPI (si aggiornano in base ai filtri attivi)

| KPI | Significato |
| --- | --- |
| **Totale lead** | Numero di lead attualmente visualizzati (dopo i filtri). |
| **Fanno ADS** | Lead con `advertises = true`, cioè siti che investono in pubblicità. |
| **Lead azionabili** | Lead contattabili subito: `advertises` **e** `primaryEmail` presente **e** `hasMx = true` (il dominio accetta email). |
| **adScore medio** | Media aritmetica dell'`adScore` (0–100) dei lead visualizzati. |

### Filtri

- **Cerca dominio** — ricerca testuale sul dominio.
- **Solo chi fa ADS** — mostra solo i lead con `advertises = true`.
- **Solo con email** — mostra solo i lead con `primaryEmail` valorizzata.
- **Canale** — Tutti / Meta / Google / Entrambi. "Meta" e "Google" includono
  anche chi usa entrambi i canali; "Entrambi" richiede Meta Pixel **e**
  Google Ads insieme.
- **Min adScore** — slider: nasconde i lead sotto la soglia scelta.

### Colonne della tabella

| Colonna | Significato |
| --- | --- |
| **Domain** | Dominio del sito, cliccabile (apre `url` in una nuova scheda). Ordinabile cliccando l'intestazione. |
| **Canale** | Badge dei canali pubblicitari rilevati: **Meta** (viola, Meta Pixel) e/o **Google** (blu, Google Ads). "—" se nessuno. |
| **Score** | `adScore` 0–100: intensità dei segnali pubblicitari. Chip verde ≥ 70, ambra 40–69, rosso < 40. Ordinabile. |
| **Email** | `primaryEmail` come link `mailto:`, oppure "—" se assente. |
| **MX** | ✓ se il dominio ha record MX (`hasMx = true`, quindi l'email è recapitabile), altrimenti "—". |
| **Signals** | Riepilogo testuale dei segnali rilevati dal detector (Pixel, tag, GTM, GA4…). Troncato: passa il mouse sopra per il testo completo. |

Le righe dei lead che fanno advertising sono leggermente evidenziate.

### Esporta CSV

Il pulsante **"Esporta CSV"** scarica un file `alchemyx-leads-AAAA-MM-GG.csv`
contenente **solo le righe attualmente filtrate**, con tutte le colonne dello
schema originale. Il file è in UTF-8 (con BOM, così Excel lo apre
correttamente).

## Struttura dei file

```
dashboard/
  index.html        # struttura della pagina
  styles.css        # stile (tema chiaro/scuro automatico)
  app.js            # logica: caricamento dati, filtri, tabella, CSV
  sample-leads.json # 8 lead di esempio
  README.md         # questo file
```
