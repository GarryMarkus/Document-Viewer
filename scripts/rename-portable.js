import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
const version = pkg.version || '3.0.0';

const releaseDir = path.join(rootDir, 'src-tauri', 'target', 'release');
const oldName = path.join(releaseDir, 'document_viewer.exe');
const newName = path.join(releaseDir, `Document Viewer-v${version}-Portable.exe`);

if (fs.existsSync(oldName)) {
  fs.copyFileSync(oldName, newName);
  console.log(`Successfully created portable version: ${newName}`);
} else {
  console.warn(`Could not find ${oldName}. Ensure you have run 'npm run tauri build'.`);
}
