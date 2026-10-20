import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { DocumentRenderer } from './types';
import { applySearchHighlights } from '../utils/searchHighlight';

interface VirtualScrollContainerProps {
  renderer: DocumentRenderer | null;
  scale: number;
  rotation: number;
  isContinuous: boolean;
  isDual: boolean;
  currentPage: number;
  goToPage?: number;
  onPageChange: (page: number) => void;
  darkMode: boolean;
  searchQuery?: string;
  activeMatchPageIndex?: number;
  activeMatchIndex?: number;
  initialScrollTop?: number;
  onScrollPositionChange?: (scrollTop: number) => void;
  onScaleChange?: (scale: number) => void;
  isVisible?: boolean;
  dimPages?: boolean;
}

interface PageRow {
  rowIndex: number;
  pageIndices: number[];
  top: number;
  height: number;
  width: number;
}

export default function VirtualScrollContainer({
  renderer,
  scale,
  rotation,
  isContinuous,
  isDual,
  currentPage,
  goToPage,
  onPageChange,
  darkMode: _darkMode,
  searchQuery = '',
  activeMatchPageIndex,
  activeMatchIndex = 0,
  initialScrollTop = 0,
  onScrollPositionChange,
  onScaleChange,
  isVisible = true,
  dimPages = false,
}: VirtualScrollContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const wrapperRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // Debounced rendering scale to prevent lag during rapid Ctrl+Wheel zooming
  const [renderScale, setRenderScale] = useState(scale);
  const [viewportHeight, setViewportHeight] = useState(800);
  const [scrollTop, setScrollTop] = useState(initialScrollTop);
  const lastScrollTopRef = useRef(initialScrollTop);
  const isScrollingDownRef = useRef(true);

  // Restore scroll position when becoming visible or when initialScrollTop changes
  useEffect(() => {
    if (isVisible && containerRef.current && initialScrollTop > 0) {
      if (Math.abs(containerRef.current.scrollTop - initialScrollTop) > 2) {
        containerRef.current.scrollTop = initialScrollTop;
        setScrollTop(initialScrollTop);
      }
    }
  }, [isVisible, initialScrollTop]);

  // Debounce scale changes for sharp re-renders
  useEffect(() => {
    const timer = setTimeout(() => {
      setRenderScale(scale);
    }, 150);
    return () => clearTimeout(timer);
  }, [scale]);

  // Touchscreen 2-finger pinch-to-zoom gesture
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !onScaleChange) return;

    let touchStartDist: number | null = null;
    let initialScale = scale;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        touchStartDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        initialScale = scale;
      } else {
        touchStartDist = null;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && touchStartDist !== null) {
        e.preventDefault();
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        const ratio = dist / touchStartDist;
        const newScale = Math.min(5.0, Math.max(0.2, Math.round(initialScale * ratio * 100) / 100));
        onScaleChange(newScale);
      }
    };

    const handleTouchEnd = () => {
      touchStartDist = null;
    };

    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd);
    el.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
      el.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [scale, onScaleChange]);

  // Compute row layout (exact height & top coordinates up-front)
  const { rows, totalHeight } = useMemo(() => {
    if (!renderer) return { rows: [], totalHeight: 0 };
    const numPages = renderer.getPageCount();
    if (numPages === 0) return { rows: [], totalHeight: 0 };

    const pageRows: PageRow[] = [];
    const isRotated90 = rotation % 180 !== 0;
    const rowGap = 20; // 20px gap between page rows
    let currentTop = 24; // 24px initial top padding

    if (isDual) {
      let p = 0;
      let rIdx = 0;
      while (p < numPages) {
        const page1 = p;
        const page2 = p + 1 < numPages ? p + 1 : null;
        const size1 = renderer.getPageSize(page1);
        const w1 = isRotated90 ? size1.height : size1.width;
        const h1 = isRotated90 ? size1.width : size1.height;

        let maxH = h1 * scale;
        let totalW = w1 * scale;

        if (page2 !== null) {
          const size2 = renderer.getPageSize(page2);
          const w2 = isRotated90 ? size2.height : size2.width;
          const h2 = isRotated90 ? size2.width : size2.height;
          maxH = Math.max(maxH, h2 * scale);
          totalW += w2 * scale + 16; // 16px dual gap
        }

        pageRows.push({
          rowIndex: rIdx++,
          pageIndices: page2 !== null ? [page1, page2] : [page1],
          top: currentTop,
          height: maxH,
          width: totalW,
        });

        currentTop += maxH + rowGap;
        p += 2;
      }
    } else {
      for (let i = 0; i < numPages; i++) {
        const size = renderer.getPageSize(i);
        const w = (isRotated90 ? size.height : size.width) * scale;
        const h = (isRotated90 ? size.width : size.height) * scale;

        pageRows.push({
          rowIndex: i,
          pageIndices: [i],
          top: currentTop,
          height: h,
          width: w,
        });

        currentTop += h + rowGap;
      }
    }

    return { rows: pageRows, totalHeight: currentTop + 24 };
  }, [renderer, scale, rotation, isDual]);

  // Track viewport height on resize
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setViewportHeight(containerRef.current.clientHeight);
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // requestAnimationFrame-driven scroll handler
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let rafId = 0;
    const handleScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const curTop = container.scrollTop;
        isScrollingDownRef.current = curTop >= lastScrollTopRef.current;
        lastScrollTopRef.current = curTop;
        setScrollTop(curTop);
        onScrollPositionChange?.(curTop);

        // Calculate active current page
        if (isContinuous && rows.length > 0) {
          const center = curTop + container.clientHeight / 3;
          let bestPage = 1;
          for (const row of rows) {
            if (row.top <= center) {
              bestPage = row.pageIndices[0] + 1;
            } else {
              break;
            }
          }
          if (bestPage !== currentPage) {
            onPageChange(bestPage);
          }
        }
      });
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', handleScroll);
      cancelAnimationFrame(rafId);
    };
  }, [rows, isContinuous, currentPage, onPageChange]);

  // Jump to page when goToPage changes
  useEffect(() => {
    if (!goToPage || !containerRef.current || rows.length === 0) return;
    const targetIdx = goToPage - 1;
    const targetRow = rows.find(r => r.pageIndices.includes(targetIdx));
    if (targetRow) {
      containerRef.current.scrollTo({
        top: Math.max(0, targetRow.top - 20),
        behavior: isContinuous ? 'smooth' : 'instant',
      });
    }
  }, [goToPage, rows, isContinuous]);

  // Filter rows if not continuous (single page or single spread)
  const visibleRows = useMemo(() => {
    if (!isContinuous) {
      const activeIdx = currentPage - 1;
      return rows.filter(r => r.pageIndices.includes(activeIdx));
    }

    // Virtualization window with directional overscan buffer
    const overscan = viewportHeight * 1.5; // Pre-render 1.5 viewport heights
    const minTop = Math.max(0, scrollTop - overscan);
    const maxTop = scrollTop + viewportHeight + overscan;

    return rows.filter(row => {
      const rowBottom = row.top + row.height;
      return rowBottom >= minTop && row.top <= maxTop;
    });
  }, [rows, isContinuous, currentPage, scrollTop, viewportHeight]);

  // Render a specific page onto its registered canvas and wrapper
  const renderPage = useCallback(async (pageIdx: number) => {
    if (!renderer) return;
    const canvas = canvasRefs.current.get(pageIdx);
    const wrapper = wrapperRefs.current.get(pageIdx);
    if (!canvas || !wrapper) return;

    const cacheKey = `${pageIdx}-${renderScale}-${rotation}`;
    if ((canvas as any).__renderedKey === cacheKey && (wrapper as any).__renderedKey === cacheKey) {
      return;
    }

    try {
      if (renderer.format === 'pdf') {
        // 1. Fast low-res preview render for PDF
        await renderer.renderPage(
          pageIdx,
          canvas,
          {
            scale: renderScale,
            rotation,
            isPreview: true,
            dpr: 1,
          }
        );

        // 2. High quality sharp render + text layers (deferred)
        await renderer.renderPage(
          pageIdx,
          canvas,
          {
            scale: renderScale,
            rotation,
            isPreview: false,
            dpr: Math.min(window.devicePixelRatio || 1, 2),
          },
          wrapper
        );
      } else {
        // Direct render for DOM-based engines (PPTX, DOCX)
        await renderer.renderPage(
          pageIdx,
          canvas,
          {
            scale: renderScale,
            rotation,
            dpr: 1,
          },
          wrapper
        );
      }

      (canvas as any).__renderedKey = cacheKey;
      (wrapper as any).__renderedKey = cacheKey;
    } catch (e) {
      // Handled in renderer
    }
  }, [renderer, renderScale, rotation]);

  // Effect to render visible pages
  useEffect(() => {
    if (!renderer) return;

    visibleRows.forEach(row => {
      row.pageIndices.forEach(pageIdx => {
        renderPage(pageIdx);
      });
    });

    // Cleanup offscreen render tasks
    const visiblePageIndices = new Set(visibleRows.flatMap(r => r.pageIndices));
    const numPages = renderer.getPageCount();
    for (let p = 0; p < numPages; p++) {
      if (!visiblePageIndices.has(p)) {
        renderer.cancelRender?.(p);
      }
    }
  }, [renderer, visibleRows, renderPage]);

  // Apply Search Highlights to visible page DOM wrappers (PDF textLayer, DOCX content, PPTX slide)
  useEffect(() => {
    wrapperRefs.current.forEach((wrapper, pageIdx) => {
      const isActivePage = pageIdx === activeMatchPageIndex;
      applySearchHighlights(wrapper, searchQuery, isActivePage, activeMatchIndex);
    });
  }, [searchQuery, activeMatchPageIndex, activeMatchIndex, visibleRows]);

  if (!renderer || rows.length === 0) {
    return null;
  }

  const isRotated90 = rotation % 180 !== 0;

  return (
    <div
      ref={containerRef}
      className={`w-full h-full overflow-y-auto overflow-x-auto virtual-scroll-viewport select-none relative ${
        scale !== renderScale ? 'zooming' : ''
      }`}
      style={{
        backgroundColor: 'var(--doc-bed)',
      }}
      onDoubleClick={(e) => {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'CANVAS' && !target.closest('.textLayer') && !target.closest('button')) {
          if (onScaleChange) {
            onScaleChange(scale >= 1.15 ? 1.0 : 1.2);
          }
        }
      }}
    >
      {/* Phantom Scroll Spacer for 100% stable scrollbar geometry */}
      <div
        className="w-full relative pointer-events-none"
        style={{
          height: isContinuous ? `${totalHeight}px` : 'auto',
          minHeight: '100%',
        }}
      >
        {visibleRows.map((row) => (
          <div
            key={row.rowIndex}
            className="absolute left-0 right-0 flex items-center justify-center gap-4 pointer-events-auto"
            style={{
              top: isContinuous ? `${row.top}px` : '24px',
              height: `${row.height}px`,
              contain: 'layout size',
            }}
          >
            {row.pageIndices.map((pageIdx) => {
              const size = renderer.getPageSize(pageIdx);
              const pw = (isRotated90 ? size.height : size.width) * scale;
              const ph = (isRotated90 ? size.width : size.height) * scale;

              return (
                <div
                  key={pageIdx}
                  data-page-index={pageIdx}
                  ref={(el) => {
                    if (el) wrapperRefs.current.set(pageIdx, el);
                    else wrapperRefs.current.delete(pageIdx);
                  }}
                  className="relative bg-white shrink-0 overflow-hidden"
                  style={{
                    width: `${pw}px`,
                    height: `${ph}px`,
                    transform: 'translate3d(0, 0, 0)',
                    boxShadow: 'var(--page-shadow)',
                    border: '1px solid var(--page-border)',
                    filter: dimPages ? 'brightness(0.90) contrast(0.98)' : undefined,
                    transition: 'filter 180ms ease',
                  }}
                >
                  <canvas
                    ref={(el) => {
                      if (el) {
                        canvasRefs.current.set(pageIdx, el);
                        renderPage(pageIdx);
                      } else {
                        canvasRefs.current.delete(pageIdx);
                      }
                    }}
                    className="block w-full h-full"
                    style={{
                      width: `${pw}px`,
                      height: `${ph}px`,
                    }}
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
