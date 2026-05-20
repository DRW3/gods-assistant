import { globalShortcut, BrowserWindow, screen } from 'electron';

export function registerHotkeys(mainWindow: BrowserWindow): void {
  globalShortcut.register('CommandOrControl+Shift+G', () => {
    toggleOverlay(mainWindow);
  });

  globalShortcut.register('CommandOrControl+Shift+S', () => {
    mainWindow.webContents.send('toggle-mute');
  });
}

function toggleOverlay(mainWindow: BrowserWindow): void {
  if (mainWindow.isVisible()) {
    mainWindow.hide();
  } else {
    // Show centered on screen
    const { width: sw, height: sh } = screen.getPrimaryDisplay().workAreaSize;
    const overlayW = 540;
    mainWindow.setBounds({
      x: Math.round((sw - overlayW) / 2),
      y: Math.round(sh * 0.1),
      width: overlayW,
      height: Math.max(mainWindow.getBounds().height, 200),
    });
    mainWindow.show();
    mainWindow.focus();
    mainWindow.webContents.send('toggle-overlay');
  }
}

export function unregisterHotkeys(): void {
  globalShortcut.unregisterAll();
}

export { toggleOverlay };
