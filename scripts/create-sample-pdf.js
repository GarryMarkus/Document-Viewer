import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

function generateSimplePdf(pageCount = 100, outputPath = 'sample-100-pages.pdf') {
  const objects = [];
  let currentObjId = 1;

  function addObj(content) {
    const id = currentObjId++;
    objects.push({ id, content });
    return id;
  }

  // Catalog
  const catalogId = addObj('<< /Type /Catalog /Pages 2 0 R >>');
  // Pages root placeholder (will be replaced)
  const pagesRootId = addObj('');

  // Font
  const fontId = addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');

  const pageIds = [];

  for (let i = 1; i <= pageCount; i++) {
    const streamContent = `BT /F1 24 Tf 100 700 Td (Document Viewer - Test Page ${i} of ${pageCount}) Tj ET\n` +
      `BT /F1 14 Tf 100 650 Td (High-Performance 60/120 FPS Virtual Scrolling Engine Benchmark) Tj ET\n` +
      `BT /F1 12 Tf 100 600 Td (Page dimension: 612 x 792 pt. Zero jitter. Cumulative layout shift = 0.) Tj ET\n` +
      `BT /F1 10 Tf 100 100 Td (Generated for performance stress testing) Tj ET\n` +
      `100 550 412 2 re S\n` +
      `100 200 412 300 re S\n`;

    const streamId = addObj(`<< /Length ${streamContent.length} >>\nstream\n${streamContent}\nendstream`);
    const pageId = addObj(
      `<< /Type /Page /Parent ${pagesRootId} 0 R /MediaBox [0 0 612 792] /Contents ${streamId} 0 R /Resources << /Font << /F1 ${fontId} 0 R >> >> >>`
    );
    pageIds.push(pageId);
  }

  // Update Pages Root object
  objects[1].content = `<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(' ')}] /Count ${pageCount} >>`;

  // Write file
  let pdf = '%PDF-1.4\n';
  const offsets = [];

  for (const obj of objects) {
    offsets.push(pdf.length);
    pdf += `${obj.id} 0 obj\n${obj.content}\nendobj\n`;
  }

  const xrefOffset = pdf.length;
  pdf += 'xref\n0 ' + (objects.length + 1) + '\n0000000000 65535 f \n';
  for (const offset of offsets) {
    pdf += offset.toString().padStart(10, '0') + ' 00000 n \n';
  }

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  const fullPath = path.join(rootDir, outputPath);
  fs.writeFileSync(fullPath, pdf);
  console.log(`Generated benchmark PDF with ${pageCount} pages at: ${fullPath}`);
}

generateSimplePdf(100, 'sample-100-pages.pdf');
