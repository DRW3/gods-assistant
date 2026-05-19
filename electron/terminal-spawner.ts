import { exec } from 'child_process';
import { screen } from 'electron';

interface TerminalWindow {
  sessionId: string;
  quadrant: number;
}

const activeTerminals: Map<string, TerminalWindow> = new Map();
let nextQuadrant = 0;

function getQuadrantBounds(quadrant: number): { x: number; y: number; w: number; h: number } {
  const { width: sw, height: sh } = screen.getPrimaryDisplay().workAreaSize;
  const overlayW = 540;
  const termW = Math.round((sw - overlayW) / 2 - 20);
  const termH = Math.round(sh / 2 - 30);
  const gap = 10;

  switch (quadrant % 4) {
    case 0: return { x: gap, y: gap + 25, w: termW, h: termH }; // top-left
    case 1: return { x: sw - termW - gap, y: gap + 25, w: termW, h: termH }; // top-right
    case 2: return { x: gap, y: termH + gap + 40, w: termW, h: termH }; // bottom-left
    case 3: return { x: sw - termW - gap, y: termH + gap + 40, w: termW, h: termH }; // bottom-right
    default: return { x: gap, y: gap + 25, w: termW, h: termH };
  }
}

export function spawnTerminal(sessionId: string, name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const q = nextQuadrant;
    nextQuadrant++;
    const { x, y, w, h } = getQuadrantBounds(q);

    const safeName = name.replace(/'/g, "\\'").replace(/"/g, '\\"');
    const safeId = sessionId.replace(/'/g, "\\'").replace(/"/g, '\\"');

    // AppleScript to open Terminal.app, set title, position window
    const script = [
      'tell application "Terminal"',
      '  activate',
      `  do script "echo '=== God\\'s Assistant: ${safeName} ===' && echo 'Session: ${safeId}' && echo '---'"`,
      '  delay 0.3',
      `  set bounds of front window to {${x}, ${y}, ${x + w}, ${y + h}}`,
      `  set custom title of front tab of front window to "${safeName}"`,
      'end tell',
    ].join('\n');

    exec(`osascript -e '${script.replace(/'/g, "'\\''")}'`, (err) => {
      if (err) {
        console.error(`[terminal-spawner] Failed to spawn: ${err.message}`);
        reject(err);
      } else {
        activeTerminals.set(sessionId, { sessionId, quadrant: q });
        console.log(`[terminal-spawner] Spawned terminal for ${sessionId} in quadrant ${q}`);
        resolve();
      }
    });
  });
}

export function focusTerminal(sessionId: string): void {
  const safeId = sessionId.replace(/"/g, '\\"');
  const script = `
    tell application "Terminal"
      activate
      set index of every window whose custom title of front tab contains "${safeId}" to 1
    end tell
  `;
  exec(`osascript -e '${script}'`, (err) => {
    if (err) console.error(`[terminal-spawner] Focus failed: ${err.message}`);
  });
}

export function closeTerminal(sessionId: string): void {
  activeTerminals.delete(sessionId);
  const safeId = sessionId.replace(/"/g, '\\"');
  const script = `
    tell application "Terminal"
      close (every window whose custom title of front tab contains "${safeId}")
    end tell
  `;
  exec(`osascript -e '${script}'`, (err) => {
    if (err) console.error(`[terminal-spawner] Close failed: ${err.message}`);
  });
}

export function getActiveTerminalCount(): number {
  return activeTerminals.size;
}
