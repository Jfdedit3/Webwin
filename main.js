const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');

const isMac = process.platform === 'darwin';
let mainWindow;
let downloads = [];

function sendToRenderer(channel, payload) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send(channel, payload);
}

function registerDownloadEvents() {
  const ses = mainWindow.webContents.session;

  ses.on('will-download', (event, item) => {
    const id = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const entry = {
      id,
      fileName: item.getFilename(),
      url: item.getURL(),
      savePath: item.getSavePath(),
      totalBytes: item.getTotalBytes(),
      receivedBytes: 0,
      state: 'progressing'
    };

    downloads.unshift(entry);
    sendToRenderer('download-created', entry);

    item.on('updated', () => {
      entry.receivedBytes = item.getReceivedBytes();
      entry.totalBytes = item.getTotalBytes();
      entry.savePath = item.getSavePath();
      entry.state = item.isPaused() ? 'paused' : 'progressing';
      sendToRenderer('download-updated', entry);
    });

    item.once('done', (_, state) => {
      entry.receivedBytes = item.getReceivedBytes();
      entry.totalBytes = item.getTotalBytes();
      entry.savePath = item.getSavePath();
      entry.state = state;
      sendToRenderer('download-updated', entry);
    });
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1520,
    height: 940,
    minWidth: 1080,
    minHeight: 720,
    backgroundColor: '#070b16',
    autoHideMenuBar: true,
    title: 'Webwin',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: false,
      nodeIntegration: false,
      webviewTag: true
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'renderer', 'index.html'));

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    sendToRenderer('open-new-tab', url);
    return { action: 'deny' };
  });

  registerDownloadEvents();
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (!isMac) app.quit();
});

ipcMain.handle('open-external', async (_, url) => {
  if (!url) return false;
  await shell.openExternal(url);
  return true;
});

ipcMain.handle('show-item-in-folder', async (_, filePath) => {
  if (!filePath) return false;
  shell.showItemInFolder(filePath);
  return true;
});

ipcMain.handle('open-path', async (_, filePath) => {
  if (!filePath) return false;
  const result = await shell.openPath(filePath);
  return !result;
});

ipcMain.handle('get-downloads', async () => downloads);
