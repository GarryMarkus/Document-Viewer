import JSZip from 'jszip';
import { DocumentRenderer, DocumentPageSize, PageRenderOptions, SearchResult } from '../types';
import { DocumentOutlineItem, DocumentMetadata } from '../../types/document';

export interface SlideData {
  index: number;
  title: string;
  texts: string[];
  notes?: string;
  bgFill?: string;
  images: string[];
  htmlSnippet: string;
}

export class PPTXRenderer implements DocumentRenderer {
  public format = 'pptx' as const;
  private slides: SlideData[] = [];
  private slideSize: DocumentPageSize = { width: 960, height: 540 }; // 16:9 widescreen
  private isDestroyed = false;

  async open(fileData: ArrayBuffer | Uint8Array, fileName: string): Promise<DocumentMetadata> {
    this.destroy();
    this.isDestroyed = false;

    const zip = await JSZip.loadAsync(fileData);

    // 1. Read presentation.xml for slide dimension & slide order
    const presXmlStr = await zip.file('ppt/presentation.xml')?.async('text');
    if (presXmlStr) {
      const parser = new DOMParser();
      const presDoc = parser.parseFromString(presXmlStr, 'application/xml');
      const sldSz = presDoc.querySelector('sldSz');
      if (sldSz) {
        const cx = parseInt(sldSz.getAttribute('cx') || '9144000', 10);
        const cy = parseInt(sldSz.getAttribute('cy') || '5143500', 10);
        // Convert DXA/EMUs to points (1 point = 12700 EMUs)
        const w = Math.round(cx / 12700);
        const h = Math.round(cy / 12700);
        this.slideSize = { width: Math.max(w, 400), height: Math.max(h, 250) };
      }
    }

    // 2. Locate all slides in zip
    const slideFiles = Object.keys(zip.files)
      .filter((path) => path.startsWith('ppt/slides/slide') && path.endsWith('.xml'))
      .sort((a, b) => {
        const numA = parseInt(a.replace(/[^0-9]/g, ''), 10) || 0;
        const numB = parseInt(b.replace(/[^0-9]/g, ''), 10) || 0;
        return numA - numB;
      });

    this.slides = [];

    // Parse each slide
    for (let i = 0; i < slideFiles.length; i++) {
      const filePath = slideFiles[i];
      const xmlStr = await zip.file(filePath)?.async('text');
      if (!xmlStr) continue;

      const parser = new DOMParser();
      const slideDoc = parser.parseFromString(xmlStr, 'application/xml');

      // Extract all text paragraphs
      const paragraphs = Array.from(slideDoc.querySelectorAll('p\\:txBody, txBody'));
      const textLines: string[] = [];
      let slideTitle = `Slide ${i + 1}`;

      paragraphs.forEach((body) => {
        const paras = Array.from(body.querySelectorAll('a\\:p, p'));
        paras.forEach((p) => {
          const runs = Array.from(p.querySelectorAll('a\\:t, t')).map(t => t.textContent || '');
          const line = runs.join('').trim();
          if (line) textLines.push(line);
        });
      });

      if (textLines.length > 0 && textLines[0].length < 60) {
        slideTitle = textLines[0];
      }

      // Check for slide background fill
      let bgFill = '#FFFFFF';
      const srgbClr = slideDoc.querySelector('p\\:bg srgbClr, bg srgbClr');
      if (srgbClr) {
        bgFill = `#${srgbClr.getAttribute('val')}`;
      }

      // Read speaker notes if available
      let notes: string | undefined;
      const notesPath = `ppt/notesSlides/notesSlide${i + 1}.xml`;
      const notesXml = await zip.file(notesPath)?.async('text');
      if (notesXml) {
        const notesDoc = parser.parseFromString(notesXml, 'application/xml');
        const noteTexts = Array.from(notesDoc.querySelectorAll('a\\:t, t'))
          .map(t => t.textContent || '')
          .filter(Boolean);
        if (noteTexts.length > 0) notes = noteTexts.join(' ');
      }

      // Build structured HTML card for slide
      const htmlSnippet = this.buildSlideHtml(i + 1, slideTitle, textLines, bgFill);

      this.slides.push({
        index: i,
        title: slideTitle,
        texts: textLines,
        notes,
        bgFill,
        images: [],
        htmlSnippet,
      });
    }

    const metadata: DocumentMetadata = {
      title: fileName.replace(/\.pptx?$/i, ''),
      format: 'pptx',
      pageCount: this.slides.length,
    };

    return metadata;
  }

