# Alchemyx Outreach — generatore di bozze email

Modulo Node.js **a costo zero e senza dipendenze** (solo built-in di Node 18+) che trasforma i lead qualificati dal modulo detector in **bozze** di email di primo contatto (cold outreach B2B) personalizzate e conformi alle buone pratiche GDPR/CAN-SPAM.

**Importante: questo modulo NON invia nulla.** Produce solo bozze (`drafts.json` e file `.eml`); l'invio avviene in un passo successivo (es. via Gmail).

## Cosa fa

1. Legge `leads.json` (output del modulo detector, in `../output/leads.json`).
2. Seleziona solo i lead idonei:
   - `advertises === true` (fanno già pubblicità online),
   - `primaryEmail` presente,
   - `hasMx === true` (dominio email con record MX valido),
   - **non** presenti in `suppression.txt` (opt-out, per email o per dominio).
3. Sceglie il template in base al canale pubblicitario rilevato:
   - solo Meta Pixel → `templates/intro_meta.txt`
   - solo Google Ads → `templates/intro_google.txt`
   - entrambi → `templates/intro_generic.txt` con canale "Meta e Google"
   - altro → `templates/intro_generic.txt`
4. Personalizza i placeholder (`{{azienda_target}}` derivata dal dominio, `{{dominio}}`, `{{canale_ads}}`, mittente, firma, ecc.).
5. Scrive:
   - `output/drafts.json` — array di bozze `{to, subject, body, leadDomain, canale, adScore}`;
   - `output/eml/<dominio>.eml` — una bozza RFC822 per lead, con header `List-Unsubscribe` + `List-Unsubscribe-Post` (opt-out one-click) e footer con identità del mittente e indirizzo fisico.

## Come si usa

```bash
cd alchemyx-leadgen/outreach

# 1. Compila config.json con i TUOI dati reali (mittente, indirizzo fisico, URL di disiscrizione).
# 2. Aggiorna suppression.txt con email/domini da non contattare mai.

# Genera le bozze dai lead del detector (default: ../output/leads.json)
npm run generate

# Oppure con un file lead specifico
node src/generate.js /percorso/ai/miei/leads.json
```

Se `leads.json` non esiste, lo script usa una piccola fixture di 2 lead di esempio (uno Meta, uno Google) e lo segnala a video, così lo smoke test funziona subito.

Al termine viene stampato un riepilogo: quanti lead erano idonei, quanti sono stati scartati e perché (non advertizza / senza email / senza MX / in soppressione) e i percorsi di output.

### Configurazione (`config.json`)

| Campo | Descrizione |
|---|---|
| `mittente_nome` | Nome visualizzato del mittente |
| `mittente_email` | Indirizzo email del mittente (usato anche in `List-Unsubscribe` mailto) |
| `azienda` | Ragione sociale che compare nel footer |
| `indirizzo_postale` | **Indirizzo fisico reale** (obbligatorio per buone pratiche) |
| `unsubscribe_url` | URL della pagina di disiscrizione |
| `firma` | Firma in calce alle email |

### Template

I file in `templates/` hanno il formato: prima riga `Subject: ...`, riga vuota, poi il corpo. Placeholder disponibili: `{{azienda_target}}`, `{{dominio}}`, `{{canale_ads}}`, `{{mittente_nome}}`, `{{azienda}}`, `{{firma}}`, `{{unsubscribe_url}}`, `{{indirizzo_postale}}`. Ogni corpo termina con la riga di opt-out in chiaro.

## GDPR / buone pratiche invio

- **Base giuridica**: per il primo contatto B2B verso indirizzi aziendali pubblici la base tipica è il **legittimo interesse** (art. 6.1.f GDPR). Valuta e documenta il bilanciamento (LIA); l'interesse deve essere pertinente all'attività del destinatario.
- **Mittente sempre identificabile**: nome, azienda e **indirizzo fisico** compaiono nel footer di ogni bozza; l'opt-out one-click è già incluso sia negli header (`List-Unsubscribe` / `List-Unsubscribe-Post`) sia nel testo ("rispondi STOP o clicca qui"). Non rimuoverli.
- **Preferisci indirizzi aziendali generici** (info@, contatti@, commerciale@) rispetto a caselle personali nominative: minor impatto privacy e minor rischio.
- **Rispetta la suppression list**: chi è in `suppression.txt` (email o intero dominio) non viene MAI contattato. Aggiungi subito chi risponde STOP o si disiscrive, e non rimuoverlo in seguito.
- **Limiti Gmail e deliverability**: un account Gmail personale consente circa **~500 email/giorno** (meno in fase di warm-up; Workspace ha limiti diversi). Superarli o inviare a freddo in massa porta rapidamente a finire in spam o al **ban dell'account**.
- **Parti piano**: inizia con volumi bassi (**20-30 email/giorno**), su un **dominio "riscaldato"** (con SPF/DKIM/DMARC configurati e uno storico di invii legittimi), aumentando gradualmente solo se il tasso di risposta è buono e i bounce/segnalazioni spam restano bassi.
- **Igiene dei dati**: invia solo a indirizzi con MX valido (il filtro è già applicato), conserva traccia di data/fonte del contatto e cancella i dati di chi lo richiede (diritti artt. 15-21 GDPR).
