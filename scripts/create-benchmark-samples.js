import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

// 1. Generate 500-page benchmark PDF
function generate500PagePdf() {
  const pageCount = 500;
  const objects = [];
  let currentObjId = 1;

  function addObj(content) {
    const id = currentObjId++;
    objects.push({ id, content });
    return id;
  }

  const catalogId = addObj('<< /Type /Catalog /Pages 2 0 R >>');
  const pagesRootId = addObj('');
  const fontId = addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');

  const pageIds = [];
  for (let i = 1; i <= pageCount; i++) {
    const streamContent = `BT /F1 20 Tf 80 720 Td (500-Page Stress Test PDF - Page ${i} of ${pageCount}) Tj ET\n` +
      `BT /F1 12 Tf 80 680 Td (Virtualization Engine Benchmark - Steady 60/120 FPS Verification) Tj ET\n` +
      `BT /F1 10 Tf 80 640 Td (This document stress-tests memory caps, LRU eviction, and zero-jitter layout.) Tj ET\n` +
      `80 500 450 100 re S\n` +
      `80 200 450 250 re S\n`;

    const streamId = addObj(`<< /Length ${streamContent.length} >>\nstream\n${streamContent}\nendstream`);
    const pageId = addObj(
      `<< /Type /Page /Parent ${pagesRootId} 0 R /MediaBox [0 0 612 792] /Contents ${streamId} 0 R /Resources << /Font << /F1 ${fontId} 0 R >> >> >>`
    );
    pageIds.push(pageId);
  }

  objects[1].content = `<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(' ')}] /Count ${pageCount} >>`;

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

  const dest = path.join(rootDir, 'sample-500-pages.pdf');
  fs.writeFileSync(dest, pdf);
  console.log(`Generated: ${dest} (${pageCount} pages)`);
}

// 2. Generate Large XLSX with sheets & formulas
function generateXlsxBenchmark() {
  const wb = XLSX.utils.book_new();

  // Create financial model sheet with 5,000 dense rows
  const data = [
    ['Category', 'Q1 Actual', 'Q2 Actual', 'Q3 Actual', 'Q4 Projected', 'Total FY24', 'Variance %', 'Status']
  ];

  for (let r = 1; r <= 5000; r++) {
    const q1 = Math.round(10000 + Math.random() * 50000);
    const q2 = Math.round(12000 + Math.random() * 55000);
    const q3 = Math.round(14000 + Math.random() * 60000);
    const q4 = Math.round(18000 + Math.random() * 70000);
    const total = q1 + q2 + q3 + q4;
    const varPct = (((q4 - q1) / q1) * 100).toFixed(1) + '%';
    data.push([`Line Item #${r} - Operations`, q1, q2, q3, q4, total, varPct, r % 2 === 0 ? 'Approved' : 'Pending']);
  }

  const ws = XLSX.utils.aoa_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, 'Financial Model');

  // Summary sheet
  const summaryWs = XLSX.utils.aoa_to_sheet([
    ['Metric', 'Value', 'Target'],
    ['Total ARR', '$48.2M', '$45.0M'],
    ['Gross Margin', '74.2%', '72.0%'],
    ['Net Retention', '124%', '120%'],
  ]);
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Executive Summary');

  const dest = path.join(rootDir, 'sample-financial-model.xlsx');
  XLSX.writeFile(wb, dest);
  console.log(`Generated: ${dest}`);
}

// 3. Generate 100-slide PPTX deck
async function generate100SlidePptx() {
  const zip = new JSZip();

  // [Content_Types].xml
  let contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>\n`;

  const slideCount = 100;
  for (let i = 1; i <= slideCount; i++) {
    contentTypes += `  <Override PartName="/ppt/slides/slide${i}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>\n`;
  }
  contentTypes += `</Types>`;
  zip.file('[Content_Types].xml', contentTypes);

  // _rels/.rels
  zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
</Relationships>`);

  // ppt/presentation.xml
  let presXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:sldSz cx="9144000" cy="5143500"/>
  <p:sldIdLst>\n`;
  for (let i = 1; i <= slideCount; i++) {
    presXml += `    <p:sldId id="${255 + i}" r:id="rId${i}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/>\n`;
  }
  presXml += `  </p:sldIdLst>
</p:presentation>`;
  zip.file('ppt/presentation.xml', presXml);

  // ppt/_rels/presentation.xml.rels
  let presRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">\n`;
  for (let i = 1; i <= slideCount; i++) {
    presRels += `  <Relationship Id="rId${i}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${i}.xml"/>\n`;
  }
  presRels += `</Relationships>`;
  zip.file('ppt/_rels/presentation.xml.rels', presRels);

  // Individual slides
  for (let i = 1; i <= slideCount; i++) {
    const slideXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:sp>
        <p:txBody>
          <a:p><a:r><a:t>Keynote Presentation - Slide ${i} of ${slideCount}</a:t></a:r></a:p>
          <a:p><a:r><a:t>High-Performance Smooth Virtual Scrolling Engine</a:t></a:r></a:p>
          <a:p><a:r><a:t>Zero jitter across page and slide boundaries at 60-120 FPS</a:t></a:r></a:p>
          <a:p><a:r><a:t>Verified for enterprise slide decks and presentation mode</a:t></a:r></a:p>
        </p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
</p:sld>`;
    zip.file(`ppt/slides/slide${i}.xml`, slideXml);
  }

  const content = await zip.generateAsync({ type: 'nodebuffer' });
  const dest = path.join(rootDir, 'sample-100-slides.pptx');
  fs.writeFileSync(dest, content);
  console.log(`Generated: ${dest} (${slideCount} slides)`);
}

async function run() {
  console.log('Generating benchmark test suites...');
  generate500PagePdf();
  generateXlsxBenchmark();
  await generate100SlidePptx();
  console.log('All benchmark suites generated successfully!');
}

run();
