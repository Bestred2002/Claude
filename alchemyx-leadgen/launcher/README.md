# LEAD GEN — Launcher desktop

Icona e launcher desktop per la dashboard lead-gen **Alchemyx**.
Zero dipendenze: servono solo **Python 3** (preinstallato su macOS e Linux)
e, solo per rigenerare le icone, **Node 18+**.

## Come funziona

Il launcher avvia un piccolo server HTTP locale (`python3 -m http.server`)
con radice nella cartella `alchemyx-leadgen`, poi apre nel browser
`http://localhost:8347/dashboard/` (se la porta è occupata ne prova una
successiva, fino alla 8399). Servendo l'intera cartella, la dashboard può
caricare automaticamente i lead da `output/leads.json`. Se un server di un
avvio precedente è già attivo, viene riutilizzato: si apre solo il browser.

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
- Serve Python 3: installalo da [python.org](https://www.python.org) o dal
  Microsoft Store se non è già presente (`py` o `python` nel PATH).

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
  fermarlo: `kill` del processo `http.server` (macOS/Linux) o chiudi la
  finestra minimizzata "LEAD GEN server" (Windows). Al prossimo avvio,
  se è ancora attivo, viene semplicemente riutilizzato.
