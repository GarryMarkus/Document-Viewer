import { useState, useEffect, useCallback, useRef } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { invoke } from '@tauri-apps/api/core';

import TitleBar from './components/layout/TitleBar';
import CommandRibbon from './components/layout/CommandRibbon';
import NavigationRail, { NavDrawerTab } from './components/layout/NavigationRail';
import NavigationDrawer from './components/layout/NavigationDrawer';
import StatusFooter from './components/layout/StatusFooter';
import RecentFilesView from './components/home/RecentFilesView';
import ShortcutsModal from './components/layout/ShortcutsModal';
import GoToPageModal from './components/layout/GoToPageModal';
import VirtualScrollContainer from './engine/VirtualScrollContainer';
import XlsxGridView from './components/reader/XlsxGridView';
import PresentationView from './components/reader/PresentationView';
import FPSOverlay from './components/dev/FPSOverlay';
import FloatingActionButtons from './components/reader/FloatingActionButtons';
import SearchBar from './components/reader/SearchBar';
import DocumentErrorView, { DocumentErrorInfo } from './components/common/DocumentErrorView';

import { DocumentTab, DocumentFormat, DocumentOutlineItem, DocumentMetadata, RecentFileItem } from './types/document';
import { detectFormat, formatBytes, getRecentFiles, addRecentFile, removeRecentFile, updateFilePosition } from './utils/recentFiles';
import { DocumentRenderer, SearchResult } from './engine/types';
import { PDFRenderer } from './engine/renderers/PDFRenderer';
import { DOCXRenderer } from './engine/renderers/DOCXRenderer';
import { XLSXRenderer } from './engine/renderers/XLSXRenderer';
import { PPTXRenderer } from './engine/renderers/PPTXRenderer';

const appWindow = getCurrentWindow();

