import { execFile, exec } from 'child_process';
import { screen, BrowserWindow } from 'electron';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// Highlight border removed — was causing transparent ghost windows

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

  // Force a NEW window (not tab) and run claude in it
  const script = `
tell application "Terminal"
  do script "clear && claude"
  delay 0.3
  set newWin to front window
  set bounds of newWin to {${x}, ${y}, ${x + w}, ${y + h}}
  set custom title of front tab of newWin to "${displayName}"
  activate
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

  const overlayW = 400;
  const gap = 2;
  const termX = 0;
  const termY = 0;
  const termW = sw - overlayW - gap;
  const termH = sh;

  // Strip special chars for AppleScript matching
  const safeName = searchTerm
    .replace(/[✳◂⠐⠂""\\]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 40);
  console.log(`[terminal-spawner] Searching for: "${safeName}"`);

  // Use keystroke matching: try first 15 chars (unique enough, avoids special char issues)
  const shortMatch = safeName.slice(0, 15).trim();

  // Just bring the matching window to front — don't resize or reposition
  const script = `
tell application "Terminal"
  repeat with w in windows
    set wName to name of w
    if wName contains "${shortMatch}" then
      set index of w to 1
      exit repeat
    end if
  end repeat
  activate
end tell

delay 0.3
tell application "System Events"
  set frontmost of process "Electron" to true
end tell
`;

  // Disabled: highlight border was causing visual glitches
  // showHighlightBorder(termX, termY, termW, termH);

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

export function layoutAllTerminals(): void {
  /**
   * Zero-waste layout:
   * - Terminals: fill left portion edge-to-edge, no gaps
   * - Overlay: pinned right, full height
   */
  const { width: sw, height: sh } = screen.getPrimaryDisplay().workAreaSize;

  const overlayW = 400;
  const gap = 2;
  const termX = 0;
  const termW = sw - overlayW - gap;
  const topY = 0;  // start from very top of work area
  const totalH = sh;
  const maxVisible = 3;

  const script = `
tell application "Terminal"
  set winCount to count of windows
  if winCount is 0 then return

  set visCount to winCount
  if visCount > ${maxVisible} then
    set visCount to ${maxVisible}
  end if

  set termHeight to (${totalH} / visCount) as integer

  set yPos to ${topY}
  repeat with i from 1 to winCount
    try
      if i <= ${maxVisible} then
        set miniaturized of window i to false
        set bounds of window i to {${termX}, yPos, ${termW}, yPos + termHeight}
        set yPos to yPos + termHeight
      else
        set miniaturized of window i to true
      end if
    end try
  end repeat
end tell
`;

  runAppleScript(script).then(() => {
    console.log('[terminal-spawner] Laid out all terminals on left half');
  }).catch((err) => {
    console.error(`[terminal-spawner] Layout failed: ${err.message}`);
  });
}
