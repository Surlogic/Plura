#!/usr/bin/env node

const { execSync } = require('node:child_process');
const { resolve } = require('node:path');

const portArg = process.argv[2] || '3000';
const port = Number.parseInt(portArg, 10);

if (!Number.isInteger(port) || port <= 0 || port > 65535) {
  console.error(`[predev] Invalid port: ${portArg}`);
  process.exit(1);
}

const rootDir = resolve(__dirname, '..');
const sleepBuffer = new Int32Array(new SharedArrayBuffer(4));
const normalizedRootDir = rootDir.toLowerCase();
const normalizedRootDirPosix = normalizedRootDir.replace(/\\/g, '/');

function run(command, options = {}) {
  try {
    return execSync(command, {
      cwd: rootDir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      ...options,
    });
  } catch (error) {
    if (options.ignoreError) {
      return '';
    }

    const stderr = error && error.stderr ? String(error.stderr).trim() : '';
    const stdout = error && error.stdout ? String(error.stdout).trim() : '';
    const details = stderr || stdout || String(error.message || error);
    throw new Error(details);
  }
}

function runOutput(command, options = {}) {
  return String(run(command, options) || '').trim();
}

function cleanWebArtifactsIfNeeded() {
  if (port !== 3002) {
    return;
  }

  console.log('[predev] Limpiando artefactos Next de apps/web');
  run('node apps/web/scripts/clean-next-build.cjs clean');
}

function getListeningPidsWindows() {
  const output = run('netstat -ano -p TCP', { ignoreError: true });
  const lines = output.split(/\r?\n/);
  const pids = new Set();

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }

    // Example: TCP    0.0.0.0:3002    0.0.0.0:0    LISTENING    12345
    const parts = trimmed.split(/\s+/);
    if (parts.length < 5) {
      continue;
    }

    const localAddress = parts[1];
    const state = parts[3];
    const pid = parts[4];

    if (state !== 'LISTENING') {
      continue;
    }

    const portMatch = localAddress.match(/:(\d+)$/);
    if (!portMatch) {
      continue;
    }

    if (Number.parseInt(portMatch[1], 10) === port) {
      pids.add(pid);
    }
  }

  return [...pids];
}

function getProcessInfoWindows(pid) {
  const output = runOutput(
    `powershell -NoProfile -Command "$p = Get-CimInstance Win32_Process -Filter \\\"ProcessId = ${pid}\\\"; if ($p) { $p | Select-Object ProcessId,ParentProcessId,CommandLine | ConvertTo-Json -Compress }"`,
    { ignoreError: true },
  );

  if (!output) {
    return null;
  }

  try {
    return JSON.parse(output);
  } catch {
    return null;
  }
}

function isManagedWebCommand(commandLine) {
  const normalized = String(commandLine || '').toLowerCase();

  return (
    normalized.includes(`${normalizedRootDir}\\apps\\web\\`) ||
    normalized.includes(`${normalizedRootDirPosix}/apps/web/`) ||
    normalized.includes(`${normalizedRootDir}\\node_modules\\next\\dist\\server\\lib\\start-server.js`) ||
    normalized.includes(`${normalizedRootDirPosix}/node_modules/next/dist/server/lib/start-server.js`) ||
    normalized.includes('pnpm dev:web') ||
    normalized.includes('pnpm.cmd dev:web') ||
    normalized.includes('pnpm -c apps/web dev') ||
    normalized.includes('pnpm.cmd -c apps/web dev') ||
    normalized.includes('next dev --webpack -p 3002') ||
    normalized.includes('next dev -p 3002')
  );
}

function getKillTargetsWindows(pids) {
  const targets = new Set();

  for (const pid of pids) {
    let targetPid = String(pid);
    let current = getProcessInfoWindows(pid);
    let depth = 0;

    while (current && current.ParentProcessId && depth < 8) {
      const parent = getProcessInfoWindows(current.ParentProcessId);
      if (!parent || !isManagedWebCommand(parent.CommandLine)) {
        break;
      }

      targetPid = String(parent.ProcessId);
      current = parent;
      depth += 1;
    }

    targets.add(targetPid);
  }

  return [...targets];
}

function getListeningPidsUnix() {
  const output = run(`ss -ltnp "sport = :${port}" 2>/dev/null`, { ignoreError: true });
  const pids = new Set();

  for (const line of output.split(/\r?\n/)) {
    const matches = line.matchAll(/pid=(\d+)/g);
    for (const match of matches) {
      pids.add(match[1]);
    }
  }

  return [...pids];
}

function getListeningPids() {
  if (process.platform === 'win32') {
    return getListeningPidsWindows();
  }

  return getListeningPidsUnix();
}

function killPid(pid, options = {}) {
  if (process.platform === 'win32') {
    const treeFlag = options.tree ? ' /T' : '';
    run(`taskkill /PID ${pid}${treeFlag} /F`, { ignoreError: true });
    return;
  }

  run(`kill ${pid}`, { ignoreError: true });
}

function freePort() {
  const listeningPids = getListeningPids();
  if (listeningPids.length === 0) {
    return;
  }

  const killTargets = process.platform === 'win32'
    ? getKillTargetsWindows(listeningPids)
    : listeningPids;

  for (const pid of killTargets) {
    console.log(`[predev] Terminando proceso previo en :${port} (pid ${pid})`);
    killPid(pid, { tree: process.platform === 'win32' });
  }

  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    if (getListeningPids().length === 0) {
      return;
    }

    Atomics.wait(sleepBuffer, 0, 0, 150);
  }

  throw new Error(`No se pudo liberar el puerto :${port}.`);
}

try {
  freePort();
  cleanWebArtifactsIfNeeded();
} catch (error) {
  console.error(`[predev] ${error.message}`);
  process.exit(1);
}
