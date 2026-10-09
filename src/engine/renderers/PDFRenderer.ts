import * as pdfjsLib from 'pdfjs-dist';
import { AnnotationLayer, TextLayer } from 'pdfjs-dist';
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';
import 'pdfjs-dist/web/pdf_viewer.css';
import { DocumentRenderer, DocumentPageSize, PageRenderOptions, SearchResult } from '../types';
import { DocumentOutlineItem, DocumentMetadata } from '../../types/document';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

export class PDFRenderer implements DocumentRenderer {
  public format = 'pdf' as const;
  private pdfDoc: PDFDocumentProxy | null = null;
  private pageProxies: Map<number, PDFPageProxy> = new Map();
  private pageSizes: Map<number, DocumentPageSize> = new Map();
  private activeRenderTasks: Map<number, any> = new Map();
  private isDestroyed = false;

  async open(fileData: ArrayBuffer | Uint8Array, fileName: string, password?: string): Promise<DocumentMetadata> {
    this.destroy();
    this.isDestroyed = false;

    const loadingTask = pdfjsLib.getDocument({
      data: fileData,
      password: password || undefined,
      cMapUrl: '/cmaps/',
      cMapPacked: true,
      standardFontDataUrl: '/standard_fonts/',
      wasmUrl: '/wasm/',
      iccUrl: '/iccs/',
      isOffscreenCanvasSupported: true,
    });

    try {
      this.pdfDoc = await loadingTask.promise;
    } catch (err: any) {
      if (err?.name === 'PasswordException' || err?.message?.toLowerCase().includes('password')) {
        const passwordErr = new Error(err.code === 2 ? 'Incorrect password' : 'Password required');
        passwordErr.name = 'PasswordException';
        (passwordErr as any).isPasswordRequired = true;
        (passwordErr as any).isIncorrectPassword = err.code === 2;
        throw passwordErr;
      }
      throw err;
    }

    if (this.isDestroyed) {
      (this.pdfDoc as any).destroy?.();
      this.pdfDoc.cleanup?.();
      throw new Error('PDFRenderer was destroyed before document finished loading');
    }

    // Pre-cache page 1 size for default dimensions
    const page1 = await this.getPageProxy(1);
    const vp1 = page1.getViewport({ scale: 1.0 });
    const defaultSize: DocumentPageSize = { width: vp1.width, height: vp1.height };
    this.pageSizes.set(1, defaultSize);

    // Extract metadata
    let docMetadata: DocumentMetadata = {
      title: fileName,
      format: 'pdf',
      pageCount: this.pdfDoc.numPages,
    };

    try {
      const meta = await this.pdfDoc.getMetadata();
      if (meta?.info) {
        const info: any = meta.info;
        docMetadata = {
          ...docMetadata,
          title: info.Title || fileName,
          author: info.Author,
          creator: info.Creator,
          producer: info.Producer,
          created: info.CreationDate,
          modified: info.ModDate,
        };
      }
    } catch {}

    return docMetadata;
  }

  getPageCount(): number {
    return this.pdfDoc ? this.pdfDoc.numPages : 0;
  }

  private async getPageProxy(pageNum: number): Promise<PDFPageProxy> {
    if (!this.pdfDoc) throw new Error('Document not loaded');
    let proxy = this.pageProxies.get(pageNum);
    if (!proxy) {
      proxy = await this.pdfDoc.getPage(pageNum);
      this.pageProxies.set(pageNum, proxy);
      const vp = proxy.getViewport({ scale: 1.0 });
      this.pageSizes.set(pageNum, { width: vp.width, height: vp.height });
    }
    return proxy;
  }

  getPageSize(pageIndex: number): DocumentPageSize {
    const pageNum = pageIndex + 1;
    const cached = this.pageSizes.get(pageNum);
    if (cached) return cached;
    // Fallback to first page size or standard A4
    return this.pageSizes.get(1) || { width: 612, height: 792 };
  }

  async renderPage(
    pageIndex: number,
    canvas: HTMLCanvasElement,
    options: PageRenderOptions,
    wrapper?: HTMLDivElement
  ): Promise<void> {
    if (!this.pdfDoc || this.isDestroyed) return;
    const pageNum = pageIndex + 1;

    // Abort previous in-flight task for this page if any
    this.cancelRender(pageIndex);

    try {
      const page = await this.getPageProxy(pageNum);
      if (this.isDestroyed) return;

      const { scale, rotation } = options;
      const viewport = page.getViewport({ scale, rotation });
      const context = canvas.getContext('2d', { alpha: false });
      if (!context) return;

      const dpr = options.isPreview ? 1 : Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = viewport.width * dpr;
      canvas.height = viewport.height * dpr;
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;

      const renderTask = page.render({
        canvasContext: context,
        viewport,
        transform: [dpr, 0, 0, dpr, 0, 0],
      } as any);

      this.activeRenderTasks.set(pageNum, renderTask);
      await renderTask.promise;
      this.activeRenderTasks.delete(pageNum);

      // Render layers only for sharp (non-preview) renders when wrapper is provided
      if (!options.isPreview && wrapper && !this.isDestroyed) {
        await this.renderLayers(page, viewport, wrapper);
      }
    } catch (err: any) {
      if (err?.name !== 'RenderingCancelledException') {
        console.warn(`PDF Render page ${pageNum} error:`, err);
      }
    } finally {
      this.activeRenderTasks.delete(pageNum);
    }
  }

