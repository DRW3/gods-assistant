import { globalShortcut, BrowserWindow, app } from 'electron';

let lastKeyTime = 0;
let lastKey = '';

export function registerHotkeys(mainWindow: BrowserWindow): void {
  // O+G chord: handled via app-level keyboard hook on macOS
  // We keep Cmd+Shift+G as fallback (works globally without stealing keys)
  globalShortcut.register('CommandOrControl+Shift+G', () => {
    toggleOverlay(mainWindow);
  });

  // Cmd+Shift+S — toggle mute
  globalShortcut.register('CommandOrControl+Shift+S', () => {
    mainWindow.webContents.send('toggle-mute');
  });
}

function toggleOverlay(mainWindow: BrowserWindow): void {
  if (mainWindow.isVisible()) {
    mainWindow.hide();
  } else {
    mainWindow.show();
    mainWindow.focus();
    mainWindow.webContents.send('toggle-overlay');
  }
}

export function unregisterHotkeys(): void {
  globalShortcut.unregisterAll();
}

// Export for use in renderer via IPC
export { toggleOverlay };
