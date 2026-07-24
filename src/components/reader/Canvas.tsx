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
  onDocumentLoad?: (numPages: number, outline: any[], metadata?: any) => void;
  onPageChange?: (page: number) => void;
  goToPage?: number;
  currentPage?: number;
  darkMode?: boolean;
  isContinuous?: boolean;
  isDual?: boolean;
  rotation?: number;
}

export default function Canvas({ 
  scale, 
  documentUrl, 
  onDocumentLoad, 
  onPageChange, 
  goToPage, 
  currentPage = 1,
  darkMode,
  isContinuous = true,
  isDual = false,
  rotation = 0
}: CanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const wrapperRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const renderTasksRef = useRef<Map<number, any>>(new Map());
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [defaultPageSize, setDefaultPageSize] = useState({ width: 792, height: 1122 }); // Standard A4-ish
  const [renderScale, setRenderScale] = useState(scale);

  // Debounce scale changes for rendering to avoid lag during fast zooming
  useEffect(() => {
    const timer = setTimeout(() => {
      setRenderScale(scale);
    }, 150); // 150ms debounce — snappy yet prevents thrashing
    return () => clearTimeout(timer);
  }, [scale]);

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
        const loadingTask = pdfjsLib.getDocument({ 
          url: documentUrl,
          cMapUrl: '/cmaps/',
          cMapPacked: true,
          standardFontDataUrl: '/standard_fonts/',
          wasmUrl: '/wasm/',
          iccUrl: '/iccs/',
          isOffscreenCanvasSupported: true,
        });
        const pdf = await loadingTask.promise;
        if (cancelled) return;

        setPdfDoc(pdf);
        setNumPages(pdf.numPages);

        try {
          const page1 = await pdf.getPage(1);
          const viewport = page1.getViewport({ scale: 1.0 });
          setDefaultPageSize({ width: viewport.width, height: viewport.height });
        } catch(e) {}

        let outline = await pdf.getOutline();
        if (!outline) outline = [];

        const resolveOutlineDestinations = async (items: any[]) => {
          for (let item of items) {
            if (item.dest) {
              try {
                let dest = item.dest;
                if (typeof dest === 'string') {
                  dest = await pdf.getDestination(dest);
                }
                if (Array.isArray(dest) && dest.length > 0) {
                  const ref = dest[0];
                  let pageIndex = -1;
                  if (typeof ref === 'number') {
                    // pdf.js sometimes returns the page index directly
                    pageIndex = ref;
                  } else if (typeof ref === 'object' && ref !== null) {
                    pageIndex = await pdf.getPageIndex(ref);
                  }
                  if (pageIndex >= 0) {
                    item.pageNum = pageIndex + 1;
                  }
                }
              } catch (e) {
                console.warn('Failed to resolve outline dest:', e);
              }
            }
            if (item.items && item.items.length > 0) {
              await resolveOutlineDestinations(item.items);
            }
          }
        };

        if (outline.length > 0) {
          await resolveOutlineDestinations(outline);
        }

        let docMetadata = null;
        try {
          const meta = await pdf.getMetadata();
          docMetadata = meta.info;
        } catch(e) {}

        if (onDocumentLoad) {
          onDocumentLoad(pdf.numPages, outline, docMetadata);
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
    if (!pdfDoc) return;
    
    // If a render is already running for this page, cancel it to avoid race conditions
    if (renderTasksRef.current.has(pageNum)) {
      try {
        renderTasksRef.current.get(pageNum).cancel();
      } catch (e) {
        // Ignore cancel errors
      }
      renderTasksRef.current.delete(pageNum);
    }
    
    const canvas = pageRefs.current.get(pageNum);
    const wrapper = wrapperRefs.current.get(pageNum);
    if (!canvas || !wrapper) return;

    try {
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: renderScale, rotation });
      const context = canvas.getContext('2d');
      if (!context) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2); // Cap DPR at 2 for performance
      canvas.height = viewport.height * dpr;
      canvas.width = viewport.width * dpr;
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;

      // Render the canvas
      const renderTask = page.render({
        canvasContext: context,
        viewport: viewport,
        transform: [dpr, 0, 0, dpr, 0, 0]
      } as any);

      renderTasksRef.current.set(pageNum, renderTask);
      await renderTask.promise;
      renderTasksRef.current.delete(pageNum);

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

    } catch (error: any) {
      if (error?.name === 'RenderingCancelledException') {
        // Expected when we cancel old tasks, don't spam console
      } else {
        console.warn(`Error rendering page ${pageNum}:`, error);
      }
    } finally {
      renderTasksRef.current.delete(pageNum);
    }
  }, [pdfDoc, renderScale, rotation]);

  const observerRef = useRef<IntersectionObserver | null>(null);

  // Lazy render pages when they enter viewport
  useEffect(() => {
    if (!pdfDoc || numPages === 0 || !containerRef.current) return;
    
    // Clear old tasks if the document changes
    renderTasksRef.current.forEach(task => { try { task.cancel(); } catch(e){} });
    renderTasksRef.current.clear();
    const renderedCanvases = new WeakSet<HTMLCanvasElement>();

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const pageNumStr = (entry.target as HTMLElement).dataset.page;
          if (pageNumStr) {
            const pageNum = parseInt(pageNumStr, 10);
            const canvas = pageRefs.current.get(pageNum);
            if (canvas && !renderedCanvases.has(canvas)) {
              renderedCanvases.add(canvas);
              renderPage(pageNum);
            }
          }
        }
      });
    }, {
      root: containerRef.current,
      rootMargin: '100% 0px 100% 0px', // Pre-render 1 viewport above/below
      threshold: 0.01
    });

    observerRef.current = observer;

    wrapperRefs.current.forEach(wrapper => {
      observer.observe(wrapper);
    });

    return () => {
      observer.disconnect();
      observerRef.current = null;
    };
  }, [pdfDoc, renderScale, renderPage]);

  // Track scroll position to determine current page
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !numPages) return;

    let rafId = 0;
    const handleScroll = () => {
      if (!isContinuous) return;
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const scrollTop = container.scrollTop;
        const containerHeight = container.clientHeight;
        const scrollCenter = scrollTop + containerHeight / 3;

        let newPage = 1;
        let maxTop = -1;
        for (let i = 1; i <= numPages; i++) {
          const wrapper = wrapperRefs.current.get(i);
          if (!wrapper) continue;
          if (wrapper.offsetTop <= scrollCenter) {
            if (wrapper.offsetTop > maxTop) {
              maxTop = wrapper.offsetTop;
              newPage = i;
            }
          }
        }

        if (onPageChange) {
          onPageChange(newPage);
        }
      });
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => {
      container.removeEventListener('scroll', handleScroll);
      cancelAnimationFrame(rafId);
    };
  }, [numPages, onPageChange, isContinuous]);

  // Scroll to page when user navigates (goToPage)
  useEffect(() => {
    if (!goToPage || !containerRef.current) return;
    const timer = setTimeout(() => {
      const wrapper = wrapperRefs.current.get(goToPage);
      if (wrapper) {
        wrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [goToPage]);

  // When layout mode changes, jump to current page instantly (no animation)
  useEffect(() => {
    if (!currentPage || !containerRef.current) return;
    const timer = setTimeout(() => {
      const wrapper = wrapperRefs.current.get(currentPage);
      if (wrapper) {
        wrapper.scrollIntoView({ behavior: 'instant', block: 'start' });
      }
    }, 30);
    return () => clearTimeout(timer);
  }, [isContinuous, isDual, rotation]);

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

  const rows: (number | null)[][] = [];
  if (isDual) {
    let i = 1;
    // For now, assume odd pages left is true
    while (i <= numPages) {
      const row: (number | null)[] = [i];
      if (i + 1 <= numPages) {
        row.push(i + 1);
      } else {
        row.push(null);
      }
      rows.push(row);
      i += 2;
    }
  } else {
    for (let i = 1; i <= numPages; i++) {
      rows.push([i]);
    }
  }

  // Filter rows if not continuous
  const targetPage = goToPage || currentPage || 1;
  const visibleRows = isContinuous 
    ? rows 
    : rows.filter(row => row.includes(targetPage));

  const isRotated90 = rotation % 180 !== 0;
  const pgWidth = isRotated90 ? defaultPageSize.height : defaultPageSize.width;
  const pgHeight = isRotated90 ? defaultPageSize.width : defaultPageSize.height;

  return (
    <div 
      ref={containerRef}
      className={`w-full h-full overflow-auto pdf-canvas-area ${darkMode ? 'bg-dark-canvas' : 'bg-adwaita-canvas'} ${scale !== renderScale ? 'zooming' : ''}`}
    >
      <div className="flex flex-col items-center py-6 gap-4 min-h-full">
        {visibleRows.map((row) => (
          <div key={row.join('-')} className="flex flex-row justify-center gap-4 max-w-full">
            {row.map((pageNum, idx) => {
              if (pageNum === null) {
                return <div key={`empty-${idx}`} style={{ width: `${pgWidth * scale}px` }} className="shrink-0" />;
              }
              return (
                <div 
                  key={pageNum} 
                  data-page={pageNum}
                  ref={el => {
                    if (el) {
                      if (wrapperRefs.current.get(pageNum) !== el) {
                        wrapperRefs.current.set(pageNum, el);
                        observerRef.current?.observe(el);
                      }
                    } else {
                      const oldEl = wrapperRefs.current.get(pageNum);
                      if (oldEl) {
                        observerRef.current?.unobserve(oldEl);
                        wrapperRefs.current.delete(pageNum);
                      }
                    }
                  }}
                  className={`relative bg-white shrink-0 ${darkMode ? 'shadow-[0_1px_3px_rgba(0,0,0,0.4)] border border-white/5' : 'shadow-[0_1px_4px_rgba(0,0,0,0.12)] border border-black/[0.08]'}`}
                  style={{
                    width: `${pgWidth * scale}px`,
                    height: `${pgHeight * scale}px`
                  }}
                >
                  <canvas
                    ref={el => {
                      if (el) pageRefs.current.set(pageNum, el);
                      else pageRefs.current.delete(pageNum);
                    }}
                    className="block"
                    style={{ width: `${pgWidth * scale}px`, height: `${pgHeight * scale}px` }}
                  />
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
