const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

// Check if we're in development or production
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

let mainWindow;
let serverProcess;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true // Set to true for security
      // Removed allowRunningInsecureContent for security
    },
    icon: path.join(__dirname, 'assets/icon.png')
  });

  // In production, we'll use the public folder
  // In development, we use the localhost server
  const indexPath = isDev
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, './public/index.html')}`;
    
  console.log('Loading URL:', indexPath);
  mainWindow.loadURL(indexPath);

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function startServer() {
  serverProcess = spawn('node', [path.join(__dirname, 'server/server.js')], {
    stdio: 'inherit'
  });
}

app.whenReady().then(() => {
  startServer();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});