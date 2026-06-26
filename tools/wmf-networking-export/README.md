# Export contatti Networking — wmf.ibrida.io

Script che fa il login su `https://wmf.ibrida.io`, apre la sezione **Networking**,
estrae **tutti i campi di ogni scheda contatto (incluso l'indirizzo LinkedIn)** e
salva un file **Excel** (`contatti_networking.xlsx`).

> Perché eseguirlo in locale? L'ambiente cloud di Claude Code ha la rete bloccata
> verso domini esterni, quindi da lì non si raggiunge il sito. Sul tuo computer
> non c'è questo blocco e lo script funziona normalmente.

## Requisiti
- [Node.js](https://nodejs.org) 18 o superiore installato sul tuo computer.

## Installazione (una volta sola)
```bash
cd tools/wmf-networking-export
npm install        # installa Playwright + ExcelJS e scarica Chromium
```

## Esecuzione
Su **macOS / Linux**:
```bash
WMF_USER="fabio@alchemystlab.com" WMF_PASS="LA_TUA_PASSWORD" npm start
```

Su **Windows (PowerShell)**:
```powershell
$env:WMF_USER="fabio@alchemystlab.com"; $env:WMF_PASS="LA_TUA_PASSWORD"; npm start
```

Al termine troverai il file **`contatti_networking.xlsx`** nella cartella.

## Se la password è sbagliata
Lo script te lo dice esplicitamente e si ferma:
```
>> La password e' probabilmente SBAGLIATA. <<
```

## Opzioni
| Variabile      | Effetto                                                        |
|----------------|----------------------------------------------------------------|
| `HEADLESS=false` | Mostra il browser mentre lavora (utile per vedere cosa succede / fare login manuale) |
| `SLOWMO=200`     | Rallenta le azioni di 200 ms                                  |
| `MAX=3`          | Estrae solo i primi 3 contatti (per un test veloce)          |

Esempio per vedere il browser e provare con 3 contatti:
```bash
HEADLESS=false MAX=3 WMF_USER="fabio@alchemystlab.com" WMF_PASS="..." npm start
```

## Se qualcosa non combacia
I selettori del login e delle schede sono dedotti in modo generico. Se il login o
l'estrazione non vanno al primo colpo, lancia con `HEADLESS=false` e guarda dove si
ferma: di solito basta ritoccare un selettore in `CONFIG` (in alto in `export.js`),
oppure i campi etichetta/valore nella funzione `extractCard`. Mandami uno screenshot
o l'HTML della pagina e te lo adatto in pochi minuti.
