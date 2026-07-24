import React, { useState, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

type SidebarTab = 'thumbnails' | 'outline' | 'annotations' | 'bookmarks';

interface SidebarProps {
  outline?: any[];
  documentUrl?: string;
  numPages?: number;
  currentPage?: number;
  onPageSelect?: (page: number) => void;
  darkMode?: boolean;
}

export default function ContextualSidebar({ 
  outline = [], 
  documentUrl,
  numPages = 0,
  currentPage = 1,
  onPageSelect,
  darkMode = false,
}: SidebarProps) {
  const [activeTab, setActiveTab] = useState<SidebarTab>('outline');
  const [thumbnails, setThumbnails] = useState<Map<number, string>>(new Map());
  const thumbnailScale = 0.3;

  const bg = darkMode ? 'bg-dark-sidebar' : 'bg-adwaita-sidebar';
  const border = darkMode ? 'border-dark-border' : 'border-adwaita-border';
  const text = darkMode ? 'text-dark-text' : 'text-adwaita-text';
  const textDim = darkMode ? 'text-dark-text-dim' : 'text-adwaita-text-dim';
  const hover = darkMode ? 'hover:bg-dark-hover' : 'hover:bg-black/[0.04]';
  const tabInactive = darkMode ? 'text-dark-text-dim hover:bg-dark-hover hover:text-dark-text' : 'text-adwaita-text-dim hover:bg-adwaita-hover hover:text-adwaita-text';

  const observerRef = React.useRef<IntersectionObserver | null>(null);
  const pdfRef = React.useRef<any>(null);

  // Load PDF reference once for thumbnails
  useEffect(() => {
    if (!documentUrl || numPages === 0) {
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
      isOffscreenCanvasSupported: true,
    });
    loadTask.promise.then(pdf => {
      pdfRef.current = pdf;
    }).catch(e => console.warn(e));
  }, [documentUrl, numPages]);

  const generateThumbnail = async (pageNum: number) => {
    if (!pdfRef.current || thumbnails.has(pageNum)) return;
    try {
      const page = await pdfRef.current.getPage(pageNum);
      const viewport = page.getViewport({ scale: thumbnailScale });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      await page.render({ canvasContext: ctx, viewport } as any).promise;
      const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
      setThumbnails(prev => new Map(prev).set(pageNum, dataUrl));
    } catch (e) {
      console.warn('Thumb err', e);
    }
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
  }, [thumbnails]);

  const renderOutlineItems = (items: any[], depth = 0): React.ReactElement[] => {
    if (!items || items.length === 0) return [];
    return items.map((item, idx) => (
      <div key={idx}>
        <button 
          className={`w-full flex items-center justify-between py-2.5 px-4 text-sm ${text} ${hover} active:bg-black/[0.06] transition-colors`}
          style={{ paddingLeft: `${16 + depth * 16}px` }}
          onClick={() => onPageSelect && item.pageNum && onPageSelect(item.pageNum)}
        >
          <span className="truncate mr-3">{item.title}</span>
        </button>
        {item.items && item.items.length > 0 && renderOutlineItems(item.items, depth + 1)}
      </div>
    ));
  };

  const emptyPlaceholder = (icon: React.ReactElement, message: string) => (
    <div className={`flex flex-col items-center justify-center h-full gap-3 px-6 ${darkMode ? 'text-dark-text-dim/40' : 'text-adwaita-text-dim/50'}`}>
      {icon}
      <p className="text-sm text-center">{message}</p>
    </div>
  );

  const tabContent = () => {
    switch (activeTab) {
      case 'thumbnails':
        return (
          <div className="p-3 grid gap-3">
            {Array.from({ length: numPages }, (_, i) => i + 1).map(pageNum => (
              <button 
                key={pageNum}
                onClick={() => onPageSelect?.(pageNum)}
                className={`flex flex-col items-center gap-1.5 group p-2 rounded-lg transition-colors duration-100 ${
                  pageNum === currentPage 
                    ? (darkMode ? 'bg-white/[0.08]' : 'bg-black/[0.06]') 
                    : 'bg-transparent hover:bg-black/[0.03] dark:hover:bg-white/[0.03]'
                }`}
              >
                <div 
                  ref={(el) => observeThumbnail(el as HTMLDivElement, pageNum)}
                  className={`rounded-md overflow-hidden transition-all duration-100 ${
                  pageNum === currentPage 
                    ? `ring-2 ${darkMode ? 'ring-[#3584e4]' : 'ring-[#3584e4]'} shadow-md` 
                    : `border ${darkMode ? 'border-white/10' : 'border-black/[0.08]'} shadow-sm`
                }`}>
                  {thumbnails.has(pageNum) ? (
                    <img src={thumbnails.get(pageNum)} alt={`Page ${pageNum}`} className="w-full block" />
                  ) : (
                    <div className={`w-[140px] h-[198px] flex items-center justify-center ${darkMode ? 'bg-dark-bg' : 'bg-white'}`}>
                      <span className={`text-xs ${textDim}`}>Loading…</span>
                    </div>
                  )}
                </div>
                <span className={`text-xs font-medium ${pageNum === currentPage ? (darkMode ? 'text-[#78aeed]' : 'text-[#3584e4]') : textDim}`}>
                  {pageNum}
                </span>
              </button>
            ))}
          </div>
        );

      case 'outline':
        return outline.length > 0 ? (
          <div className="py-1">
            {renderOutlineItems(outline)}
          </div>
        ) : emptyPlaceholder(
          <svg className="w-12 h-12" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h10M4 18h7" /></svg>,
          'No outline available'
        );

      case 'annotations':
        return emptyPlaceholder(
          <svg className="w-12 h-12" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>,
          'No annotations'
        );

      case 'bookmarks':
        return emptyPlaceholder(
          <svg className="w-12 h-12" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>,
          'No bookmarks'
        );
    }
  };

  const tabs: { id: SidebarTab; icon: React.ReactElement; label: string }[] = [
    { id: 'thumbnails', label: 'Thumbnails', icon: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
      </svg>
    )},
    { id: 'outline', label: 'Outline', icon: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h8m-8 4h4" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h14a2 2 0 012 2v14a2 2 0 01-2 2H5l-2 2V5z" />
      </svg>
    )},
  ];

  return (
    <div className={`w-[260px] h-full ${bg} border-r ${border} flex flex-col shrink-0 select-none`}>
      <div className="flex-1 overflow-y-auto">
        {tabContent()}
      </div>

      <div className={`h-12 flex items-center justify-center border-t ${border} shrink-0 px-4`}>
        <div className={`flex w-full h-[30px] ${darkMode ? 'bg-white/[0.06]' : 'bg-black/[0.06]'} rounded-lg p-[3px] gap-[2px]`}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 h-full rounded-md flex items-center justify-center transition-colors duration-100 ${
                activeTab === tab.id ? `${darkMode ? 'bg-[#3a3a3a]' : 'bg-white'} shadow-sm ${text}` : tabInactive
              }`}
              title={tab.label}
            >
              {tab.icon}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
