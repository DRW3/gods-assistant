import { execFile, exec } from 'child_process';
import { screen } from 'electron';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

interface TerminalWindow {
  sessionId: string;
  quadrant: number;
  name: string;
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
    case 0: return { x: gap, y: gap + 25, w: termW, h: termH };
    case 1: return { x: sw - termW - gap, y: gap + 25, w: termW, h: termH };
    case 2: return { x: gap, y: termH + gap + 40, w: termW, h: termH };
    case 3: return { x: sw - termW - gap, y: termH + gap + 40, w: termW, h: termH };
    default: return { x: gap, y: gap + 25, w: termW, h: termH };
  }
}

function runAppleScript(script: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const tmpFile = join(tmpdir(), `gods-assistant-${Date.now()}.scpt`);
    writeFileSync(tmpFile, script, 'utf8');
    execFile('osascript', [tmpFile], (err, stdout) => {
      try { unlinkSync(tmpFile); } catch (_) { /* ignore */ }
      if (err) reject(err);
      else resolve(stdout.trim());
    });
  });
}

export function spawnTerminal(sessionId: string, name: string): Promise<void> {
  const q = nextQuadrant;
  nextQuadrant++;
  const { x, y, w, h } = getQuadrantBounds(q);

  const displayName = name || `Session ${q + 1}`;

  // Launch claude in the new terminal so it's a real Claude session
  const script = `
tell application "Terminal"
  activate
  do script "clear && claude"
  delay 0.5
  set bounds of front window to {${x}, ${y}, ${x + w}, ${y + h}}
  set custom title of front tab of front window to "${displayName}"
end tell
`;

  return runAppleScript(script).then(() => {
    activeTerminals.set(sessionId, { sessionId, quadrant: q, name: displayName });
    console.log(`[terminal-spawner] Spawned "${displayName}" in quadrant ${q}`);
  }).catch((err) => {
    console.error(`[terminal-spawner] Failed: ${err.message}`);
  });
}

export function focusTerminal(sessionId: string): void {
  const term = activeTerminals.get(sessionId);
  if (!term) return;

  const script = `
tell application "Terminal"
  activate
  repeat with w in windows
    if custom title of front tab of w contains "${term.name}" then
      set index of w to 1
      exit repeat
    end if
  end repeat
end tell
`;
  runAppleScript(script).catch((err) => {
    console.error(`[terminal-spawner] Focus failed: ${err.message}`);
  });
}

export function closeTerminal(sessionId: string): void {
  const term = activeTerminals.get(sessionId);
  activeTerminals.delete(sessionId);
  if (!term) return;

  const script = `
tell application "Terminal"
  repeat with w in windows
    if custom title of front tab of w contains "${term.name}" then
      close w
      exit repeat
    end if
  end repeat
end tell
`;
  runAppleScript(script).catch((err) => {
    console.error(`[terminal-spawner] Close failed: ${err.message}`);
  });
}

export function getActiveTerminalCount(): number {
  return activeTerminals.size;
}
