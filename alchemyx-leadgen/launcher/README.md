# LEAD GEN — Launcher desktop

Icona e launcher desktop per la dashboard lead-gen **Alchemyx**.
Zero dipendenze: basta **Node 18+** (consigliato) oppure **Python 3**
(preinstallato su macOS e Linux).

## Come funziona

Il launcher avvia un piccolo server HTTP locale con radice nella cartella
`alchemyx-leadgen`, poi apre nel browser `http://localhost:8347/dashboard/`
(se la porta è occupata ne prova una successiva, fino alla 8399). Se un
server di un avvio precedente è già attivo (`/api/ping` risponde, o la
dashboard è la nostra), viene riutilizzato: si apre solo il browser.

**Con Node 18+ installato** il launcher avvia `node server/server.js`
(zero dipendenze npm): oltre ai file statici, il server espone il
rilevatore ADS come API locale. Questo abilita il **flusso in un clic**:
mappa → **"🔎 Cerca e qualifica (ADS + email)"** → i domini trovati vengono
analizzati in background con barra di progresso → la **dashboard si
aggiorna da sola** a fine analisi (i lead si accumulano in
`output/leads.json`/`leads.csv`). Niente terminale.

**Senza Node** (solo Python) il launcher ripiega su
`python3 -m http.server`: dashboard e mappa funzionano come sempre, ma in
sola lettura — il rilevatore va lanciato a mano da terminale
(`node src/index.js input/domains.txt`), che resta comunque supportato in
entrambi i casi.

## macOS

- Fai **doppio click su `LEAD GEN.app`**, oppure trascinala nel **Dock**
  (o in `/Applicazioni`... ma se la sposti fuori dal progetto, l'app cerca
  comunque la dashboard risalendo le cartelle; tienila dentro
  `alchemyx-leadgen/launcher/` per sicurezza).
- **Primo avvio — l'app non è firmata, Gatekeeper la blocca.**
  Su macOS recenti (Sequoia 15+) il vecchio trucco "tasto destro → Apri"
  **non basta più**. Procedura (una volta sola):
  1. Al messaggio *"LEAD GEN.app non è stata aperta"* clicca **«Fine»**
     (⚠️ NON «Sposta nel Cestino»).
  2. ** → Impostazioni di Sistema → Privacy e Sicurezza**, scorri in
     fondo: alla riga *«"LEAD GEN.app" è stata bloccata…»* clicca
     **«Apri comunque»**.
  3. Riapri l'app e conferma **«Apri»** (può chiedere la password).

  In alternativa, da Terminale (rimuove la quarantena in un colpo solo):

  ```sh
  xattr -dr com.apple.quarantine "/percorso/di/LEAD GEN.app"
  ```

  Su macOS più vecchi (fino a Sonoma 14) basta il classico
  **tasto destro (Ctrl+click) → Apri → Apri** la prima volta.
- In alternativa usa **`Avvia LEAD GEN.command`** (doppio click): fa la
  stessa cosa da una finestra del Terminale (anche questo file, se
  scaricato, può richiedere la stessa procedura di sblocco).
- L'app è trasparente: il "programma" è lo script leggibile in
  `LEAD GEN.app/Contents/MacOS/alchemyx` (~60 righe di shell commentate).

## Windows

- **Doppio click su `alchemyx.bat`** per avviare la dashboard.
- Esegui **`alchemyx.bat --install`** (dal Prompt dei comandi, oppure crea
  tu un collegamento con quell'argomento) per creare l'icona
  **"LEAD GEN"** sul Desktop, con l'icona `assets\icon.ico`.
- Serve **Node 18+** (consigliato: abilita la ricerca in un clic,
  [nodejs.org](https://nodejs.org)) oppure **Python 3**
  ([python.org](https://www.python.org) o Microsoft Store, `py` o `python`
  nel PATH).

## Linux

- Apri `alchemyx.desktop`, sostituisci `/PERCORSO/DEL/PROGETTO` (2 volte)
  con il percorso assoluto della cartella che contiene `alchemyx-leadgen`.
- Copia il file in `~/.local/share/applications/` — la voce **LEAD GEN**
  comparirà nel menu delle applicazioni.
- In alternativa puoi lanciare direttamente `Avvia LEAD GEN.command`
  da terminale: su Linux usa `xdg-open` al posto di `open`.

## Icone (già generate)

Le icone in `assets/` (PNG 512/256/128/32/16, `icon.icns` per macOS,
`icon.ico` per Windows) sono generate proceduralmente, senza dipendenze:

```sh
node alchemyx-leadgen/launcher/make-icon.js
```

Se rigeneri le icone, ricopia `assets/icon.icns` in
`LEAD GEN.app/Contents/Resources/icon.icns`.

## Note

- L'app serve la cartella `alchemyx-leadgen` su `localhost` e apre la
  dashboard nel browser: i lead in `output/leads.json` vengono caricati
  automaticamente (cosa che da `file://` non è possibile).
- Il server resta attivo in background dopo la chiusura del browser; per
  fermarlo: `kill` del processo `node server/server.js` (o `http.server`
  se sei sul fallback Python) su macOS/Linux, oppure chiudi la finestra
  minimizzata "LEAD GEN server" (Windows). Al prossimo avvio, se è ancora
  attivo, viene semplicemente riutilizzato.
