import { Tray, Menu, nativeImage, BrowserWindow, app } from 'electron';
import path from 'path';

let tray: Tray | null = null;

export function createTray(mainWindow: BrowserWindow): Tray {
  // Use a small system-level icon. In production, swap for a custom icon from assets/
  const iconPath = path.join(__dirname, '..', 'assets', 'icon.png');
  let icon: Electron.NativeImage;

  try {
    icon = nativeImage.createFromPath(iconPath);
    if (icon.isEmpty()) throw new Error('empty');
  } catch {
    // Fallback: create a tiny 16x16 blank icon if asset doesn't exist yet
    icon = nativeImage.createEmpty();
  }

  // Resize for tray (macOS expects 16x16 or 22x22)
  if (!icon.isEmpty()) {
    icon = icon.resize({ width: 16, height: 16 });
  }

  tray = new Tray(icon);
  tray.setToolTip("God's Assistant");

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show/Hide',
      click: () => {
        if (mainWindow.isVisible()) {
          mainWindow.hide();
        } else {
          mainWindow.show();
          mainWindow.focus();
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
  return tray;
}
