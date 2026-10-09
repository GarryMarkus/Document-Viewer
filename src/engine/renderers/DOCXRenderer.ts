import * as docx from 'docx-preview';
import { DocumentRenderer, DocumentPageSize, PageRenderOptions, SearchResult } from '../types';
import { DocumentOutlineItem, DocumentMetadata } from '../../types/document';

export class DOCXRenderer implements DocumentRenderer {
  public format = 'docx' as const;
  private offscreenContainer: HTMLDivElement | null = null;
  private pageElements: HTMLElement[] = [];
  private pageSizes: DocumentPageSize[] = [];
  private outlineItems: DocumentOutlineItem[] = [];
  private fullText = '';
  private wordCount = 0;
  private isDestroyed = false;

  async open(fileData: ArrayBuffer | Uint8Array, fileName: string): Promise<DocumentMetadata> {
    this.destroy();
    this.isDestroyed = false;

    // Create offscreen staging container for docx parsing
    this.offscreenContainer = document.createElement('div');
    this.offscreenContainer.style.position = 'fixed';
    this.offscreenContainer.style.left = '-99999px';
    this.offscreenContainer.style.top = '0';
    this.offscreenContainer.style.width = '900px';
    this.offscreenContainer.style.visibility = 'hidden';
    document.body.appendChild(this.offscreenContainer);

    const buffer = fileData instanceof Uint8Array ? fileData.buffer : fileData;

    await docx.renderAsync(buffer, this.offscreenContainer, undefined, {
      inWrapper: true,
      ignoreWidth: false,
      ignoreHeight: false,
      ignoreFonts: false,
      breakPages: true,
      renderHeaders: true,
      renderFooters: true,
      renderFootnotes: true,
      renderEndnotes: true,
      useBase64URL: true,
    });

    if (this.isDestroyed) {
      this.destroy();
      throw new Error('DOCXRenderer was destroyed during parsing');
    }

    // Preserve docx-preview styling in head
    const styleTags = Array.from(this.offscreenContainer.querySelectorAll('style'));
    let docxStyleEl = document.getElementById('docx-injected-styles') as HTMLStyleElement;
    if (!docxStyleEl) {
      docxStyleEl = document.createElement('style');
      docxStyleEl.id = 'docx-injected-styles';
      document.head.appendChild(docxStyleEl);
    }
    docxStyleEl.textContent = styleTags.map(s => s.innerHTML).join('\n') + `
      .docx-page-content {
        box-sizing: border-box !important;
        background: #FFFFFF !important;
        color: #000000 !important;
      }
      .docx-page-content table {
        max-width: 100% !important;
      }
    `;

    // Extract pages from docx-wrapper
    const sections = Array.from(
      this.offscreenContainer.querySelectorAll<HTMLElement>('.docx-wrapper > section.docx, .docx-wrapper > article')
    );

    if (sections.length > 0) {
      this.pageElements = sections;
    } else {
      // Fallback: wrap all content in single page
      const wrapper = this.offscreenContainer.querySelector<HTMLElement>('.docx-wrapper') || this.offscreenContainer;
      this.pageElements = [wrapper];
    }

    // Measure page sizes
    this.pageSizes = this.pageElements.map(el => {
      const w = el.offsetWidth || 816;
      const h = el.offsetHeight || 1056;
      return { width: Math.max(w, 400), height: Math.max(h, 400) };
    });

    // Extract text & word count
    this.fullText = this.offscreenContainer.innerText || '';
    const words = this.fullText.trim().split(/\s+/).filter(Boolean);
    this.wordCount = words.length;

    // Extract Headings outline
    this.outlineItems = this.extractHeadings();

    const metadata: DocumentMetadata = {
      title: fileName.replace(/\.docx?$/i, ''),
      format: 'docx',
      pageCount: this.pageElements.length,
      wordCount: this.wordCount,
    };

    return metadata;
  }

