import { useEffect, useRef, useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { AnnotationLayer, TextLayer } from 'pdfjs-dist';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import 'pdfjs-dist/web/pdf_viewer.css';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

interface CanvasProps {
  scale: number;
  documentUrl?: string;
  onDocumentLoad?: (numPages: number, outline: any[]) => void;
  onPageChange?: (page: number) => void;
  goToPage?: number;
  darkMode?: boolean;
}

export default function Canvas({ scale, documentUrl, onDocumentLoad, onPageChange, goToPage, darkMode }: CanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const wrapperRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState(0);
  const renderingRef = useRef<Set<number>>(new Set());

  // Load PDF document
  useEffect(() => {
    if (!documentUrl) {
      setPdfDoc(null);
      setNumPages(0);
      return;
    }

    let cancelled = false;
    const loadPdf = async () => {
      try {
        const loadingTask = pdfjsLib.getDocument({ url: documentUrl });
        const pdf = await loadingTask.promise;
        if (cancelled) return;

        setPdfDoc(pdf);
        setNumPages(pdf.numPages);

        let outline = await pdf.getOutline();
        if (!outline) outline = [];

        if (onDocumentLoad) {
          onDocumentLoad(pdf.numPages, outline);
        }
      } catch (error) {
        console.warn("Could not load document:", error);
      }
    };

    loadPdf();
    return () => { cancelled = true; };
  }, [documentUrl]);

  // Render a single page: canvas + annotation layer (clickable links)
  const renderPage = useCallback(async (pageNum: number) => {
    if (!pdfDoc || renderingRef.current.has(pageNum)) return;
    
    const canvas = pageRefs.current.get(pageNum);
    const wrapper = wrapperRefs.current.get(pageNum);
    if (!canvas || !wrapper) return;

    renderingRef.current.add(pageNum);

    try {
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale });
      const context = canvas.getContext('2d');
      if (!context) return;

      const dpr = window.devicePixelRatio || 1;
      canvas.height = viewport.height * dpr;
      canvas.width = viewport.width * dpr;
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;

      // Set wrapper size to match canvas css size
      wrapper.style.width = `${viewport.width}px`;
      wrapper.style.height = `${viewport.height}px`;

      // Render the canvas
      await page.render({
        canvasContext: context,
        viewport: viewport,
        transform: [dpr, 0, 0, dpr, 0, 0]
      } as any).promise;

      // === Annotation Layer (clickable links, form fields) ===
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
            getDestinationHash: (_dest: any) => '#',
            getAnchorUrl: (_hash: any) => '#',
            navigateTo: (_dest: any) => {},
            goToDestination: (_dest: any) => {},
            goToPage: (_p: number) => {},
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
      } catch (annotError) {
        // Annotations are non-critical, continue silently
      }

      // === Text Layer (Selectable text) ===
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
          viewport: viewport,
        } as any);
        await textLayer.render();
      } catch (textError) {
        console.warn('TextLayer error:', textError);
      }

    } catch (error) {
      console.warn(`Error rendering page ${pageNum}:`, error);
    } finally {
      renderingRef.current.delete(pageNum);
    }
  }, [pdfDoc, scale]);

  // Re-render all pages when scale or document changes
  useEffect(() => {
    if (!pdfDoc) return;
    renderingRef.current.clear();
    for (let i = 1; i <= numPages; i++) {
      renderPage(i);
    }
  }, [pdfDoc, scale, numPages, renderPage]);

  // Track scroll position to determine current page
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !numPages) return;

    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      const containerHeight = container.clientHeight;
      const scrollCenter = scrollTop + containerHeight / 3;

      let currentPage = 1;
      for (let i = 1; i <= numPages; i++) {
        const wrapper = wrapperRefs.current.get(i);
        if (!wrapper) continue;
        if (wrapper.offsetTop <= scrollCenter) {
          currentPage = i;
        }
      }

      if (onPageChange) {
        onPageChange(currentPage);
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => container.removeEventListener('scroll', handleScroll);
  }, [numPages, onPageChange]);

  // Scroll to specific page
  useEffect(() => {
    if (!goToPage || !containerRef.current) return;
    const wrapper = wrapperRefs.current.get(goToPage);
    if (wrapper) {
      wrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [goToPage]);

  // Empty state
  if (!documentUrl) {
    return (
      <div className={`w-full h-full flex flex-col items-center justify-center gap-4 ${darkMode ? 'bg-dark-canvas' : 'bg-adwaita-canvas'}`}>
        <svg className={`w-20 h-20 ${darkMode ? 'text-dark-text-dim/30' : 'text-adwaita-text-dim/40'}`} fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <div className="text-center">
          <p className={`text-base font-medium ${darkMode ? 'text-dark-text-dim/50' : 'text-adwaita-text-dim/60'}`}>Open a Document</p>
          <p className={`text-sm mt-1 ${darkMode ? 'text-dark-text-dim/30' : 'text-adwaita-text-dim/40'}`}>Drag & drop a PDF or press Ctrl+O</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={`w-full h-full overflow-auto pdf-canvas-area ${darkMode ? 'bg-dark-canvas' : 'bg-adwaita-canvas'}`}
    >
      <div className="flex flex-col items-center py-6 gap-4 min-h-full">
        {Array.from({ length: numPages }, (_, i) => i + 1).map(pageNum => (
          <div 
            key={pageNum} 
            ref={el => {
              if (el) wrapperRefs.current.set(pageNum, el);
              else wrapperRefs.current.delete(pageNum);
            }}
            className="relative shadow-[0_2px_12px_rgba(0,0,0,0.15)] bg-white"
          >
            <canvas
              ref={el => {
                if (el) pageRefs.current.set(pageNum, el);
                else pageRefs.current.delete(pageNum);
              }}
              className="block"
            />
            {/* Annotation layer is appended here dynamically */}
          </div>
        ))}
      </div>
    </div>
  );
}
