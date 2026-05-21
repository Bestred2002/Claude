# myTV — wrapper Electron

Wrapper desktop che aggiunge un'icona nella barra dei menu di macOS (e nella
system tray su Windows/Linux) per il rapido cambio canale/radio senza dover
aprire la finestra.

## Avvio in sviluppo

```bash
npm install
npm start
```

## Build pacchetti

```bash
npm run build:mac     # .dmg per Apple Silicon / Intel
npm run build:win     # .exe NSIS
npm run build:linux   # .AppImage
```

## Funzionalità barra dei menu

- L'icona resta sempre in alto.
- Click destro / click sull'icona apre il menu rapido:
  - "In riproduzione: <nome>"
  - Mostra finestra, Play/Pausa, Ferma
  - Sottomenu TV con tutti i canali caricati
  - Sottomenu Radio con tutte le stazioni
- Su macOS il nome della stazione in onda viene mostrato accanto all'icona.

## Icona tray

Inserire un PNG monocromatico in `electron/tray-icon.png` (consigliato 36×36
con sfondo trasparente per macOS retina; verrà ridimensionato a 18×18 e usato
come template image). In assenza del file viene usata un'icona vuota.
