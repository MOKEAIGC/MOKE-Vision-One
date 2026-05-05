import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const devUrl = 'http://127.0.0.1:3000';

async function isDevServerReachable() {
  try {
    const response = await fetch(devUrl, {
      signal: AbortSignal.timeout(1000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

if (await isDevServerReachable()) {
  console.log(`[tauri-dev] Reusing existing dev server at ${devUrl}`);
  process.exit(0);
}

const command = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const child = spawn(command, ['run', 'dev', '--', '--strictPort'], {
  cwd: projectRoot,
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: process.env,
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});