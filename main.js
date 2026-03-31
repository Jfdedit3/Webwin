const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');

const isMac = process.platform === 'darwin';
let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 980,
    minHeight: 680,
    backgroundColor: '#0b1020',
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
    mainWindow.webContents.send('open-new-tab', url);
    return { action: 'deny' };
  });
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
