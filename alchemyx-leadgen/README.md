# Alchemyx Lead-Gen — rilevatore di PMI che investono in advertising

Modulo CLI **a costo zero e senza dipendenze** per il sistema di lead generation
"Alchemyx". Dato un elenco di domini di aziende italiane:

1. **Rileva i tag pubblicitari** presenti nella homepage: Meta Pixel (Facebook/Instagram
   Ads) e Google Ads (tag di conversione `AW-...`), più i segnali deboli GTM e GA4.
2. **Estrae le email di contatto** dalla homepage e dalle pagine `/contatti`,
   `/contact`, `/privacy`.
3. **Verifica i record MX** del dominio (il dominio può davvero ricevere email?).
4. **Esporta i lead qualificati** in `output/leads.csv` e `output/leads.json`,
   ordinati per punteggio pubblicitario decrescente.

La logica è semplice: se un'azienda ha già un pixel di tracciamento attivo, sta già
spendendo in advertising — è un lead caldo per servizi di marketing/ottimizzazione.

## Filosofia zero-cost / zero-dependency

- **Zero API a pagamento**: niente Meta Ad Library API, niente tool SaaS. Si legge
  solo l'HTML pubblico che il sito serve a chiunque lo visiti.
- **Zero dipendenze npm**: solo built-in di Node.js 18+ (`fetch` globale,
  `node:dns/promises`, `node:fs/promises`). `package.json` ha `"dependencies": {}`.
  Nessun `npm install` necessario: cloni ed esegui.
- **Educato con i server**: una richiesta alla volta, pausa di ~1,2 s tra un dominio
  e l'altro, timeout di 10 s, lettura del body limitata a ~1,5 MB.

## Come si usa

```bash
# Con il tuo file di domini (uno per riga, # per i commenti)
node src/index.js input/domains.txt

# Oppure via npm script
npm run detect -- input/domains.txt

# Senza argomenti usa input/domains.txt; se manca, ripiega
# automaticamente su input/domains.example.txt
node src/index.js
```

Il progresso è stampato su stderr riga per riga; il riepilogo finale su stdout.
Lo script esce sempre con codice 0: un dominio irraggiungibile non blocca il batch.

## Colonne di output (CSV/JSON)

| Colonna | Significato |
|---|---|
| `domain`, `url` | Dominio analizzato e URL usato |
| `reachable` | La homepage ha risposto con HTTP 2xx |
| `advertises` | **Prova forte** di advertising: Meta Pixel O Google Ads |
| `adScore` | Punteggio 0–100 (Meta +50, Google Ads +50, GTM +10, GA4 +5) |
| `metaPixel`, `metaPixelId` | Pixel Meta rilevato e suo ID |
| `googleAds`, `googleAdsId` | Tag Google Ads rilevato e ID `AW-...` |
| `gtm`, `ga4` | Segnali deboli (tag manager / analytics, NON prova di ads) |
| `hasMx` | Il dominio ha record MX (può ricevere email) |
| `primaryEmail` | Prima email col dominio del sito, altrimenti la prima trovata |
| `emails` | Tutte le email trovate, separate da virgola |
| `signals` | Descrizione leggibile dei segnali rilevati |
| `checkedAt` | Timestamp ISO della verifica |

**Lead azionabile** = `advertises` (o `adScore` alto) + almeno una email + `hasMx`.

## Note legali / GDPR

Questo strumento **legge esclusivamente pagine pubbliche**, le stesse servite dal
sito a qualunque visitatore: nessuna intrusione, nessun dato riservato. Attenzione
però alla fase successiva: **l'invio di email a freddo B2B in Italia richiede una
base giuridica** (tipicamente il legittimo interesse, da valutare e documentare),
un **mittente chiaramente identificabile** e un **meccanismo di opt-out in ogni
messaggio**. Preferire sempre **indirizzi aziendali generici** (`info@`,
`commerciale@`) rispetto a email personali/nominative, che godono di tutele
maggiori. In caso di dubbio, consultare un professionista privacy.
