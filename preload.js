const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('webwin', {
  pickFolder: () => ipcRenderer.invoke('pick-folder'),
  openPath: (filePath) => ipcRenderer.invoke('open-path', filePath),
  showItemInFolder: (filePath) => ipcRenderer.invoke('show-item-in-folder', filePath)
});
