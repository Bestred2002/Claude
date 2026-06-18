# SEO Knowledge Base — appunti strategici

> Nota di memoria persistente. Questo file esiste perché l'ambiente di esecuzione è
> effimero: quando in futuro chiederai "migliorami la SEO del sito", parti da qui.
> Fonte di partenza: video YouTube **"Claude Code Local SEO: How I Got 50,000 Google
> Clicks/Mo (Steal This)"** (https://www.youtube.com/watch?v=BTnU_cCx36Y) + materiale
> correlato sulla SEO programmatica con Claude Code. La trascrizione integrale del video
> non è stata recuperabile (YouTube e i servizi di transcript bloccano l'accesso
> automatico), quindi gli appunti sintetizzano tema, tesi e tattiche dal titolo, dalle
> fonti correlate e dalle best practice attuali.

Ultimo aggiornamento: 2026-06-18

---

## 1. Tesi centrale del video

Si possono ottenere grandi volumi di traffico organico (decine di migliaia di click/mese)
**generando in modo programmatico molte landing page locali/di nicchia con Claude Code**,
a patto che ogni pagina contenga dati realmente differenziati (non testo "spinnato").
Claude Code fa da motore di produzione + automazione, non da sostituto della strategia.

## 2. Pilastri strategici (cosa rubare dal video)

1. **SEO programmatica con dati reali per entità.** Una pagina per ogni entità
   (città, canale, categoria, combinazione "X a/di Y"). Il valore SEO sta nel *dato unico*
   per pagina: statistiche locali, prezzi reali, recensioni vere, caratteristiche
   specifiche. Se cambiano solo i sinonimi → contenuto thin → penalizzazione.
2. **Keyword research guidata da gap.** Claude Code da solo NON conosce i volumi di
   ricerca: va collegato a un tool SEO via MCP (es. Ahrefs, DataForSEO, Semrush, Google
   Search Console). Workflow: trova keyword gap nella nicchia → incrocia con i contenuti
   esistenti → genera la serie di pagine mancanti.
3. **Template + dati separati.** Un template HTML/markdown coerente alimentato da un
   dataset (CSV/JSON). Claude genera/riempie le pagine in batch.
4. **E-E-A-T e schema.** Dati strutturati (JSON-LD) per ogni tipo di pagina
   (LocalBusiness, BreadcrumbList, FAQPage, ItemList, VideoObject, ecc.).
5. **Internal linking automatico.** Collegare le pagine generate tra loro e dall'hub/home
   (hub-and-spoke) per distribuire autorità e far indicizzare in fretta.
6. **Indicizzazione attiva.** sitemap.xml aggiornata + ping/submit a Google Search
   Console; monitorare copertura e click in GSC.
7. **Misurazione e iterazione.** Tracciare click/impression/posizione in GSC; potare o
   migliorare le pagine che non performano.

## 3. Stack/automazioni citate o implicite

- **Claude Code** come orchestratore (skill/sub-agent dedicati: technical SEO, schema,
  E-E-A-T, local SEO, semantic clustering, GEO/AEO, reporting).
- **MCP** verso dati SEO reali: Google Search Console MCP, Ahrefs/DataForSEO/Semrush,
  Firecrawl per crawling/scraping.
- **GEO/AEO** (Generative/Answer Engine Optimization): ottimizzare anche per le risposte
  AI, non solo per i 10 link blu — trend forte 2026.

## 4. Applicazione a QUESTO sito (myTV — PWA streaming TV/Radio IT)

Stato attuale (vedi `index.html`, `catalog.js`, `manifest.webmanifest`, `sw.js`): SPA/PWA
su GitHub Pages, catalogo TV/Radio italiano caricato via JS. Implicazioni SEO importanti:

- **Rischio #1 — contenuto reso da JS.** Il catalogo è popolato lato client: i crawler
  potrebbero vedere una pagina quasi vuota. Servono contenuti in HTML statico o
  pre-rendering/SSG.
- **Opportunità programmatica naturale.** Ogni canale/stazione = un'entità → una pagina
  dedicata ("Guarda <Canale> in streaming", "Radio <Nome> in diretta"). Dati reali già
  disponibili nel catalogo (nome, categoria, lingua, stream). Ottimo caso per pSEO.
- **Quick win candidati (da confermare quando si parte):**
  1. `<title>`, meta description, Open Graph/Twitter Card per pagina/hub.
  2. JSON-LD: `BroadcastService`/`TelevisionChannel`/`RadioStation`, `BreadcrumbList`,
     `WebSite` con SearchAction.
  3. Generare pagine statiche per canale + indice per categoria (hub-and-spoke), partendo
     da `catalog.js` come dataset.
  4. `sitemap.xml` + `robots.txt` + canonical; submit a Google Search Console.
  5. Heading semantici, alt text sui loghi, performance/Core Web Vitals (PWA aiuta).
  6. Pre-render del contenuto critico così i bot vedono il catalogo senza eseguire JS.

## 5. Cautele / cosa NON fare

- Niente pagine mass-prodotte senza dato unico (thin/doorway → penalizzazione Google).
- Non gonfiare con keyword: puntare a intento di ricerca reale.
- Verificare sempre i volumi con dati reali (MCP/GSC) prima di generare centinaia di pagine.

## 6. Prossimi passi quando si lavorerà sulla SEO

1. Collegare Google Search Console (e un tool keyword) via MCP per dati reali.
2. Audit tecnico: rendering JS, sitemap, robots, canonical, meta, schema.
3. Decidere il modello pSEO (pagina per canale / per categoria / per "canale + città").
4. Generare un prototipo di template + 5-10 pagine, validare indicizzazione, poi scalare.

---

### Riferimenti
- Video sorgente: https://www.youtube.com/watch?v=BTnU_cCx36Y
- Video correlato (stesso autore/tema, 90k click GEO): https://www.youtube.com/watch?v=PNBXsmBDDlE
- Skill SEO per Claude Code: https://github.com/AgriciDaniel/claude-seo
- Programmatic SEO con Claude Code: https://stormy.ai/blog/programmatic-seo-claude-code-2026
- Google Search Console MCP: https://composio.dev/toolkits/google_search_console/framework/claude-code
