import { ChildProcess, spawn } from 'child_process';
import path from 'path';

let sidecarProcess: ChildProcess | null = null;
let shouldRestart = true;

const ENGINE_DIR = path.join(__dirname, '..', 'engine');
const PYTHON_BIN = path.join(ENGINE_DIR, '.venv', 'bin', 'python');
const ENTRY_SCRIPT = 'main.py';

function log(msg: string): void {
  console.log(`[engine] ${msg}`);
}

export function startSidecar(): void {
  // In dev mode, skip sidecar — engine is started manually via scripts/dev.sh
  if (process.env.NODE_ENV === 'development') {
    log('Dev mode — skipping sidecar (start engine manually: cd engine && python main.py)');
    return;
  }

  shouldRestart = true;

  const spawnProcess = () => {
    log(`Starting Python sidecar: ${PYTHON_BIN} ${ENTRY_SCRIPT}`);

    sidecarProcess = spawn(PYTHON_BIN, [ENTRY_SCRIPT], {
      cwd: ENGINE_DIR,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    sidecarProcess.stdout?.on('data', (data: Buffer) => {
      const lines = data.toString().trim().split('\n');
      for (const line of lines) {
        log(line);
      }
    });

    sidecarProcess.stderr?.on('data', (data: Buffer) => {
      const lines = data.toString().trim().split('\n');
      for (const line of lines) {
        log(`[stderr] ${line}`);
      }
    });

    sidecarProcess.on('error', (err: Error) => {
      log(`Failed to start sidecar: ${err.message}`);
    });

    sidecarProcess.on('exit', (code: number | null, signal: string | null) => {
      log(`Sidecar exited with code=${code} signal=${signal}`);
      sidecarProcess = null;

      // Auto-restart on non-zero exit after 2 seconds
      if (shouldRestart && code !== 0) {
        log('Restarting sidecar in 2s...');
        setTimeout(spawnProcess, 2000);
      }
    });
  };

  spawnProcess();
}

export function stopSidecar(): void {
  shouldRestart = false;

  if (sidecarProcess) {
    log('Stopping sidecar (SIGTERM)...');
    sidecarProcess.kill('SIGTERM');
    sidecarProcess = null;
  }
}
