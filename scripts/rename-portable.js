import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
const version = pkg.version || '3.1.0';

const releaseDir = path.join(rootDir, 'src-tauri', 'target', 'release');
const candidate1 = path.join(releaseDir, 'docs_reader.exe');
const candidate2 = path.join(releaseDir, 'document_viewer.exe');
const sourceFile = fs.existsSync(candidate1) ? candidate1 : candidate2;
const newName = path.join(releaseDir, `Docs Reader-v${version}-Portable.exe`);

if (fs.existsSync(sourceFile)) {
  fs.copyFileSync(sourceFile, newName);
  console.log(`Successfully created portable version: ${newName}`);
} else {
  console.warn(`Could not find source binary (${candidate1} or ${candidate2}). Ensure you have run 'npm run tauri build'.`);
}
