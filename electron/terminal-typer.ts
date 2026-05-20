/**
 * Types text into a Terminal.app window using AppleScript.
 * This sends actual keystrokes to the terminal, so the visible
 * claude session receives the command — not an invisible subprocess.
 */
import { execFile } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

function runAppleScript(script: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const tmpFile = join(tmpdir(), `gods-typer-${Date.now()}.scpt`);
    writeFileSync(tmpFile, script, 'utf8');
    execFile('osascript', [tmpFile], (err, stdout) => {
      try { unlinkSync(tmpFile); } catch (_) { /* ignore */ }
      if (err) reject(err);
      else resolve(stdout.trim());
    });
  });
}

export async function typeIntoTerminal(windowSearch: string, text: string): Promise<boolean> {
  const safeSearch = windowSearch
    .replace(/[✳◂⠐⠂""\\]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 15);

  const safeText = text.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

  console.log(`[terminal-typer] Typing into window matching "${safeSearch}": ${text.slice(0, 50)}...`);

  const script = `
tell application "Terminal"
  set targetWin to missing value
  repeat with w in windows
    if name of w contains "${safeSearch}" then
      set targetWin to w
      exit repeat
    end if
  end repeat

  if targetWin is not missing value then
    -- Bring window to front and type
    set index of targetWin to 1
    activate
    delay 0.2
    tell application "System Events"
      tell process "Terminal"
        keystroke "${safeText}"
        delay 0.1
        keystroke return
      end tell
    end tell
    return "typed"
  else
    return "not_found"
  end if
end tell
`;

  try {
    const result = await runAppleScript(script);
    console.log(`[terminal-typer] Result: ${result}`);
    return result === 'typed';
  } catch (err: any) {
    console.error(`[terminal-typer] Failed: ${err.message}`);
    return false;
  }
}
