import { globalShortcut, BrowserWindow, app, screen } from 'electron';
import { layoutAllTerminals, hideHighlightBorder } from './terminal-spawner';

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
    // Hide: move overlay back to center, hide highlight
    mainWindow.hide();
    hideHighlightBorder();
  } else {
    // Show: position overlay on right half, arrange terminals on left
    const { width: sw, height: sh } = screen.getPrimaryDisplay().workAreaSize;
    const overlayW = Math.round(sw / 2) - 10;
    mainWindow.setBounds({
      x: Math.round(sw / 2),
      y: 25,
      width: overlayW,
      height: mainWindow.getBounds().height,
    });
    mainWindow.show();
    mainWindow.focus();
    mainWindow.webContents.send('toggle-overlay');

    // Auto-layout all Terminal windows on the left half
    layoutAllTerminals();
  }
}

export function unregisterHotkeys(): void {
  globalShortcut.unregisterAll();
}

// Export for use in renderer via IPC
export { toggleOverlay };