function App() {
  // Theme state
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('darkMode') === 'true';
  });

  // Document Tabs & Active Document State
  const [tabs, setTabs] = useState<DocumentTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | undefined>(undefined);
  const [recentFiles, setRecentFiles] = useState<RecentFileItem[]>(() => getRecentFiles());

  // Active Renderer Instance
  const [renderer, setRenderer] = useState<DocumentRenderer | null>(null);
  const rendererRef = useRef<DocumentRenderer | null>(null);

  // Viewer Display & Interaction State
  const [scale, setScale] = useState(1.2);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [goToPage, setGoToPage] = useState<number | undefined>(undefined);
  const [isContinuous, setIsContinuous] = useState(true);
  const [isDual, setIsDual] = useState(false);
  const [rotation, setRotation] = useState(0);

  // Navigation Drawer State
  const [drawerTab, setDrawerTab] = useState<NavDrawerTab>('pages');
  const [outline, setOutline] = useState<DocumentOutlineItem[]>([]);
  const [metadata, setMetadata] = useState<DocumentMetadata | null>(null);
  const [bookmarks, setBookmarks] = useState<number[]>([]);

  // Search & Find State
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [activeSearchIndex, setActiveSearchIndex] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [matchCase, setMatchCase] = useState(false);

  // Modals & Tools
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showGoToPageModal, setShowGoToPageModal] = useState(false);
  const [showFpsOverlay, setShowFpsOverlay] = useState(false);
  const [isBenchmarking, setIsBenchmarking] = useState(false);
  const [isPresentationMode, setIsPresentationMode] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  // Document Error State
  const [documentError, setDocumentError] = useState<DocumentErrorInfo | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Active Tab Derived
  const activeTab = tabs.find(t => t.id === activeTabId);
  const currentFormat: DocumentFormat = activeTab?.format || 'unknown';

  // Apply Dark Mode class & Dynamic Window Icon
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', String(darkMode));

    const updateIcon = async () => {
      try {
        const iconPath = darkMode ? '/document reader (dark).png' : '/document reader (light).png';
        const response = await fetch(iconPath);
        const buffer = await response.arrayBuffer();
        await appWindow.setIcon(new Uint8Array(buffer));
      } catch (e) {
        console.warn('Failed to set window icon:', e);
      }
    };
    updateIcon();
  }, [darkMode]);

  // Window Maximized State tracking
  useEffect(() => {
    const checkMaximized = async () => {
      try {
        const max = await appWindow.isMaximized();
        setIsMaximized(max);
      } catch {}
    };
    checkMaximized();
    window.addEventListener('resize', checkMaximized);
    return () => window.removeEventListener('resize', checkMaximized);
  }, []);

  // Instantiate & initialize renderer when active tab changes
  useEffect(() => {
    if (!activeTab || !activeTab.fileBytes) {
      if (rendererRef.current) {
        rendererRef.current.destroy();
        rendererRef.current = null;
      }
      setRenderer(null);
      setNumPages(0);
      setOutline([]);
      setDocumentError(null);
      return;
    }

    let isCancelled = false;
    setDocumentError(null);

    const loadRenderer = async (password?: string) => {
      if (rendererRef.current) {
        rendererRef.current.destroy();
        rendererRef.current = null;
      }

      if (activeTab.format === 'unknown') {
        setDocumentError({
          type: 'unsupported',
          message: `The file format could not be identified or is unsupported. Supported formats: PDF, DOCX, XLSX, and PPTX.`,
        });
        return;
      }

      let r: DocumentRenderer | null = null;
      if (activeTab.format === 'pdf') {
        r = new PDFRenderer();
      } else if (activeTab.format === 'docx') {
        r = new DOCXRenderer();
      } else if (activeTab.format === 'xlsx') {
        r = new XLSXRenderer();
      } else if (activeTab.format === 'pptx') {
        r = new PPTXRenderer();
      }

      if (r) {
        try {
          const meta = await r.open(activeTab.fileBytes!, activeTab.name, password);
          if (isCancelled) {
            r.destroy();
            return;
          }

          rendererRef.current = r;
          setRenderer(r);
          setDocumentError(null);

          const pages = r.getPageCount();
          setNumPages(pages);

          const docOutline = await r.getOutline();
          setOutline(docOutline);

          setMetadata({
            ...meta,
            fileSize: formatBytes(activeTab.fileBytes!.byteLength),
          });
        } catch (e: any) {
          console.error(`Failed to load ${activeTab.format} in engine:`, e);
          if (isCancelled) return;

          if (e?.name === 'PasswordException' || e?.isPasswordRequired) {
            setDocumentError({
              type: 'password',
              message: e.message || 'Password required',
              isIncorrectPassword: e.isIncorrectPassword,
            });
          } else {
            setDocumentError({
              type: 'corrupted',
              message: e?.message || 'Could not parse document structure. File may be corrupted or damaged.',
            });
          }
        }
      }
    };

    loadRenderer();

    return () => {
      isCancelled = true;
    };
  }, [activeTab]);

  // Unlock password-protected document
  const handleUnlockDocument = useCallback((password: string) => {
    if (!activeTab || !activeTab.fileBytes) return;
    if (activeTab.format === 'pdf') {
      const r = new PDFRenderer();
      r.open(activeTab.fileBytes, activeTab.name, password).then(async (meta) => {
        if (rendererRef.current) rendererRef.current.destroy();
        rendererRef.current = r;
        setRenderer(r);
        setDocumentError(null);
        setNumPages(r.getPageCount());
        const docOutline = await r.getOutline();
        setOutline(docOutline);
        setMetadata({
          ...meta,
          fileSize: formatBytes(activeTab.fileBytes!.byteLength),
        });
      }).catch(() => {
        setDocumentError({
          type: 'password',
          message: 'Incorrect password',
          isIncorrectPassword: true,
        });
      });
    }
  }, [activeTab]);

  // Retry loading current document
  const handleRetryDocument = useCallback(() => {
    const curId = activeTabId;
    setActiveTabId(undefined);
    setTimeout(() => setActiveTabId(curId), 20);
  }, [activeTabId]);

  // Open Document File
  const openDocumentBytes = useCallback(async (name: string, bytes: Uint8Array, filePath?: string) => {
    const format = detectFormat(name);
    const id = filePath || `${name}-${Date.now()}`;
    const blob = new Blob([bytes as any], {
      type: format === 'pdf' ? 'application/pdf' : 'application/octet-stream',
    });
    const url = URL.createObjectURL(blob);

    const newTab: DocumentTab = {
      id,
      name,
      path: filePath,
      format,
      fileBytes: bytes,
      url,
    };

    setTabs(prev => {
      const existing = prev.find(t => t.id === id);
      if (existing) return prev;
      return [...prev, newTab];
    });
    setActiveTabId(id);
    setCurrentPage(1);
    setGoToPage(1);
    setRotation(0);
    setOutline([]);

    // Record in Recent Files
    const updated = addRecentFile({
      path: filePath || id,
      name,
      format,
      size: bytes.byteLength,
      lastOpened: Date.now(),
      lastPage: 1,
    });
    setRecentFiles(updated);
  }, []);

  // Handle Startup File (CLI arg or Windows double click)
  useEffect(() => {
    const handleStartupFile = async () => {
      try {
        const filePath = await invoke<string | null>('check_startup_file');
        if (filePath) {
          const name = filePath.split(/[\\/]/).pop() || 'Document.pdf';
          const fileBytes = await invoke<number[]>('read_file_bytes', { path: filePath });
          await openDocumentBytes(name, new Uint8Array(fileBytes), filePath);
        }
      } catch (e) {
        console.error('Failed to load startup file:', e);
      }
    };
    handleStartupFile();
  }, [openDocumentBytes]);

  // Open from native File object
  const openNativeFile = useCallback(async (file: File) => {
    const buffer = await file.arrayBuffer();
    await openDocumentBytes(file.name, new Uint8Array(buffer));
  }, [openDocumentBytes]);

  // Open from Recent Files
  const handleSelectRecent = useCallback(async (item: RecentFileItem) => {
    if (item.path && !item.path.startsWith('blob:')) {
      try {
        const fileBytes = await invoke<number[]>('read_file_bytes', { path: item.path });
        await openDocumentBytes(item.name, new Uint8Array(fileBytes), item.path);
        if (item.lastPage) {
          setCurrentPage(item.lastPage);
          setGoToPage(item.lastPage);
        }
        return;
      } catch (e) {
        console.warn('Could not open file from path, prompting selection:', e);
      }
    }
    fileInputRef.current?.click();
  }, [openDocumentBytes]);

  const handleCloseTab = (id: string) => {
    setTabs(prev => {
      const nextTabs = prev.filter(t => t.id !== id);
      if (activeTabId === id) {
        const newActive = nextTabs[nextTabs.length - 1]?.id;
        setActiveTabId(newActive);
      }
      return nextTabs;
    });
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === e.target) {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) openNativeFile(file);
  };

  // Bookmarking toggle
  const handleToggleBookmark = (pageNum: number) => {
    setBookmarks(prev => 
      prev.includes(pageNum) ? prev.filter(p => p !== pageNum) : [...prev, pageNum].sort((a, b) => a - b)
    );
  };

  // Track page change to update position in recents
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    setGoToPage(page);
    if (activeTab?.path) {
      updateFilePosition(activeTab.path, page);
    }
  };

  // Debounced in-document search runner
  useEffect(() => {
    if (!renderer || !searchQuery.trim()) {
      setSearchResults([]);
      setActiveSearchIndex(0);
      setIsSearching(false);
      return;
    }

    let isCancelled = false;
    setIsSearching(true);

    const timer = setTimeout(async () => {
      try {
        const results = await renderer.search(searchQuery.trim());
        if (!isCancelled) {
          setSearchResults(results);
          setActiveSearchIndex(0);
          setIsSearching(false);

          if (results.length > 0) {
            const firstResult = results[0];
            const targetPage = firstResult.pageIndex + 1;
            setCurrentPage(targetPage);
            setGoToPage(targetPage);
          }
        }
      } catch (err) {
        console.error('Search error in document:', err);
        if (!isCancelled) setIsSearching(false);
      }
    }, 200);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [renderer, searchQuery]);

  const handleNextSearch = useCallback(() => {
    if (searchResults.length === 0) return;
    const nextIdx = (activeSearchIndex + 1) % searchResults.length;
    setActiveSearchIndex(nextIdx);
    const targetPage = searchResults[nextIdx].pageIndex + 1;
    setCurrentPage(targetPage);
    setGoToPage(targetPage);
  }, [searchResults, activeSearchIndex]);

  const handlePrevSearch = useCallback(() => {
    if (searchResults.length === 0) return;
    const prevIdx = (activeSearchIndex - 1 + searchResults.length) % searchResults.length;
    setActiveSearchIndex(prevIdx);
    const targetPage = searchResults[prevIdx].pageIndex + 1;
    setCurrentPage(targetPage);
    setGoToPage(targetPage);
  }, [searchResults, activeSearchIndex]);

  // Automated Scroll Benchmark Runner
  const runScrollBenchmark = async () => {
    const container = document.querySelector('.virtual-scroll-viewport') as HTMLElement;
    if (!container) return;
    setIsBenchmarking(true);

    const startTime = performance.now();
    const maxScroll = Math.max(0, container.scrollHeight - container.clientHeight);
    const duration = 2500; // 2.5s rapid continuous scroll down & up

    return new Promise<void>((resolve) => {
      const scrollStep = (time: number) => {
        const elapsed = time - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const wave = Math.sin(progress * Math.PI);
        container.scrollTop = wave * maxScroll;

        if (progress < 1) {
          requestAnimationFrame(scrollStep);
        } else {
          setIsBenchmarking(false);
          resolve();
        }
      };
      requestAnimationFrame(scrollStep);
    });
  };

  // Global Keyboard Shortcuts
  const stateRef = useRef({
    isContinuous,
    isDual,
    currentPage,
    numPages,
    activeTabId,
    currentFormat,
    isSearchOpen,
    showShortcuts,
    showGoToPageModal,
    handleNextSearch,
    handlePrevSearch,
  });
  useEffect(() => {
    stateRef.current = {
      isContinuous,
      isDual,
      currentPage,
      numPages,
      activeTabId,
      currentFormat,
      isSearchOpen,
      showShortcuts,
      showGoToPageModal,
      handleNextSearch,
      handlePrevSearch,
    };
  }, [
    isContinuous,
    isDual,
    currentPage,
    numPages,
    activeTabId,
    currentFormat,
    isSearchOpen,
    showShortcuts,
    showGoToPageModal,
    handleNextSearch,
    handlePrevSearch,
  ]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const isTyping = tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable;

      if (e.key === 'F5' && stateRef.current.currentFormat === 'pptx') {
        e.preventDefault();
        setIsPresentationMode(true);
        return;
      }
      if (e.ctrlKey && e.shiftKey && e.key.toUpperCase() === 'D') {
        e.preventDefault();
        setShowFpsOverlay(v => !v);
        return;
      }
      if (e.ctrlKey && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        fileInputRef.current?.click();
        return;
      }
      if (e.ctrlKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setIsSearchOpen(true);
        return;
      }
      if (e.ctrlKey && e.key.toLowerCase() === 'g') {
        e.preventDefault();
        setShowGoToPageModal(true);
        return;
      }
      if (e.key === 'F3') {
        e.preventDefault();
        if (e.shiftKey) {
          stateRef.current.handlePrevSearch();
        } else {
          stateRef.current.handleNextSearch();
        }
        return;
      }
      if (e.key === 'Escape') {
        if (stateRef.current.isSearchOpen) {
          setIsSearchOpen(false);
          return;
        }
        if (stateRef.current.showShortcuts) {
          setShowShortcuts(false);
          return;
        }
        if (stateRef.current.showGoToPageModal) {
          setShowGoToPageModal(false);
          return;
        }
      }
      if (!isTyping && e.key === '?') {
        e.preventDefault();
        setShowShortcuts(v => !v);
        return;
      }
      if (e.ctrlKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        window.print();
        return;
      }
      if (e.ctrlKey && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        setScale(s => Math.min(5.0, s + 0.15));
        return;
      }
      if (e.ctrlKey && e.key === '-') {
        e.preventDefault();
        setScale(s => Math.max(0.2, s - 0.15));
        return;
      }
      if (e.ctrlKey && e.key === '0') {
        e.preventDefault();
        setScale(1.0);
        return;
      }
      if (e.key === 'F11') {
        e.preventDefault();
        document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
        return;
      }
      if (e.key === 'F9') {
        e.preventDefault();
        setDrawerTab(t => t === 'none' ? 'pages' : 'none');
        return;
      }
      if (!isTyping && (e.key === 'c' || e.key === 'C')) {
        setIsContinuous(c => !c);
        return;
      }
      if (!isTyping && (e.key === 'd' || e.key === 'D')) {
        setIsDual(d => !d);
        return;
      }
      if (e.ctrlKey && e.key === 'ArrowRight') {
        e.preventDefault();
        setRotation(r => (r + 90) % 360);
        return;
      }
      if (e.ctrlKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        setRotation(r => (r + 270) % 360);
        return;
      }

      // Single-page navigation
      const st = stateRef.current;
      if (!st.isContinuous && st.numPages > 0) {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'PageDown') {
          e.preventDefault();
          const step = st.isDual ? 2 : 1;
          const next = Math.min(st.currentPage + step, st.numPages);
          setCurrentPage(next);
          setGoToPage(next);
        }
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'PageUp') {
          e.preventDefault();
          const step = st.isDual ? 2 : 1;
          const prev = Math.max(st.currentPage - step, 1);
          setCurrentPage(prev);
          setGoToPage(prev);
        }
        if (e.key === 'Home') {
          e.preventDefault();
          setCurrentPage(1);
          setGoToPage(1);
        }
        if (e.key === 'End') {
          e.preventDefault();
          setCurrentPage(st.numPages);
          setGoToPage(st.numPages);
        }
      }
    };

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        setScale(s => Math.min(5.0, Math.max(0.2, s + delta)));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('wheel', handleWheel);
    };
  }, []);

  return (
    <div
      className={`window-frame ${isDragging ? 'drag-over-active' : ''} ${isMaximized ? 'maximized' : ''}`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      {/* 1. WinUI 3 Fluent TitleBar */}
      <TitleBar
        tabs={tabs}
        activeTabId={activeTabId}
        onSelectTab={setActiveTabId}
        onCloseTab={handleCloseTab}
        onOpenFileClick={() => fileInputRef.current?.click()}
        searchQuery={searchQuery}
        onSearchChange={(q) => {
          setSearchQuery(q);
          if (q.trim()) setIsSearchOpen(true);
        }}
        onSearchFocus={() => setIsSearchOpen(true)}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(d => !d)}
      />

      {/* 2. Command Ribbon (when a document is open) */}
      {activeTab && (
        <CommandRibbon
          format={currentFormat}
          currentPage={currentPage}
          numPages={numPages}
          onPageChange={handlePageChange}
          scale={scale}
          onZoomIn={() => setScale(s => Math.min(5.0, s + 0.15))}
          onZoomOut={() => setScale(s => Math.max(0.2, s - 0.15))}
          onResetZoom={() => setScale(1.0)}
          onFitWidth={() => setScale(1.2)}
          isContinuous={isContinuous}
          onToggleContinuous={() => setIsContinuous(c => !c)}
          isDual={isDual}
          onToggleDual={() => setIsDual(d => !d)}
          rotation={rotation}
          onRotate={() => setRotation(r => (r + 90) % 360)}
          onOpenFileClick={() => fileInputRef.current?.click()}
          onPrint={() => window.print()}
          wordCount={metadata?.wordCount}
          onStartPresentation={() => setIsPresentationMode(true)}
        />
      )}

      {/* 3. Main Workspace Area */}
      <div className="flex flex-1 min-w-0 overflow-hidden relative">
        {activeTab ? (
          <>
            {/* Left Navigation Rail (48px) */}
            <NavigationRail
              activeTab={drawerTab}
              onTabChange={setDrawerTab}
              format={currentFormat}
              onOpenShortcuts={() => setShowShortcuts(true)}
            />

            {/* Expandable Navigation Drawer (240px) */}
            <NavigationDrawer
              activeTab={drawerTab}
              onClose={() => setDrawerTab('none')}
              format={currentFormat}
              numPages={numPages}
              currentPage={currentPage}
              onPageSelect={handlePageChange}
              outline={outline}
              metadata={metadata || undefined}
              documentUrl={activeTab.url}
              filePath={activeTab.path}
              bookmarks={bookmarks}
              onToggleBookmark={handleToggleBookmark}
            />

            {/* Document Canvas / Grid Bed */}
            <div className="flex-1 min-w-0 relative h-full bg-background">
              {documentError ? (
                <DocumentErrorView
                  fileName={activeTab.name}
                  format={currentFormat}
                  error={documentError}
                  onRetry={handleRetryDocument}
                  onUnlock={handleUnlockDocument}
                  onOpenFile={() => fileInputRef.current?.click()}
                  onCloseTab={() => handleCloseTab(activeTab.id)}
                />
              ) : (
                <>
                  {/* Floating In-Document Find Bar */}
                  <SearchBar
                    isOpen={isSearchOpen}
                    onClose={() => setIsSearchOpen(false)}
                    query={searchQuery}
                    onQueryChange={setSearchQuery}
                    matchIndex={activeSearchIndex}
                    totalMatches={searchResults.length}
                    onNext={handleNextSearch}
                    onPrev={handlePrevSearch}
                    matchCase={matchCase}
                    onToggleMatchCase={() => setMatchCase(v => !v)}
                    isSearching={isSearching}
                  />

                  {currentFormat === 'xlsx' && renderer instanceof XLSXRenderer ? (
                    <XlsxGridView
                      renderer={renderer}
                      darkMode={darkMode}
                      scale={scale}
                      searchQuery={isSearchOpen ? searchQuery : ''}
                      activeMatchCell={
                        searchResults[activeSearchIndex]
                          ? {
                              sheetIndex: searchResults[activeSearchIndex].pageIndex,
                              r: searchResults[activeSearchIndex].row || 0,
                              c: searchResults[activeSearchIndex].col || 0,
                            }
                          : undefined
                      }
                    />
                  ) : (
                    <VirtualScrollContainer
                      renderer={renderer}
                      scale={scale}
                      rotation={rotation}
                      isContinuous={isContinuous}
                      isDual={isDual}
                      currentPage={currentPage}
                      goToPage={goToPage}
                      onPageChange={handlePageChange}
                      darkMode={darkMode}
                      searchQuery={isSearchOpen ? searchQuery : ''}
                      activeMatchPageIndex={searchResults[activeSearchIndex]?.pageIndex}
                      activeMatchIndex={searchResults[activeSearchIndex]?.matchIndex}
                    />
                  )}

                  {currentFormat !== 'xlsx' && (
                    <FloatingActionButtons
                      onZoomIn={() => setScale(s => Math.min(5.0, s + 0.15))}
                      onZoomOut={() => setScale(s => Math.max(0.2, s - 0.15))}
                      canZoomIn={scale < 4.9}
                      canZoomOut={scale > 0.25}
                      darkMode={darkMode}
                    />
                  )}
                </>
              )}
            </div>
          </>
        ) : (
          /* Empty State: Recent Files & Drag-Drop */
          <RecentFilesView
            recentFiles={recentFiles}
            onOpenFile={() => fileInputRef.current?.click()}
            onSelectRecent={handleSelectRecent}
            onRemoveRecent={(id) => setRecentFiles(removeRecentFile(id))}
            onClearRecents={() => {
              localStorage.removeItem('docs_viewer_recent_files');
              setRecentFiles([]);
            }}
          />
        )}
      </div>

      {/* 4. WinUI Status Footer */}
      {activeTab && (
        <StatusFooter
          format={currentFormat}
          currentPage={currentPage}
          numPages={numPages}
          scale={scale}
          onScaleChange={setScale}
          fileSize={metadata?.fileSize}
          isContinuous={isContinuous}
          onToggleContinuous={() => setIsContinuous(c => !c)}
          isDual={isDual}
          onToggleFpsOverlay={() => setShowFpsOverlay(v => !v)}
          showFpsOverlay={showFpsOverlay}
        />
      )}

      {/* Hidden File Input */}
      <input
        type="file"
        accept=".pdf,.docx,.doc,.xlsx,.xls,.csv,.pptx,.ppt,application/pdf"
        ref={fileInputRef}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) openNativeFile(file);
          e.target.value = '';
        }}
        className="hidden"
      />

      {/* Keyboard Shortcuts Dialog */}
      <ShortcutsModal
        isOpen={showShortcuts}
        onClose={() => setShowShortcuts(false)}
      />

      {/* Go to Page Modal (Ctrl+G) */}
      <GoToPageModal
        isOpen={showGoToPageModal}
        onClose={() => setShowGoToPageModal(false)}
        currentPage={currentPage}
        numPages={numPages}
        onGoToPage={handlePageChange}
      />

      {/* Fullscreen PPTX Slideshow Mode */}
      {isPresentationMode && currentFormat === 'pptx' && renderer instanceof PPTXRenderer && (
        <PresentationView
          renderer={renderer}
          initialSlide={currentPage}
          onExit={() => setIsPresentationMode(false)}
        />
      )}

      {/* Dev FPS & Frame-time Overlay */}
      {showFpsOverlay && (
        <FPSOverlay
          onRunBenchmark={runScrollBenchmark}
          isBenchmarking={isBenchmarking}
        />
      )}
    </div>
  );
}

export default App;
