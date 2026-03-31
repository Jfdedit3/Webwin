const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('webwin', {
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  showItemInFolder: (filePath) => ipcRenderer.invoke('show-item-in-folder', filePath),
  openPath: (filePath) => ipcRenderer.invoke('open-path', filePath),
  getDownloads: () => ipcRenderer.invoke('get-downloads'),
  onOpenNewTab: (callback) => ipcRenderer.on('open-new-tab', (_, url) => callback(url)),
  onDownloadCreated: (callback) => ipcRenderer.on('download-created', (_, entry) => callback(entry)),
  onDownloadUpdated: (callback) => ipcRenderer.on('download-updated', (_, entry) => callback(entry))
});
