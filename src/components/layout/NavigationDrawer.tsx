import React from 'react';
import { NavDrawerTab } from './NavigationRail';
import { DocumentFormat, DocumentOutlineItem, DocumentMetadata } from '../../types/document';
import * as pdfjsLib from 'pdfjs-dist';
import { invoke } from '@tauri-apps/api/core';

interface NavigationDrawerProps {
  activeTab: NavDrawerTab;
  onClose: () => void;
  format: DocumentFormat;
  numPages: number;
  currentPage: number;
  onPageSelect: (page: number) => void;
  outline?: DocumentOutlineItem[];
  metadata?: DocumentMetadata;
  documentUrl?: string;
  filePath?: string;
  bookmarks: number[];
  onToggleBookmark: (page: number) => void;
}

export default function NavigationDrawer({
  activeTab,
  onClose,
  format,
  numPages,
  currentPage,
  onPageSelect,
  outline = [],
  metadata,
  documentUrl,
  filePath,
  bookmarks,
  onToggleBookmark,
}: NavigationDrawerProps) {
  const [thumbnails, setThumbnails] = React.useState<Map<number, string>>(new Map());
  const [outlineFilter, setOutlineFilter] = React.useState('');
  const pdfRef = React.useRef<any>(null);
  const observerRef = React.useRef<IntersectionObserver | null>(null);

  // Load PDF for thumbnail generation when URL changes
  React.useEffect(() => {
    if (format !== 'pdf' || !documentUrl || numPages === 0) {
      setThumbnails(new Map());
      pdfRef.current = null;
      return;
    }
    const loadTask = pdfjsLib.getDocument({
      url: documentUrl,
      cMapUrl: '/cmaps/',
      cMapPacked: true,
      standardFontDataUrl: '/standard_fonts/',
      wasmUrl: '/wasm/',
      iccUrl: '/iccs/',
    });
    loadTask.promise.then(pdf => {
      pdfRef.current = pdf;
    }).catch(() => {});
  }, [format, documentUrl, numPages]);

  const generateThumbnail = async (pageNum: number) => {
    if (!pdfRef.current || thumbnails.has(pageNum)) return;
    try {
      const page = await pdfRef.current.getPage(pageNum);
      const viewport = page.getViewport({ scale: 0.25 });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      await page.render({ canvasContext: ctx, viewport } as any).promise;
      const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
      setThumbnails(prev => new Map(prev).set(pageNum, dataUrl));
    } catch {}
  };

  const observeThumbnail = React.useCallback((el: HTMLDivElement | null, pageNum: number) => {
    if (!el || !pdfRef.current) return;
    if (!observerRef.current) {
      observerRef.current = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const p = parseInt((entry.target as HTMLElement).dataset.page || '0', 10);
            if (p > 0) generateThumbnail(p);
          }
        });
      }, { rootMargin: '200% 0px' });
    }
    el.dataset.page = pageNum.toString();
    observerRef.current.observe(el);
  }, []);

  if (activeTab === 'none') return null;

  const renderOutlineItems = (items: DocumentOutlineItem[], depth = 0): React.ReactElement[] => {
    if (!items || items.length === 0) return [];
    return items
      .filter(item => !outlineFilter || item.title.toLowerCase().includes(outlineFilter.toLowerCase()))
      .map((item, idx) => (
        <div key={`${depth}-${idx}`} className="select-none">
          <button
            onClick={() => item.pageNum && onPageSelect(item.pageNum)}
            className="w-full text-left py-1.5 px-2.5 rounded text-xs text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors flex items-center justify-between group"
            style={{ paddingLeft: `${8 + depth * 12}px` }}
          >
            <span className="truncate mr-2 font-medium">{item.title}</span>
            {item.pageNum && (
              <span className="text-[10px] text-outline opacity-60 group-hover:opacity-100 shrink-0 font-mono">
                {item.pageNum}
              </span>
            )}
          </button>
          {item.items && item.items.length > 0 && renderOutlineItems(item.items, depth + 1)}
        </div>
      ));
  };

  return (
    <aside className="w-60 bg-surface-container-low border-r border-surface-container-high/60 flex flex-col shrink-0 select-none h-full z-20 transition-all duration-200">
      {/* Header */}
      <div className="p-2.5 bg-surface-container-lowest/60 border-b border-surface-container-high/40 flex items-center justify-between">
        <span className="font-semibold text-xs text-on-surface uppercase tracking-wider pl-1">
          {activeTab === 'pages' ? (format === 'pptx' ? 'Slide Deck' : 'Pages') :
           activeTab === 'outline' ? (format === 'docx' ? 'Headings Map' : 'Outline') :
           activeTab === 'bookmarks' ? 'Bookmarks' : 'Properties'}
        </span>
        <button
          onClick={onClose}
          className="w-5 h-5 rounded flex items-center justify-center text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
          title="Collapse Panel (F9)"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      </div>

      {/* Main Drawer Body */}
      <div className="flex-1 overflow-y-auto p-2">
        {/* --- Pages / Thumbnails Tab --- */}
        {activeTab === 'pages' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1 text-[11px] text-on-surface-variant">
              <span>{numPages} {format === 'pptx' ? 'slides' : 'pages'} total</span>
              {bookmarks.length > 0 && (
                <span className="text-secondary cursor-pointer">
                  {bookmarks.length} marked
                </span>
              )}
            </div>

            {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => {
              const isCurrent = pageNum === currentPage;
              const isMarked = bookmarks.includes(pageNum);

              return (
                <div
                  key={pageNum}
                  onClick={() => onPageSelect(pageNum)}
                  className="group relative flex flex-col items-center cursor-pointer transition-transform duration-150 active:scale-[0.98]"
                >
                  <div
                    ref={(el) => observeThumbnail(el, pageNum)}
                    className={`${
                      format === 'pptx' ? 'w-48 h-28' : 'w-36 h-48'
                    } bg-white rounded shadow-xs group-hover:shadow-md transition-all p-1 flex flex-col justify-between overflow-hidden relative border ${
                      isCurrent
                        ? 'ring-2 ring-primary border-primary shadow-sm'
                        : 'border-surface-container-highest/60'
                    }`}
                  >
                    {thumbnails.has(pageNum) ? (
                      <img src={thumbnails.get(pageNum)} alt={`Page ${pageNum}`} className="w-full h-full object-contain" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-neutral-50 dark:bg-neutral-900/40 text-[10px] text-outline">
                        <span className="font-mono">{format === 'pptx' ? `Slide ${pageNum}` : pageNum}</span>
                      </div>
                    )}

                    {/* Bookmark indicator */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleBookmark(pageNum);
                      }}
                      className={`absolute top-1 right-1 w-5 h-5 rounded flex items-center justify-center transition-opacity ${
                        isMarked
                          ? 'text-amber-500 opacity-100'
                          : 'text-on-surface-variant opacity-0 group-hover:opacity-70 hover:opacity-100 bg-black/20'
                      }`}
                      title={isMarked ? "Remove Bookmark" : "Bookmark Page"}
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill={isMarked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                        <path d="M19 21l-7-4.5L5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                      </svg>
                    </button>
                  </div>
                  <span className={`text-[11px] mt-1 transition-colors ${isCurrent ? 'font-semibold text-primary' : 'text-on-surface-variant group-hover:text-on-surface'}`}>
                    {format === 'pptx' ? `Slide ${pageNum}` : `Page ${pageNum}`}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* --- Outline / Headings Tab --- */}
        {activeTab === 'outline' && (
          <div className="space-y-2">
            <div className="h-7 px-2 rounded bg-surface-container flex items-center gap-1.5 text-on-surface-variant">
              <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                value={outlineFilter}
                onChange={(e) => setOutlineFilter(e.target.value)}
                placeholder="Filter outline..."
                className="w-full bg-transparent text-xs text-on-surface placeholder:text-outline focus:outline-none"
              />
            </div>

            {outline.length > 0 ? (
              <div className="py-1">
                {renderOutlineItems(outline)}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-on-surface-variant/70">
                No outline available for this document.
              </div>
            )}
          </div>
        )}

        {/* --- Bookmarks Tab --- */}
        {activeTab === 'bookmarks' && (
          <div className="space-y-2">
            {bookmarks.length > 0 ? (
              bookmarks.map((bm) => (
                <div
                  key={bm}
                  onClick={() => onPageSelect(bm)}
                  className="p-2 rounded bg-surface-container/60 hover:bg-surface-container flex items-center justify-between cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <svg className="w-3.5 h-3.5 text-amber-500 fill-current" viewBox="0 0 24 24">
                      <path d="M19 21l-7-4.5L5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                    </svg>
                    <span className="text-xs font-medium text-on-surface">Page {bm}</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleBookmark(bm);
                    }}
                    className="w-4 h-4 text-outline hover:text-error rounded flex items-center justify-center transition-colors"
                    title="Remove Bookmark"
                  >
                    ×
                  </button>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-on-surface-variant/70">
                No bookmarks added yet.
              </div>
            )}
          </div>
        )}

        {/* --- Properties Tab --- */}
        {activeTab === 'properties' && (
          <div className="space-y-3 p-1">
            <div className="space-y-2 text-xs">
              <div className="flex flex-col">
                <span className="text-outline text-[10px] uppercase font-semibold">Title</span>
                <span className="text-on-surface font-medium truncate">{metadata?.title || 'Unknown Title'}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-outline text-[10px] uppercase font-semibold">Author</span>
                <span className="text-on-surface">{metadata?.author || 'Unknown Author'}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-outline text-[10px] uppercase font-semibold">Format</span>
                <span className="text-on-surface uppercase font-mono">{format}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-outline text-[10px] uppercase font-semibold">Pages / Slides</span>
                <span className="text-on-surface">{numPages}</span>
              </div>
              {metadata?.fileSize && (
                <div className="flex flex-col">
                  <span className="text-outline text-[10px] uppercase font-semibold">File Size</span>
                  <span className="text-on-surface">{metadata.fileSize}</span>
                </div>
              )}
              {metadata?.creator && (
                <div className="flex flex-col">
                  <span className="text-outline text-[10px] uppercase font-semibold">Application</span>
                  <span className="text-on-surface truncate">{metadata.creator}</span>
                </div>
              )}

              {filePath && !filePath.startsWith('blob:') && (
                <div className="pt-3 border-t border-surface-container-high/60">
                  <button
                    onClick={() => {
                      invoke('show_in_folder', { path: filePath }).catch((err) => {
                        console.warn('Failed to reveal file in folder:', err);
                      });
                    }}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md bg-surface-container hover:bg-surface-container-high text-xs text-on-surface font-medium transition-colors border border-surface-container-highest/60 shadow-xs active:scale-[0.98]"
                    title="Reveal file in Windows File Explorer"
                  >
                    <svg className="w-3.5 h-3.5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                    </svg>
                    <span>Open File Location</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
