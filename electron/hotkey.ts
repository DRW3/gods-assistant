import { globalShortcut, BrowserWindow } from 'electron';

export function registerHotkeys(mainWindow: BrowserWindow): void {
  // Option+G — toggle overlay visibility
  globalShortcut.register('Alt+G', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      mainWindow.focus();
      mainWindow.webContents.send('toggle-overlay');
    }
  });

  // Cmd+Shift+S — toggle mute
  globalShortcut.register('CommandOrControl+Shift+S', () => {
    mainWindow.webContents.send('toggle-mute');
  });
}

export function unregisterHotkeys(): void {
  globalShortcut.unregisterAll();
}