  private extractHeadings(): DocumentOutlineItem[] {
    if (!this.offscreenContainer) return [];
    const headings = Array.from(
      this.offscreenContainer.querySelectorAll<HTMLElement>('h1, h2, h3, h4, h5, h6, .Heading1, .Heading2, .Heading3')
    );

    let cumulativeTop = 0;
    const pageTops = this.pageSizes.map(size => {
      const top = cumulativeTop;
      cumulativeTop += size.height;
      return top;
    });

    return headings.map(h => {
      const headingTop = h.offsetTop;
      let pageNum = 1;
      for (let i = 0; i < pageTops.length; i++) {
        if (headingTop >= pageTops[i]) {
          pageNum = i + 1;
        } else {
          break;
        }
      }

      return {
        title: h.innerText.trim() || 'Untitled Section',
        pageNum,
      };
    }).filter(h => h.title.length > 0);
  }

  getPageCount(): number {
    return this.pageElements.length;
  }

  getPageSize(pageIndex: number): DocumentPageSize {
    return this.pageSizes[pageIndex] || { width: 816, height: 1056 };
  }

  async renderPage(
    pageIndex: number,
    canvas: HTMLCanvasElement,
    options: PageRenderOptions,
    wrapper?: HTMLDivElement
  ): Promise<void> {
    if (this.isDestroyed || !wrapper) return;
    const targetElement = this.pageElements[pageIndex];
    if (!targetElement) return;

    const size = this.getPageSize(pageIndex);
    const { scale } = options;

    // Hide canvas in DOCX mode (DOM delivers perfect typographic fidelity)
    canvas.style.display = 'none';

    // Mount page DOM clone in wrapper
    let docxContainer = wrapper.querySelector<HTMLDivElement>('.docx-page-content');
    if (!docxContainer) {
      docxContainer = document.createElement('div');
      docxContainer.className = 'docx-page-content selectable-content';
      docxContainer.style.position = 'absolute';
      docxContainer.style.left = '0';
      docxContainer.style.top = '0';
      docxContainer.style.overflow = 'hidden';
      docxContainer.style.boxSizing = 'border-box';
      docxContainer.style.transformOrigin = 'top left';
      wrapper.appendChild(docxContainer);
    }

    docxContainer.innerHTML = targetElement.innerHTML;
    docxContainer.className = `docx-page-content selectable-content ${targetElement.className}`;
    docxContainer.style.cssText = targetElement.style.cssText;
    docxContainer.style.position = 'absolute';
    docxContainer.style.left = '0';
    docxContainer.style.top = '0';
    docxContainer.style.width = `${size.width}px`;
    docxContainer.style.minHeight = `${size.height}px`;
    docxContainer.style.transform = `scale(${scale})`;
    docxContainer.style.transformOrigin = 'top left';
    docxContainer.style.boxSizing = 'border-box';
    docxContainer.style.overflow = 'hidden';
    docxContainer.style.backgroundColor = '#FFFFFF';
    docxContainer.style.color = '#000000';
  }

  cancelRender(): void {
    // DOM cloning is synchronous and lightweight
  }

  async search(query: string): Promise<SearchResult[]> {
    if (!query.trim() || !this.fullText) return [];
    const results: SearchResult[] = [];
    const lowerQuery = query.toLowerCase();
    const lowerText = this.fullText.toLowerCase();

    let pos = 0;
    let matchIdx = 0;
    while ((pos = lowerText.indexOf(lowerQuery, pos)) !== -1) {
      // Estimate page by character position ratio
      const charRatio = pos / Math.max(lowerText.length, 1);
      const estPage = Math.min(Math.floor(charRatio * this.pageElements.length), this.pageElements.length - 1);

      results.push({
        pageIndex: estPage,
        matchIndex: matchIdx++,
        text: this.fullText.substring(Math.max(0, pos - 20), Math.min(this.fullText.length, pos + query.length + 20)),
      });
      pos += lowerQuery.length;
    }
    return results;
  }

  async getOutline(): Promise<DocumentOutlineItem[]> {
    return this.outlineItems;
  }

  destroy(): void {
    this.isDestroyed = true;
    if (this.offscreenContainer && this.offscreenContainer.parentNode) {
      this.offscreenContainer.parentNode.removeChild(this.offscreenContainer);
    }
    const injected = document.getElementById('docx-injected-styles');
    if (injected && injected.parentNode) {
      injected.parentNode.removeChild(injected);
    }
    this.offscreenContainer = null;
    this.pageElements = [];
    this.pageSizes = [];
    this.outlineItems = [];
    this.fullText = '';
  }
}
