import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.join(__dirname, '..');

const copyRecursive = (src, dest) => {
  const absoluteSrc = path.join(rootDir, src);
  const absoluteDest = path.join(rootDir, dest);

  if (!fs.existsSync(absoluteSrc)) return;
  if (!fs.existsSync(absoluteDest)) fs.mkdirSync(absoluteDest, { recursive: true });
  
  const entries = fs.readdirSync(absoluteSrc, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(absoluteSrc, entry.name);
    const destPath = path.join(absoluteDest, entry.name);
    entry.isDirectory() ? copyRecursive(path.join(src, entry.name), path.join(dest, entry.name)) : fs.copyFileSync(srcPath, destPath);
  }
};

// Copy required PDF.js static assets to public directory
copyRecursive('node_modules/pdfjs-dist/cmaps', 'public/cmaps');
copyRecursive('node_modules/pdfjs-dist/standard_fonts', 'public/standard_fonts');
copyRecursive('node_modules/pdfjs-dist/wasm', 'public/wasm');
copyRecursive('node_modules/pdfjs-dist/iccs', 'public/iccs');

console.log('Successfully copied PDF.js assets to public directory.');