  cancelRender(pageIndex: number): void {
    const pageNum = pageIndex + 1;
    const existing = this.activeRenderTasks.get(pageNum);
    if (existing) {
      try {
        existing.cancel();
      } catch {}
      this.activeRenderTasks.delete(pageNum);
    }
  }

  private async renderLayers(page: PDFPageProxy, viewport: any, wrapper: HTMLDivElement): Promise<void> {
    // 1. TextLayer for selection
    let textLayerDiv = wrapper.querySelector('.textLayer') as HTMLDivElement;
    if (textLayerDiv) textLayerDiv.remove();

    textLayerDiv = document.createElement('div');
    textLayerDiv.className = 'textLayer';
    textLayerDiv.style.width = `${viewport.width}px`;
    textLayerDiv.style.height = `${viewport.height}px`;
    wrapper.appendChild(textLayerDiv);

    try {
      const textContent = await page.getTextContent();
      const textLayer = new TextLayer({
        textContentSource: textContent,
        container: textLayerDiv,
        viewport,
      } as any);
      await textLayer.render();
    } catch {}

    // 2. AnnotationLayer for links
    let annotDiv = wrapper.querySelector('.annotationLayer') as HTMLDivElement;
    if (annotDiv) annotDiv.remove();

    annotDiv = document.createElement('div');
    annotDiv.className = 'annotationLayer';
    annotDiv.style.width = `${viewport.width}px`;
    annotDiv.style.height = `${viewport.height}px`;
    wrapper.appendChild(annotDiv);

    try {
      const annotations = await page.getAnnotations({ intent: 'display' });
      if (annotations.length > 0) {
        const linkService = {
          getDestinationHash: () => '#',
          getAnchorUrl: () => '#',
          navigateTo: () => {},
          goToDestination: () => {},
          goToPage: () => {},
          addLinkAttributes: (link: HTMLAnchorElement, url: string, newWindow: boolean) => {
            link.href = url;
            link.target = newWindow ? '_blank' : '_self';
            link.rel = 'noopener noreferrer';
          },
          getPageIndex: () => Promise.resolve(0),
          isPageVisible: () => true,
          isPageCached: () => true,
          externalLinkEnabled: true,
          externalLinkRel: 'noopener noreferrer',
          externalLinkTarget: 2,
        };

        const annotLayer = new AnnotationLayer({
          div: annotDiv,
          accessibilityManager: null,
          annotationCanvasMap: null,
          annotationEditorUIManager: null,
          page,
          viewport: viewport.clone({ dontFlip: true }),
        } as any);

        await annotLayer.render({
          viewport: viewport.clone({ dontFlip: true }),
          div: annotDiv,
          annotations,
          page,
          linkService: linkService as any,
          renderForms: false,
        } as any);
      }
    } catch {}
  }

  async search(query: string): Promise<SearchResult[]> {
    if (!this.pdfDoc || !query.trim()) return [];
    const results: SearchResult[] = [];
    const lowerQuery = query.toLowerCase();

    for (let i = 1; i <= this.pdfDoc.numPages; i++) {
      try {
        const page = await this.getPageProxy(i);
        const textContent = await page.getTextContent();
        const fullText = textContent.items
          .map((item: any) => item.str || '')
          .join(' ');

        let pos = 0;
        let matchIdx = 0;
        while ((pos = fullText.toLowerCase().indexOf(lowerQuery, pos)) !== -1) {
          results.push({
            pageIndex: i - 1,
            matchIndex: matchIdx++,
            text: fullText.substring(Math.max(0, pos - 20), Math.min(fullText.length, pos + query.length + 20)),
          });
          pos += lowerQuery.length;
        }
      } catch {}
    }
    return results;
  }

  async getOutline(): Promise<DocumentOutlineItem[]> {
    if (!this.pdfDoc) return [];
    try {
      const rawOutline = await this.pdfDoc.getOutline();
      if (!rawOutline || rawOutline.length === 0) return [];

      const resolveDest = async (items: any[]): Promise<DocumentOutlineItem[]> => {
        const resolved: DocumentOutlineItem[] = [];
        for (const item of items) {
          let pageNum: number | undefined;
          if (item.dest) {
            try {
              let dest = item.dest;
              if (typeof dest === 'string') {
                dest = await this.pdfDoc!.getDestination(dest);
              }
              if (Array.isArray(dest) && dest.length > 0) {
                const ref = dest[0];
                if (typeof ref === 'number') {
                  pageNum = ref + 1;
                } else if (typeof ref === 'object' && ref !== null) {
                  const idx = await this.pdfDoc!.getPageIndex(ref);
                  if (idx >= 0) pageNum = idx + 1;
                }
              }
            } catch {}
          }

          const node: DocumentOutlineItem = {
            title: item.title,
            pageNum,
            items: item.items && item.items.length > 0 ? await resolveDest(item.items) : undefined,
          };
          resolved.push(node);
        }
        return resolved;
      };

      return await resolveDest(rawOutline);
    } catch {
      return [];
    }
  }

  destroy(): void {
    this.isDestroyed = true;
    this.activeRenderTasks.forEach((task) => {
      try {
        task.cancel();
      } catch {}
    });
    this.activeRenderTasks.clear();
    this.pageProxies.clear();
    this.pageSizes.clear();

    if (this.pdfDoc) {
      try {
        (this.pdfDoc as any).destroy?.();
        this.pdfDoc.cleanup?.();
      } catch {}
      this.pdfDoc = null;
    }
  }
}
