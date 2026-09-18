const { app, BrowserWindow, shell } = require('electron');
const path = require('node:path');
const fs = require('node:fs');

// In development the window loads `ng serve`; a packaged app loads the built bundle.
const DEV_SERVER_URL = process.env.IBTICARE_DEV_SERVER_URL || 'http://localhost:4200';
const BUILT_INDEX = path.join(__dirname, 'dist', 'ibticare-poc', 'browser', 'index.html');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    // The renderer is a plain Angular app and uses no Node APIs, so keep it sandboxed.
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (app.isPackaged && fs.existsSync(BUILT_INDEX)) {
    mainWindow.loadFile(BUILT_INDEX);
  } else {
    mainWindow.loadURL(DEV_SERVER_URL);
  }

  // Keep external links in the user's browser instead of opening unsandboxed windows.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