  private buildSlideHtml(slideNum: number, title: string, texts: string[], bgFill: string): string {
    const isDarkBg = bgFill.startsWith('#0') || bgFill.startsWith('#1') || bgFill.startsWith('#2');
    const textColor = isDarkBg ? '#FFFFFF' : '#1E293B';
    const subColor = isDarkBg ? '#94A3B8' : '#475569';

    const bullets = texts.slice(1).map(line => `
      <div style="display: flex; align-items: flex-start; gap: 8px; margin-bottom: 8px;">
        <span style="color: #0078D4; font-size: 14px; line-height: 1.4;">•</span>
        <span style="font-size: 14px; line-height: 1.4; color: ${subColor};">${line}</span>
      </div>
    `).join('');

    return `
      <div style="width: 100%; height: 100%; padding: 36px 48px; box-sizing: border-box; background-color: ${bgFill}; color: ${textColor}; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden; position: relative;">
        <!-- Top Slide Header -->
        <div>
          <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #0078D4; margin-bottom: 6px;">
            KEYNOTE // SLIDE ${slideNum}
          </div>
          <h2 style="font-size: 26px; font-weight: 700; line-height: 1.25; margin: 0 0 16px 0; color: ${textColor};">
            ${title}
          </h2>
        </div>

        <!-- Slide Body Items -->
        <div style="flex: 1; display: flex; flex-direction: column; justify-content: center; max-height: 300px; overflow: hidden;">
          ${bullets || `<p style="font-size: 15px; color: ${subColor};">${title}</p>`}
        </div>

        <!-- Slide Footer Indicator -->
        <div style="display: flex; align-items: center; justify-content: space-between; font-size: 10px; color: ${subColor}; border-top: 1px solid rgba(120,120,120,0.15); padding-top: 10px;">
          <span>Presentation Deck</span>
          <span>Slide ${slideNum} of ${this.slides.length || 1}</span>
        </div>
      </div>
    `;
  }

  getPageCount(): number {
    return this.slides.length;
  }

  getPageSize(): DocumentPageSize {
    return this.slideSize;
  }

  async renderPage(
    pageIndex: number,
    canvas: HTMLCanvasElement,
    options: PageRenderOptions,
    wrapper?: HTMLDivElement
  ): Promise<void> {
    if (this.isDestroyed || !wrapper) return;
    const slide = this.slides[pageIndex];
    if (!slide) return;

    canvas.style.display = 'none';

    let slideContainer = wrapper.querySelector<HTMLDivElement>('.pptx-slide-content');
    if (!slideContainer) {
      slideContainer = document.createElement('div');
      slideContainer.className = 'pptx-slide-content selectable-content';
      slideContainer.style.position = 'absolute';
      slideContainer.style.left = '0';
      slideContainer.style.top = '0';
      slideContainer.style.overflow = 'hidden';
      slideContainer.style.boxSizing = 'border-box';
      slideContainer.style.transformOrigin = 'top left';
      wrapper.appendChild(slideContainer);
    }

    slideContainer.innerHTML = slide.htmlSnippet;
    slideContainer.style.width = `${this.slideSize.width}px`;
    slideContainer.style.height = `${this.slideSize.height}px`;
    slideContainer.style.transform = `scale(${options.scale})`;
  }

  cancelRender(): void {}

  async search(query: string): Promise<SearchResult[]> {
    if (!query.trim() || this.slides.length === 0) return [];
    const results: SearchResult[] = [];
    const lowerQuery = query.toLowerCase();

    this.slides.forEach((slide) => {
      const combined = [slide.title, ...slide.texts].join(' ');
      if (combined.toLowerCase().includes(lowerQuery)) {
        results.push({
          pageIndex: slide.index,
          matchIndex: 0,
          text: `Slide ${slide.index + 1}: ${slide.title}`,
        });
      }
    });

    return results;
  }

  async getOutline(): Promise<DocumentOutlineItem[]> {
    return this.slides.map((s) => ({
      title: `${s.index + 1}. ${s.title}`,
      pageNum: s.index + 1,
    }));
  }

  getSlide(index: number): SlideData | undefined {
    return this.slides[index];
  }

  destroy(): void {
    this.isDestroyed = true;
    this.slides = [];
  }
}
