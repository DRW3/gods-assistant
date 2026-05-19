import { app, BrowserWindow, screen } from 'electron';
import path from 'path';
import { registerHotkeys, unregisterHotkeys } from './hotkey';
import { createTray } from './tray';
import { setupIPC } from './ipc';
import { startSidecar, stopSidecar } from './sidecar';

const isDev = !app.isPackaged;

let mainWindow: BrowserWindow | null = null;

function createWindow(): BrowserWindow {
  const { width: screenWidth, height: screenHeight } =
    screen.getPrimaryDisplay().workAreaSize;

  const winWidth = 500;
  const winHeight = 420;

  // Center horizontally, 20% from top
  const x = Math.round((screenWidth - winWidth) / 2);
  const y = Math.round(screenHeight * 0.2);

  const win = new BrowserWindow({
    width: winWidth,
    height: winHeight,
    x,
    y,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    hasShadow: false,
    vibrancy: 'under-window',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Load from Vite dev server or production build
  if (isDev) {
    win.loadURL('http://localhost:5173');
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  // Show window once content is ready
  win.once('ready-to-show', () => {
    win.show();
  });

  // Prevent window from closing — hide instead (stays in tray)
  win.on('close', (event) => {
    event.preventDefault();
    win.hide();
  });

  return win;
}

app.whenReady().then(() => {
  mainWindow = createWindow();

  // Wire up IPC handlers
  setupIPC(mainWindow);

  // Register global hotkeys
  registerHotkeys(mainWindow);

  // Create system tray
  createTray(mainWindow);

  // Start Python engine sidecar
  startSidecar();
});

// Unregister hotkeys and stop sidecar on quit
app.on('will-quit', () => {
  unregisterHotkeys();
  stopSidecar();
});

// Keep app alive in tray when all windows are closed
app.on('window-all-closed', () => {
  // Don't quit — keep running in tray
});
