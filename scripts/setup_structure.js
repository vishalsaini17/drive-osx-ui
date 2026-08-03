import fs from 'fs';
import path from 'path';

const appMappings = [
  { dir: 'browser', srcFile: 'WebBrowser.tsx' },
  { dir: 'terminal', srcFile: 'Terminal.tsx' },
  { dir: 'file-explorer', srcFile: 'FileManager.tsx' },
  { dir: 'settings', srcFile: 'Settings.tsx' },
  { dir: 'messages', srcFile: 'Messenger.tsx' },
  { dir: 'clock', srcFile: 'ClockApp.tsx' },
  { dir: 'text-editor', srcFile: 'TextEditor.tsx' },
  { dir: 'paint-studio', srcFile: 'PaintApp.tsx' },
  { dir: 'calendar', srcFile: 'CalendarApp.tsx' },
  { dir: 'osx-meet', srcFile: 'MeetingApp.tsx' },
  { dir: 'trash-bin', srcFile: 'TrashApp.tsx' },
  { dir: 'mail-studio', srcFile: 'MailApp.tsx' },
  { dir: 'launcher', srcFile: 'AppLauncher.tsx' },
];

const subdirs = ['api', 'components', 'hooks', 'pages', 'routes', 'services', 'store', 'types', 'utils'];

const appsRootDir = path.join(process.cwd(), 'src/apps');
const applicationsDir = path.join(process.cwd(), 'src/applications');

if (!fs.existsSync(appsRootDir)) {
  fs.mkdirSync(appsRootDir, { recursive: true });
}

appMappings.forEach(({ dir, srcFile }) => {
  const appFolder = path.join(appsRootDir, dir);
  if (!fs.existsSync(appFolder)) {
    fs.mkdirSync(appFolder, { recursive: true });
  }

  // Create template subdirectories for Application Architecture Blueprint
  subdirs.forEach(s => {
    const subPath = path.join(appFolder, s);
    if (!fs.existsSync(subPath)) {
      fs.mkdirSync(subPath, { recursive: true });
    }
  });

  const srcPath = path.join(applicationsDir, srcFile);
  if (fs.existsSync(srcPath)) {
    let content = fs.readFileSync(srcPath, 'utf8');
    // Adjust relative imports from ../ to ../../
    content = content.replace(/(from\s+["'])\.\.\//g, '$1../../');
    fs.writeFileSync(path.join(appFolder, 'index.tsx'), content, 'utf8');
  }
});

console.log('Successfully created src/apps structure for all 13 applications!');
