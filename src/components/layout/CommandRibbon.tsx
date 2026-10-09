import React from 'react';
import { DocumentFormat } from '../../types/document';

interface CommandRibbonProps {
  format: DocumentFormat;
  currentPage: number;
  numPages: number;
  onPageChange: (page: number) => void;
  scale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onFitWidth?: () => void;
  isContinuous: boolean;
  onToggleContinuous: () => void;
  isDual: boolean;
  onToggleDual: () => void;
  rotation: number;
  onRotate: () => void;
  onOpenFileClick: () => void;
  onPrint?: () => void;
  wordCount?: number;
  sheetCount?: number;
  onStartPresentation?: () => void;
}

export default function CommandRibbon({
  format,
  currentPage,
  numPages,
  onPageChange,
  scale,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onFitWidth,
  isContinuous,
  onToggleContinuous,
  isDual,
  onToggleDual,
  onRotate,
  onOpenFileClick,
  onPrint,
  wordCount,
  sheetCount,
  onStartPresentation,
}: CommandRibbonProps) {
  const [editingPage, setEditingPage] = React.useState(false);
  const [pageInput, setPageInput] = React.useState(String(currentPage));

  React.useEffect(() => {
    setPageInput(String(currentPage));
  }, [currentPage]);

  const handlePageSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const p = parseInt(pageInput, 10);
    if (!isNaN(p) && p >= 1 && p <= Math.max(numPages, 1)) {
      onPageChange(p);
    }
    setEditingPage(false);
  };

  const zoomPercent = Math.round(scale * 100);

  return (
    <div className="h-10 px-3 bg-surface-container-low/95 border-b border-surface-container-high/60 flex items-center justify-between text-xs select-none shrink-0 z-40">
      {/* ===== Left Side Tools ===== */}
      <div className="flex items-center gap-1.5 overflow-x-auto min-w-0">
        <button
          onClick={onOpenFileClick}
          className="h-7 px-2 rounded flex items-center gap-1.5 text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors font-medium"
          title="Open Document (Ctrl+O)"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
          <span className="hidden sm:inline">Open</span>
        </button>

        {onPrint && (
          <button
            onClick={onPrint}
            className="h-7 w-7 rounded flex items-center justify-center text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
            title="Print Document (Ctrl+P)"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" rx="1" />
            </svg>
          </button>
        )}

        <div className="h-4 w-[1px] bg-outline-variant/60 mx-1" />

        {/* Reading Layout Modes (Only applicable to pages/slides) */}
        {format !== 'xlsx' && (
          <>
            <div className="flex items-center bg-surface-container rounded p-[2px]">
              <button
                onClick={() => {
                  if (isContinuous) onToggleContinuous();
                  if (isDual) onToggleDual();
                }}
                className={`h-6 w-6 rounded flex items-center justify-center transition-colors ${
                  !isContinuous && !isDual
                    ? 'text-on-surface bg-surface-container-high shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
                title="Single Page Mode"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="5" y="3" width="14" height="18" rx="2" />
                </svg>
              </button>

              <button
                onClick={() => {
                  if (!isContinuous) onToggleContinuous();
                  if (isDual) onToggleDual();
                }}
                className={`h-6 w-6 rounded flex items-center justify-center transition-colors ${
                  isContinuous && !isDual
                    ? 'text-on-surface bg-surface-container-high shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
                title="Continuous Scroll Mode"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="5" y="2" width="14" height="8" rx="1.5" />
                  <rect x="5" y="14" width="14" height="8" rx="1.5" />
                </svg>
              </button>

              <button
                onClick={() => {
                  if (!isDual) onToggleDual();
                }}
                className={`h-6 w-6 rounded flex items-center justify-center transition-colors ${
                  isDual
                    ? 'text-on-surface bg-surface-container-high shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
                title="Two-Page Spread Mode"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                </svg>
              </button>
            </div>

            <div className="h-4 w-[1px] bg-outline-variant/60 mx-1" />
          </>
        )}

        {/* Zoom Controls */}
        <div className="flex items-center bg-surface-container rounded px-1.5 h-7 gap-1">
          <button
            onClick={onZoomOut}
            className="w-5 h-5 flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors"
            title="Zoom Out (Ctrl+-)"
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
          <button
            onClick={onResetZoom}
            className="font-medium text-on-surface px-1 min-w-[42px] text-center hover:bg-surface-container-high rounded transition-colors text-xs"
            title="Reset Zoom (Ctrl+0)"
          >
            {zoomPercent}%
          </button>
          <button
            onClick={onZoomIn}
            className="w-5 h-5 flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors"
            title="Zoom In (Ctrl+=)"
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
          {onFitWidth && (
            <button
              onClick={onFitWidth}
              className="h-5 px-1.5 rounded text-[11px] text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors font-medium ml-0.5"
              title="Fit to Page Width"
            >
              Fit
            </button>
          )}
        </div>
      </div>

      {/* ===== Right Side Navigation & Helpers ===== */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Page Paging Pill */}
        {numPages > 0 && (
          <div className="flex items-center gap-1 bg-surface-container/60 px-2 py-0.5 rounded">
            <button
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage <= 1}
              className="w-5 h-5 rounded flex items-center justify-center text-on-surface-variant hover:bg-surface-container hover:text-on-surface disabled:opacity-30 disabled:pointer-events-none transition-colors"
              title="Previous Page (ArrowLeft)"
            >
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>

            {editingPage ? (
              <form onSubmit={handlePageSubmit} className="inline-block">
                <input
                  type="number"
                  min={1}
                  max={numPages}
                  value={pageInput}
                  onChange={(e) => setPageInput(e.target.value)}
                  onBlur={() => handlePageSubmit()}
                  autoFocus
                  className="w-10 text-center bg-surface-container-high text-on-surface rounded text-xs px-1 py-0.5 focus:outline-none ring-1 ring-primary"
                />
              </form>
            ) : (
              <span
                onClick={() => setEditingPage(true)}
                className="cursor-pointer hover:bg-surface-container-high px-1 rounded text-on-surface font-semibold"
                title="Click to jump to page"
              >
                {currentPage}
              </span>
            )}
            <span className="text-on-surface-variant font-normal">/ {numPages}</span>

            <button
              onClick={() => onPageChange(Math.min(numPages, currentPage + 1))}
              disabled={currentPage >= numPages}
              className="w-5 h-5 rounded flex items-center justify-center text-on-surface-variant hover:bg-surface-container hover:text-on-surface disabled:opacity-30 disabled:pointer-events-none transition-colors"
              title="Next Page (ArrowRight)"
            >
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        )}

        {/* Word count or Sheet count badges if present */}
        {wordCount && wordCount > 0 && (
          <div className="hidden md:flex items-center gap-1 text-[11px] text-on-surface-variant px-2 py-0.5 rounded bg-surface-container/60">
            <span>{wordCount.toLocaleString()} words</span>
          </div>
        )}

        {sheetCount && sheetCount > 0 && (
          <div className="hidden md:flex items-center gap-1 text-[11px] text-on-surface-variant px-2 py-0.5 rounded bg-surface-container/60">
            <span>{sheetCount} sheets</span>
          </div>
        )}

        {/* PPTX Slideshow Button */}
        {format === 'pptx' && onStartPresentation && (
          <button
            onClick={onStartPresentation}
            className="h-7 px-2 rounded bg-primary-container text-on-primary-container hover:brightness-110 flex items-center gap-1.5 font-medium transition-colors shadow-xs"
            title="Start Slideshow (F5)"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            <span>Slideshow</span>
            <kbd className="px-1 py-0.2 bg-black/20 rounded text-[10px] font-mono">F5</kbd>
          </button>
        )}

        {/* Rotate Clockwise */}
        <button
          onClick={onRotate}
          className="h-7 w-7 rounded flex items-center justify-center text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
          title="Rotate Clockwise (Ctrl+Right)"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21.5 2v6h-6" />
            <path d="M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
          </svg>
        </button>
      </div>
    </div>
  );
}
