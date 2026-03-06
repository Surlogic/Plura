const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

const resolvePackageDir = (pkgName) => {
  try {
    const pkgJsonPath = require.resolve(`${pkgName}/package.json`, { paths: [projectRoot] });
    return path.dirname(pkgJsonPath);
  } catch {
    const pkgJsonPath = require.resolve(`${pkgName}/package.json`, { paths: [workspaceRoot] });
    return path.dirname(pkgJsonPath);
  }
};

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];
config.resolver.disableHierarchicalLookup = true;
// pnpm isolated linker can break transitive resolution during Metro bundling.
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  'whatwg-fetch': resolvePackageDir('whatwg-fetch'),
  'react-devtools-core': resolvePackageDir('react-devtools-core'),
  'regenerator-runtime': resolvePackageDir('regenerator-runtime'),
  'abort-controller': resolvePackageDir('abort-controller'),
  'event-target-shim': resolvePackageDir('event-target-shim'),
  'invariant': resolvePackageDir('invariant'),
  'nullthrows': resolvePackageDir('nullthrows'),
  'base64-js': resolvePackageDir('base64-js'),
};

module.exports = config;