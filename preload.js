const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('webwin', {
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  onOpenNewTab: (callback) => ipcRenderer.on('open-new-tab', (_, url) => callback(url))
});
