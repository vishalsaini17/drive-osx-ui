import fs from 'fs';
import path from 'path';

const coreModules = [
  'desktop',
  'dock',
  'window-manager',
  'app-registry',
  'auth',
  'file-system',
  'notifications',
  'search',
  'settings',
  'theme',
];

const subdirs = ['components', 'hooks', 'services', 'store', 'utils', 'types'];

const coreRootDir = path.join(process.cwd(), 'src/core');

if (!fs.existsSync(coreRootDir)) {
  fs.mkdirSync(coreRootDir, { recursive: true });
}

coreModules.forEach((mod) => {
  const modFolder = path.join(coreRootDir, mod);
  if (!fs.existsSync(modFolder)) {
    fs.mkdirSync(modFolder, { recursive: true });
  }

  subdirs.forEach((s) => {
    const subPath = path.join(modFolder, s);
    if (!fs.existsSync(subPath)) {
      fs.mkdirSync(subPath, { recursive: true });
    }
  });

  const indexFile = path.join(modFolder, 'index.ts');
  if (!fs.existsSync(indexFile)) {
    fs.writeFileSync(indexFile, `// ${mod} core module\nexport {};\n`, 'utf8');
  }
});

// Create src/core/index.ts re-exporting all core modules
const mainCoreIndex = path.join(coreRootDir, 'index.ts');
const coreExportContent = `// DriveOSX Core Modules
export * as desktop from './desktop';
export * as dock from './dock';
export * as windowManager from './window-manager';
export * as appRegistry from './app-registry';
export * as auth from './auth';
export * as fileSystem from './file-system';
export * as notifications from './notifications';
export * as search from './search';
export * as settings from './settings';
export * as theme from './theme';

export { AppRegistry } from './AppRegistry';
export { EventBus } from './EventBus';
`;

fs.writeFileSync(mainCoreIndex, coreExportContent, 'utf8');

console.log('Successfully created src/core modules architecture blueprint!');
