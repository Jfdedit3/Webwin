const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');

const isMac = process.platform === 'darwin';
let mainWindow;

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp']);

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1560,
    height: 960,
    minWidth: 1100,
    minHeight: 760,
    backgroundColor: '#050914',
    autoHideMenuBar: true,
    title: 'Webwin Gallery',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: false,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'renderer', 'index.html'));
}

function scanDirectoryRecursive(dirPath, files = []) {
  let entries = [];
  try {
    entries = fs.readdirSync(dirPath, { withFileTypes: true });
  } catch {
    return files;
  }

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      scanDirectoryRecursive(fullPath, files);
      continue;
    }

    const ext = path.extname(entry.name).toLowerCase();
    if (!IMAGE_EXTENSIONS.has(ext)) continue;

    let stat;
    try {
      stat = fs.statSync(fullPath);
    } catch {
      continue;
    }

    files.push({
      id: `${stat.mtimeMs}_${entry.name}_${files.length}`,
      name: entry.name,
      path: fullPath,
      directory: dirPath,
      extension: ext,
      size: stat.size,
      modifiedAt: stat.mtime.toISOString(),
      createdAt: stat.birthtime.toISOString(),
      fileUrl: `file://${fullPath.replace(/\\/g, '/')}`
    });
  }

  return files;
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

ipcMain.handle('pick-folder', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  });

  if (result.canceled || !result.filePaths?.length) {
    return { canceled: true, folderPath: null, images: [] };
  }

  const folderPath = result.filePaths[0];
  const images = scanDirectoryRecursive(folderPath).sort((a, b) => a.name.localeCompare(b.name));
  return { canceled: false, folderPath, images };
});

ipcMain.handle('open-path', async (_, filePath) => {
  if (!filePath) return false;
  const result = await shell.openPath(filePath);
  return !result;
});

ipcMain.handle('show-item-in-folder', async (_, filePath) => {
  if (!filePath) return false;
  shell.showItemInFolder(filePath);
  return true;
});
