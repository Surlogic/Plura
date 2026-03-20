const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const appRoot = path.resolve(__dirname, '..');
const outDir = path.join(appRoot, '.test-build');
const tsconfigPath = path.join(appRoot, 'tsconfig.unit.json');
const tscCliPath = require.resolve('typescript/lib/tsc');

fs.rmSync(outDir, { recursive: true, force: true });

const compile = spawnSync(process.execPath, [tscCliPath, '-p', tsconfigPath], {
  cwd: appRoot,
  stdio: 'inherit',
});

if ((compile.status ?? 1) !== 0) {
  process.exit(compile.status ?? 1);
}

const collectTests = (dir) => {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return collectTests(fullPath);
    return fullPath.endsWith('.test.js') ? [fullPath] : [];
  });
};

const testsRoot = path.join(outDir, 'apps', 'web', 'src');
const testFiles = collectTests(testsRoot);

if (testFiles.length === 0) {
  console.error('No unit tests were compiled.');
  process.exit(1);
}

const run = spawnSync(process.execPath, ['--test', ...testFiles], {
  cwd: appRoot,
  stdio: 'inherit',
});

process.exit(run.status ?? 1);
