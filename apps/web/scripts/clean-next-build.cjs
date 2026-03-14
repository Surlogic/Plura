const fs = require('fs');
const path = require('path');

const appDir = path.join(__dirname, '..');
const workspaceRoot = path.resolve(appDir, '..', '..');
const externalRoot = path.join(workspaceRoot, '.cache', 'apps-web');
const externalNodeModulesLink = path.join(externalRoot, 'node_modules');
const appNodeModulesPath = path.join(appDir, 'node_modules');
const buildDir = process.env.NEXT_BUILD_DIR || '.next';
const mode = process.argv[2] || 'clean';

const managedDirs = {
  '.next': path.join(externalRoot, 'next-dev'),
  '.next-build': path.join(externalRoot, 'next-build'),
};

const staleMatchers = [
  /^\.next\.preclean$/,
  /^\.next-build-/,
  /^\.next\.stale-/,
  /^\.next_stale_/,
  /^\.next_/,
];
const retryableRemoveErrors = new Set(['EBUSY', 'ENOTEMPTY', 'EPERM']);
const sleepBuffer = new Int32Array(new SharedArrayBuffer(4));

const fail = (message, error) => {
  console.error(message, error);
  process.exit(1);
};

const removePath = (targetPath) => {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      fs.rmSync(targetPath, { recursive: true, force: true });
      return;
    } catch (error) {
      if (!error || !retryableRemoveErrors.has(error.code) || attempt === 7) {
        fail(`No se pudo limpiar ${targetPath}.`, error);
      }

      Atomics.wait(sleepBuffer, 0, 0, 120 * (attempt + 1));
    }
  }
};

const ensureDir = (targetPath) => {
  try {
    fs.mkdirSync(targetPath, { recursive: true });
  } catch (error) {
    fail(`No se pudo crear ${targetPath}.`, error);
  }
};

const ensureSymlink = (linkName, targetPath) => {
  const linkPath = path.join(appDir, linkName);
  const linkType = process.platform === 'win32' ? 'junction' : 'dir';
  ensureDir(path.dirname(targetPath));
  ensureDir(targetPath);

  try {
    const stats = fs.lstatSync(linkPath);
    if (stats.isSymbolicLink()) {
      const currentTarget = fs.readlinkSync(linkPath);
      const resolvedCurrent = path.resolve(appDir, currentTarget);
      const resolvedExpected = path.resolve(targetPath);
      if (process.platform !== 'win32' && resolvedCurrent === resolvedExpected) {
        return;
      }
    }
    removePath(linkPath);
  } catch (error) {
    if (error && error.code !== 'ENOENT') {
      fail(`No se pudo inspeccionar ${linkPath}.`, error);
    }
  }

  try {
    fs.symlinkSync(targetPath, linkPath, linkType);
  } catch (error) {
    fail(`No se pudo enlazar ${linkPath} -> ${targetPath}.`, error);
  }
};

const ensureExternalNodeModulesLink = () => {
  ensureDir(externalRoot);

  try {
    const stats = fs.lstatSync(externalNodeModulesLink);
    if (stats.isSymbolicLink() || stats.isDirectory()) {
      const currentTarget = fs.readlinkSync(externalNodeModulesLink);
      const resolvedCurrent = path.resolve(externalRoot, currentTarget);
      const resolvedExpected = path.resolve(appNodeModulesPath);
      if (resolvedCurrent === resolvedExpected) {
        return;
      }
    }
    removePath(externalNodeModulesLink);
  } catch (error) {
    if (error && error.code !== 'ENOENT' && error.code !== 'EINVAL') {
      fail(`No se pudo inspeccionar ${externalNodeModulesLink}.`, error);
    }

    if (error && error.code === 'EINVAL') {
      removePath(externalNodeModulesLink);
    }
  }

  try {
    fs.symlinkSync(appNodeModulesPath, externalNodeModulesLink, 'junction');
  } catch (error) {
    fail(`No se pudo enlazar ${externalNodeModulesLink} -> ${appNodeModulesPath}.`, error);
  }
};

const clearDirectoryContents = (dirPath) => {
  ensureDir(dirPath);
  try {
    for (const entry of fs.readdirSync(dirPath)) {
      removePath(path.join(dirPath, entry));
    }
  } catch (error) {
    fail(`No se pudo vaciar ${dirPath}.`, error);
  }
};

for (const [linkName, targetPath] of Object.entries(managedDirs)) {
  ensureSymlink(linkName, targetPath);
}

ensureExternalNodeModulesLink();

for (const entry of fs.readdirSync(appDir, { withFileTypes: true })) {
  if (!entry.isDirectory()) {
    continue;
  }
  if (!staleMatchers.some((matcher) => matcher.test(entry.name))) {
    continue;
  }
  removePath(path.join(appDir, entry.name));
}

if (mode === 'clean') {
  const targetPath = managedDirs[buildDir];
  if (!targetPath) {
    fail(`NEXT_BUILD_DIR no soportado: ${buildDir}`);
  }
  clearDirectoryContents(targetPath);
} else if (mode !== 'ensure') {
  fail(`Modo no soportado: ${mode}`);
}
