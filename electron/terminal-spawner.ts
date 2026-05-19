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
  if (term) {
    focusAndPositionTerminal(term.name);
  }
}

export function focusSystemTerminal(windowName: string): void {
  focusAndPositionTerminal(windowName);
}

function focusAndPositionTerminal(searchTerm: string): void {
  const { width: sw, height: sh } = screen.getPrimaryDisplay().workAreaSize;

  // Selected terminal: left half of screen, full height
  const termX = 0;
  const termY = 25;
  const termW = Math.round(sw / 2) - 10;
  const termH = sh - 35;

  // Overlay will be on the right side
  const safeName = searchTerm.replace(/"/g, '\\"').replace(/\\/g, '\\\\');

  // Use partial matching — try first few significant words
  const searchWords = safeName.split(/[\s—◂·]+/).filter(w => w.length > 2).slice(0, 3).join(' ');
  const searchShort = searchWords || safeName.slice(0, 20);

  const script = `
tell application "Terminal"
  set found to false
  repeat with w in windows
    set wName to name of w
    if wName contains "${searchShort}" then
      set bounds of w to {${termX}, ${termY}, ${termX + termW}, ${termY + termH}}
      set index of w to 1
      set found to true
      exit repeat
    end if
  end repeat
  if not found then
    -- Fallback: just bring first window to front
    if (count of windows) > 0 then
      set bounds of window 1 to {${termX}, ${termY}, ${termX + termW}, ${termY + termH}}
    end if
  end if
  activate
end tell

delay 0.2
tell application "System Events"
  set frontmost of process "Electron" to true
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
