import { ipcMain, BrowserWindow } from 'electron';
import { spawnTerminal, focusTerminal, focusSystemTerminal, closeTerminal } from './terminal-spawner';

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

  // Auto-resize window height from renderer
  ipcMain.handle('resize-window', (_event, { height }: { height: number }) => {
    if (mainWindow) {
      const [width] = mainWindow.getSize();
      mainWindow.setSize(width, Math.round(height));
    }
  });

  // Terminal window management
  ipcMain.handle('spawn-terminal', async (_event, { sessionId, name }: { sessionId: string; name: string }) => {
    await spawnTerminal(sessionId, name);
    return { success: true };
  });

  ipcMain.handle('focus-terminal', async (_event, { sessionId, windowName }: { sessionId: string; windowName?: string }) => {
    console.log(`[ipc] focus-terminal: sessionId=${sessionId}, windowName=${windowName}`);
    if (windowName) {
      const { width: sw } = require('electron').screen.getPrimaryDisplay().workAreaSize;
      const overlayW = 400;
      const currentH = mainWindow.getBounds().height;
      mainWindow.setBounds({ x: sw - overlayW, y: 0, width: overlayW, height: Math.max(currentH, 200) });
      focusSystemTerminal(windowName);
    } else {
      focusTerminal(sessionId);
    }
    return { success: true };
  });

  ipcMain.handle('close-terminal', async (_event, { sessionId }: { sessionId: string }) => {
    closeTerminal(sessionId);
    return { success: true };
  });
}
