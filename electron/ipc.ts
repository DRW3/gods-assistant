import { ipcMain, BrowserWindow } from 'electron';

export function setupIPC(mainWindow: BrowserWindow): void {
  // Hide overlay window
  ipcMain.on('hide-overlay', () => {
    mainWindow.hide();
  });

  // Get audio devices — renderer uses navigator.mediaDevices directly,
  // this is a fallback/placeholder that returns an empty list
  ipcMain.handle('get-audio-devices', async () => {
    return [];
  });
}
