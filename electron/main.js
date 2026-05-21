// Wrapper Electron per macOS (e Win/Linux) — aggiunge un'icona nella
// barra dei menu (Tray) con menu rapido per cambiare canale/radio.
// La UI è la stessa web app PWA (index.html) usata anche da iPhone/iPad.

const { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage } = require('electron');
const path = require('path');

let mainWindow = null;
let tray = null;
let currentItem = null;
let catalogCache = { tv: [], radio: [] };

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 420,
    height: 760,
    minWidth: 360,
    minHeight: 560,
    backgroundColor: '#000000',
    titleBarStyle: 'hiddenInset',
    title: 'myTV',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'index.html'));

  mainWindow.on('close', (e) => {
    if (!app.isQuiting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });
}

function buildMenu() {
  const tvItems = (catalogCache.tv || []).map(c => ({
    label: c.name + (currentItem === c.name ? '  ●' : ''),
    enabled: !!c.stream,
    click: () => playInRenderer(c.name, 'tv'),
  }));
  const radioItems = (catalogCache.radio || []).map(c => ({
    label: c.name + (currentItem === c.name ? '  ●' : ''),
    click: () => playInRenderer(c.name, 'radio'),
  }));

  return Menu.buildFromTemplate([
    { label: currentItem ? 'In riproduzione: ' + currentItem : 'myTV', enabled: false },
    { type: 'separator' },
    { label: 'Mostra finestra', click: () => { mainWindow.show(); mainWindow.focus(); } },
    { label: 'Pausa/Play', accelerator: 'Space', click: () => mainWindow.webContents.send('mytv:toggle') },
    { label: 'Ferma riproduzione', click: () => mainWindow.webContents.send('mytv:stop') },
    { type: 'separator' },
    { label: 'TV', submenu: tvItems.length ? tvItems : [{ label: '(carica una lista canali)', enabled: false }] },
    { label: 'Radio', submenu: radioItems },
    { type: 'separator' },
    { label: 'Esci', click: () => { app.isQuiting = true; app.quit(); } },
  ]);
}

function refreshTray() {
  if (!tray) return;
  tray.setContextMenu(buildMenu());
  tray.setToolTip(currentItem ? 'myTV — ' + currentItem : 'myTV');
  // Titolo testuale a fianco dell'icona (visibile solo su macOS)
  if (process.platform === 'darwin') {
    tray.setTitle(currentItem ? '  ' + currentItem : '');
  }
}

function playInRenderer(name, kind) {
  mainWindow.webContents.send('mytv:play', { name, kind });
}

function createTray() {
  const iconPath = path.join(__dirname, 'tray-icon.png');
  let image = nativeImage.createFromPath(iconPath);
  if (image.isEmpty()) {
    // Fallback: icona vuota 16x16
    image = nativeImage.createEmpty();
  } else if (process.platform === 'darwin') {
    image = image.resize({ width: 18, height: 18 });
    image.setTemplateImage(true);
  }
  tray = new Tray(image);
  refreshTray();
  tray.on('click', () => {
    if (process.platform !== 'darwin') {
      mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
    }
  });
}

app.whenReady().then(() => {
  createWindow();
  createTray();

  ipcMain.on('mytv:catalog', (_, data) => {
    catalogCache = data || { tv: [], radio: [] };
    refreshTray();
  });
  ipcMain.on('mytv:now-playing', (_, name) => {
    currentItem = name || null;
    refreshTray();
  });
});

app.on('window-all-closed', (e) => {
  // Su macOS l'app resta viva con la tray; su altri sistemi può chiudersi
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (mainWindow) mainWindow.show();
});
