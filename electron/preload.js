const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('mytvBridge', {
  sendCatalog: (data) => ipcRenderer.send('mytv:catalog', data),
  sendNowPlaying: (name) => ipcRenderer.send('mytv:now-playing', name),
  onPlay: (cb) => ipcRenderer.on('mytv:play', (_, payload) => cb(payload)),
  onToggle: (cb) => ipcRenderer.on('mytv:toggle', cb),
  onStop: (cb) => ipcRenderer.on('mytv:stop', cb),
});
