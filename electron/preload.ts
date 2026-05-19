import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // Overlay toggle from hotkey
  onToggleOverlay(callback: () => void) {
    ipcRenderer.on('toggle-overlay', () => callback());
  },

  // Orb state updates from engine
  onOrbState(callback: (state: string) => void) {
    ipcRenderer.on('orb-state', (_event: IpcRendererEvent, state: string) =>
      callback(state)
    );
  },

  // Hide the overlay window
  hideOverlay() {
    ipcRenderer.send('hide-overlay');
  },

  // Get available audio devices
  getAudioDevices(): Promise<unknown[]> {
    return ipcRenderer.invoke('get-audio-devices');
  },

  // Generic send (fire-and-forget)
  send(channel: string, data?: unknown) {
    ipcRenderer.send(channel, data);
  },

  // Generic invoke (request-response)
  invoke(channel: string, data?: unknown): Promise<unknown> {
    return ipcRenderer.invoke(channel, data);
  },

  // Generic listener with cleanup
  on(channel: string, callback: (...args: unknown[]) => void) {
    const listener = (_event: IpcRendererEvent, ...args: unknown[]) =>
      callback(...args);
    ipcRenderer.on(channel, listener);
    return () => {
      ipcRenderer.removeListener(channel, listener);
    };
  },
});
