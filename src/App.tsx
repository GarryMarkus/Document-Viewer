import { useState, useEffect, useCallback, useRef } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

import TitleBar from './components/layout/TitleBar';
import CommandRibbon from './components/layout/CommandRibbon';
import NavigationRail from './components/layout/NavigationRail';
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
import DocumentErrorView from './components/common/DocumentErrorView';
import DocumentLoadingView from './components/common/DocumentLoadingView';

import { DocumentFormat, RecentFileItem } from './types/document';
import { detectFormat, formatBytes, getRecentFiles, addRecentFile, removeRecentFile, updateFilePosition } from './utils/recentFiles';
import { DocumentRenderer, SearchResult } from './engine/types';
import { PDFRenderer } from './engine/renderers/PDFRenderer';
import { DOCXRenderer } from './engine/renderers/DOCXRenderer';
import { XLSXRenderer } from './engine/renderers/XLSXRenderer';
import { PPTXRenderer } from './engine/renderers/PPTXRenderer';
import { useTabStore, TabState } from './store/tabStore';

const appWindow = getCurrentWindow();

function App() {
  // Theme state
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('darkMode') === 'true';
  });

  // Dim pages state (persisted per user)
  const [dimPages, setDimPages] = useState(() => {
    return localStorage.getItem('dimPages') === 'true';
  });

  const toggleDimPages = useCallback(() => {
    setDimPages(prev => {
      const next = !prev;
      localStorage.setItem('dimPages', String(next));
      return next;
    });
  }, []);

  // Central Tab Store
  const {
    tabs,
    activeTabId,
    activeTab,
    aliveTabs,
    addTab,
    closeTab,
    setActiveTab,
    updateTab,
    updateActiveTab,
    setTabScroll,
    setTabPage,
    setTabScale,
    setTabRotation,
    setTabDrawer,
    toggleTabBookmark,
  } = useTabStore();

  const [recentFiles, setRecentFiles] = useState<RecentFileItem[]>(() => getRecentFiles());

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

  const fileInputRef = useRef<HTMLInputElement>(null);
  const loadingTabsRef = useRef<Set<string>>(new Set());

  // Active Tab Derived Properties
  const currentFormat: DocumentFormat = activeTab?.effectiveFormat || activeTab?.format || 'unknown';
  const scale = activeTab?.scale ?? 1.2;
  const currentPage = activeTab?.currentPage ?? 1;
  const numPages = activeTab?.numPages ?? 0;
  const rotation = activeTab?.rotation ?? 0;
  const isContinuous = activeTab?.isContinuous ?? true;
  const isDual = activeTab?.isDual ?? false;
  const drawerTab = activeTab?.drawerTab ?? 'pages';

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

  // Async document loader for a specific tab
  const loadTabDocument = useCallback(async (tab: TabState, password?: string) => {
    if (!tab || !tab.fileBytes || loadingTabsRef.current.has(tab.id)) {
      return;
    }
    if (tab.renderer !== null && tab.status === 'ready') {
      return;
    }

    loadingTabsRef.current.add(tab.id);

    if (tab.format === 'unknown') {
      updateTab(tab.id, {
        status: 'error',
        error: {
          type: 'unsupported',
          message: 'The file format could not be identified or is unsupported. Supported formats: PDF, DOCX, XLSX, and PPTX.',
        },
      });
      loadingTabsRef.current.delete(tab.id);
      return;
    }

    updateTab(tab.id, { status: 'loading', error: null, isApproximatePreview: false });

    let renderFormat = tab.format;
    let finalBytes = tab.fileBytes;
    let displayUrl = tab.url;
    let cachedPdfPath = tab.cachedPdfPath;

    if (['docx', 'xlsx', 'pptx'].includes(tab.format)) {
      if (tab.convertedBytes && tab.cachedPdfPath) {
        finalBytes = tab.convertedBytes;
        renderFormat = 'pdf';
        const pdfBlob = new Blob([finalBytes as any], { type: 'application/pdf' });
        displayUrl = URL.createObjectURL(pdfBlob);
      } else {
        if (!cachedPdfPath) {
          try {
            cachedPdfPath = (await invoke<string | null>('check_office_cache', {
              path: tab.path,
              filename: tab.name,
            })) || undefined;
          } catch {}
        }

        if (cachedPdfPath) {
          try {
            finalBytes = await invoke<Uint8Array>('read_file_bytes', { path: cachedPdfPath });
            renderFormat = 'pdf';
            const pdfBlob = new Blob([finalBytes as any], { type: 'application/pdf' });
            displayUrl = URL.createObjectURL(pdfBlob);
            updateTab(tab.id, { cachedPdfPath, convertedBytes: finalBytes });
          } catch {
            cachedPdfPath = undefined;
          }
        }

        if (!cachedPdfPath) {
          let unlisten: any;
          try {
            unlisten = await listen<{ tab_id: string; stage: string; percent: number }>(
              'conversion-job-progress',
              (event) => {
                if (event.payload.tab_id === tab.id) {
                  updateTab(tab.id, {
                    progress: {
                      status: event.payload.stage,
                      percent: event.payload.percent,
                    },
                  });
                }
              }
            );

            cachedPdfPath = await invoke<string>('convert_document_job', {
              tabId: tab.id,
              path: tab.path,
              filename: tab.name,
              bytes: tab.path ? undefined : (tab.fileBytes ? Array.from(tab.fileBytes) : undefined),
            });

            finalBytes = await invoke<Uint8Array>('read_file_bytes', { path: cachedPdfPath });
            renderFormat = 'pdf';
            const pdfBlob = new Blob([finalBytes as any], { type: 'application/pdf' });
            displayUrl = URL.createObjectURL(pdfBlob);
            updateTab(tab.id, { cachedPdfPath, convertedBytes: finalBytes });
          } catch (e: any) {
            const errStr = String(e || '');
            if (errStr.includes('Cancelled')) {
              console.log(`Conversion for tab ${tab.id} was cancelled.`);
              return;
            }
            console.warn('Office conversion failed, falling back to approximate JS renderer', e);
            updateTab(tab.id, { isApproximatePreview: true });
          } finally {
            if (unlisten) unlisten();
            updateTab(tab.id, { progress: null });
          }
        }
      }
    }

    updateTab(tab.id, { effectiveFormat: renderFormat, effectiveDocumentUrl: displayUrl });

    let r: DocumentRenderer | null = null;
    if (renderFormat === 'pdf') {
      r = new PDFRenderer();
    } else if (renderFormat === 'docx') {
      r = new DOCXRenderer();
    } else if (renderFormat === 'xlsx') {
      r = new XLSXRenderer();
    } else if (renderFormat === 'pptx') {
      r = new PPTXRenderer();
    }

    if (r) {
      try {
        const meta = await r.open(finalBytes, tab.name, password);
        const pages = r.getPageCount();
        const docOutline = await r.getOutline();

        updateTab(tab.id, {
          renderer: r,
          status: 'ready',
          error: null,
          numPages: pages,
          outline: docOutline,
          metadata: {
            ...meta,
            fileSize: formatBytes(tab.fileBytes.byteLength),
          },
        });
      } catch (e: any) {
        console.error(`Failed to load ${tab.format} in engine:`, e);
        if (e?.name === 'PasswordException' || e?.isPasswordRequired) {
          updateTab(tab.id, {
            status: 'error',
            error: {
              type: 'password',
              message: e.message || 'Password required',
              isIncorrectPassword: e.isIncorrectPassword,
            },
          });
        } else {
          updateTab(tab.id, {
            status: 'error',
            error: {
              type: 'corrupted',
              message: e?.message || 'Could not parse document structure. File may be corrupted or damaged.',
            },
          });
        }
      } finally {
        loadingTabsRef.current.delete(tab.id);
      }
    } else {
      loadingTabsRef.current.delete(tab.id);
    }
  }, [updateTab]);

  // Trigger loading when active tab needs renderer
  useEffect(() => {
    if (activeTab && activeTab.status === 'loading' && activeTab.renderer === null) {
      loadTabDocument(activeTab);
    }
  }, [activeTab, loadTabDocument]);

  // Unlock password-protected document
  const handleUnlockDocument = useCallback((password: string) => {
    if (!activeTab) return;
    loadTabDocument(activeTab, password);
  }, [activeTab, loadTabDocument]);

  // Retry loading current document
  const handleRetryDocument = useCallback(() => {
    if (!activeTab) return;
    updateTab(activeTab.id, { renderer: null, status: 'loading', error: null });
  }, [activeTab, updateTab]);

  // Open Document File
  const openDocumentBytes = useCallback(async (
    name: string,
    bytes: Uint8Array,
    filePath?: string,
    lastPage?: number,
    lastScrollTop?: number
  ) => {
    const format = detectFormat(name);
    const id = filePath || `${name}-${Date.now()}`;
    const blob = new Blob([bytes as any], {
      type: format === 'pdf' ? 'application/pdf' : 'application/octet-stream',
    });
    const url = URL.createObjectURL(blob);

    addTab({
      id,
      name,
      path: filePath,
      format,
      fileBytes: bytes,
      url,
      lastPage,
      lastScrollTop,
    });

    // Record in Recent Files
    const updated = addRecentFile({
      path: filePath || id,
      name,
      format,
      size: bytes.byteLength,
      lastOpened: Date.now(),
      lastPage: lastPage || 1,
      lastScrollTop: lastScrollTop || 0,
    });
    setRecentFiles(updated);
  }, [addTab]);

  // Handle Startup File (CLI arg or Windows double click)
  useEffect(() => {
    const handleStartupFile = async () => {
      try {
        const filePath = await invoke<string | null>('check_startup_file');
        if (filePath) {
          const name = filePath.split(/[\\/]/).pop() || 'Document.pdf';
          const fileBytes = await invoke<Uint8Array>('read_file_bytes', { path: filePath });
          await openDocumentBytes(name, fileBytes, filePath);
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
    const diskPath = (file as any).path || undefined;
    await openDocumentBytes(file.name, new Uint8Array(buffer), diskPath);
  }, [openDocumentBytes]);

  // Native window drag-and-drop listener to always capture absolute file paths
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    appWindow.onDragDropEvent(async (event) => {
      if (event.payload.type === 'drop') {
        const paths = event.payload.paths;
        if (paths && paths.length > 0) {
          const filePath = paths[0];
          const name = filePath.split(/[\\/]/).pop() || 'Document';
          try {
            const fileBytes = await invoke<Uint8Array>('read_file_bytes', { path: filePath });
            await openDocumentBytes(name, fileBytes, filePath);
          } catch (e) {
            console.error('Failed to load dropped file:', e);
          }
        }
      }
    }).then(u => { unlisten = u; }).catch(() => {});

    return () => {
      if (unlisten) unlisten();
    };
  }, [openDocumentBytes]);

  // Open from Recent Files
  const handleSelectRecent = useCallback(async (item: RecentFileItem) => {
    if (item.path && !item.path.startsWith('blob:')) {
      try {
        const fileBytes = await invoke<Uint8Array>('read_file_bytes', { path: item.path });
        await openDocumentBytes(item.name, fileBytes, item.path, item.lastPage, item.lastScrollTop);
        return;
      } catch (e) {
        console.warn('Could not open file from path, prompting selection:', e);
      }
    }
    fileInputRef.current?.click();
  }, [openDocumentBytes]);

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
    if (file) {
      const diskPath = (file as any).path || undefined;
      file.arrayBuffer().then(buf => {
        openDocumentBytes(file.name, new Uint8Array(buf), diskPath);
      });
    }
  };

  // Track page change to update position in recents and store
  const handlePageChange = (page: number) => {
    if (!activeTab) return;
    setTabPage(activeTab.id, page);
    if (activeTab.path) {
      updateFilePosition(activeTab.path, page);
    }
  };

  // Debounced in-document search runner
  useEffect(() => {
    const renderer = activeTab?.renderer;
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
            handlePageChange(targetPage);
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
  }, [activeTab?.renderer, searchQuery]);

  const handleNextSearch = useCallback(() => {
    if (searchResults.length === 0) return;
    const nextIdx = (activeSearchIndex + 1) % searchResults.length;
    setActiveSearchIndex(nextIdx);
    const targetPage = searchResults[nextIdx].pageIndex + 1;
    handlePageChange(targetPage);
  }, [searchResults, activeSearchIndex]);

  const handlePrevSearch = useCallback(() => {
    if (searchResults.length === 0) return;
    const prevIdx = (activeSearchIndex - 1 + searchResults.length) % searchResults.length;
    setActiveSearchIndex(prevIdx);
    const targetPage = searchResults[prevIdx].pageIndex + 1;
    handlePageChange(targetPage);
  }, [searchResults, activeSearchIndex]);

  // Automated Scroll Benchmark Runner
  const runScrollBenchmark = async () => {
    const container = document.querySelector('.virtual-scroll-viewport') as HTMLElement;
    if (!container) return;
    setIsBenchmarking(true);

    const startTime = performance.now();
    const maxScroll = Math.max(0, container.scrollHeight - container.clientHeight);
    const duration = 2500;

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
        if (stateRef.current.activeTabId) {
          setTabScale(stateRef.current.activeTabId, Math.min(5.0, scale + 0.15));
        }
        return;
      }
      if (e.ctrlKey && e.key === '-') {
        e.preventDefault();
        if (stateRef.current.activeTabId) {
          setTabScale(stateRef.current.activeTabId, Math.max(0.2, scale - 0.15));
        }
        return;
      }
      if (e.ctrlKey && e.key === '0') {
        e.preventDefault();
        if (stateRef.current.activeTabId) {
          setTabScale(stateRef.current.activeTabId, 1.0);
        }
        return;
      }
      if (e.key === 'F11') {
        e.preventDefault();
        document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
        return;
      }
      if (e.key === 'F9') {
        e.preventDefault();
        if (stateRef.current.activeTabId) {
          setTabDrawer(stateRef.current.activeTabId, drawerTab === 'none' ? 'pages' : 'none');
        }
        return;
      }
      if (!isTyping && (e.key === 'c' || e.key === 'C')) {
        if (stateRef.current.activeTabId) {
          updateActiveTab({ isContinuous: !isContinuous });
        }
        return;
      }
      if (!isTyping && (e.key === 'd' || e.key === 'D')) {
        if (stateRef.current.activeTabId) {
          updateActiveTab({ isDual: !isDual });
        }
        return;
      }
      if (e.ctrlKey && e.key === 'ArrowRight') {
        e.preventDefault();
        if (stateRef.current.activeTabId) {
          setTabRotation(stateRef.current.activeTabId, (rotation + 90) % 360);
        }
        return;
      }
      if (e.ctrlKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        if (stateRef.current.activeTabId) {
          setTabRotation(stateRef.current.activeTabId, (rotation + 270) % 360);
        }
        return;
      }

      // Single-page navigation
      const st = stateRef.current;
      if (!st.isContinuous && st.numPages > 0 && st.activeTabId) {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'PageDown') {
          e.preventDefault();
          const step = st.isDual ? 2 : 1;
          const next = Math.min(st.currentPage + step, st.numPages);
          handlePageChange(next);
        }
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'PageUp') {
          e.preventDefault();
          const step = st.isDual ? 2 : 1;
          const prev = Math.max(st.currentPage - step, 1);
          handlePageChange(prev);
        }
        if (e.key === 'Home') {
          e.preventDefault();
          handlePageChange(1);
        }
        if (e.key === 'End') {
          e.preventDefault();
          handlePageChange(st.numPages);
        }
      }
    };

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey && stateRef.current.activeTabId) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        setTabScale(stateRef.current.activeTabId, Math.min(5.0, Math.max(0.2, scale + delta)));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('wheel', handleWheel);
    };
  }, [scale, isContinuous, isDual, rotation, drawerTab, updateActiveTab, setTabScale, setTabRotation, setTabDrawer]);

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
        onSelectTab={setActiveTab}
        onCloseTab={closeTab}
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

      {/* 2. Command Ribbon (when active document is open) */}
      {activeTab && (
        <CommandRibbon
          format={currentFormat}
          currentPage={currentPage}
          numPages={numPages}
          onPageChange={handlePageChange}
          scale={scale}
          onZoomIn={() => setTabScale(activeTab.id, Math.min(5.0, scale + 0.15))}
          onZoomOut={() => setTabScale(activeTab.id, Math.max(0.2, scale - 0.15))}
          onResetZoom={() => setTabScale(activeTab.id, 1.0)}
          onFitWidth={() => setTabScale(activeTab.id, 1.2)}
          isContinuous={isContinuous}
          onToggleContinuous={() => updateActiveTab({ isContinuous: !isContinuous })}
          isDual={isDual}
          onToggleDual={() => updateActiveTab({ isDual: !isDual })}
          rotation={rotation}
          onRotate={() => setTabRotation(activeTab.id, (rotation + 90) % 360)}
          onOpenFileClick={() => fileInputRef.current?.click()}
          onPrint={() => window.print()}
          wordCount={activeTab.metadata?.wordCount}
          onStartPresentation={() => setIsPresentationMode(true)}
          dimPages={dimPages}
          onToggleDimPages={toggleDimPages}
        />
      )}

      {/* 3. Main Workspace Area */}
      <div className="flex flex-1 min-w-0 overflow-hidden relative">
        {activeTab ? (
          <>
            {/* Left Navigation Rail (48px) */}
            <NavigationRail
              activeTab={drawerTab}
              onTabChange={(tab) => setTabDrawer(activeTab.id, tab)}
              format={currentFormat}
              onOpenShortcuts={() => setShowShortcuts(true)}
            />

            {/* Expandable Navigation Drawer (240px) */}
            <NavigationDrawer
              activeTab={drawerTab}
              onClose={() => setTabDrawer(activeTab.id, 'none')}
              format={currentFormat}
              numPages={numPages}
              currentPage={currentPage}
              onPageSelect={handlePageChange}
              outline={activeTab.outline}
              metadata={activeTab.metadata || undefined}
              documentUrl={activeTab.effectiveDocumentUrl || activeTab.url}
              filePath={activeTab.path}
              bookmarks={activeTab.bookmarks}
              onToggleBookmark={(pageNum) => toggleTabBookmark(activeTab.id, pageNum)}
            />

            {/* Document Canvas / Grid Bed (keeps up to 5 recently used tab views mounted) */}
            <div className="flex-1 min-w-0 relative h-full bg-background">
              {aliveTabs.map((tab) => {
                const isTabActive = tab.id === activeTabId;
                return (
                  <div
                    key={tab.id}
                    className={isTabActive ? 'h-full w-full relative' : 'hidden'}
                    style={{ display: isTabActive ? 'block' : 'none' }}
                  >
                    {tab.error ? (
                      <DocumentErrorView
                        fileName={tab.name}
                        format={tab.effectiveFormat}
                        error={tab.error}
                        onRetry={handleRetryDocument}
                        onUnlock={handleUnlockDocument}
                        onOpenFile={() => fileInputRef.current?.click()}
                        onCloseTab={() => closeTab(tab.id)}
                      />
                    ) : (
                      <>
                        {tab.status === 'loading' && (
                          <DocumentLoadingView
                            fileName={tab.name}
                            format={tab.effectiveFormat}
                            statusText={tab.progress?.status || 'Loading document...'}
                            percent={tab.progress?.percent || 15}
                            onCancel={() => closeTab(tab.id)}
                          />
                        )}

                        {tab.isApproximatePreview && (
                          <div className="absolute top-0 left-0 right-0 z-40 bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200 text-xs px-4 py-2 text-center border-b border-amber-200 dark:border-amber-700 shadow-sm flex items-center justify-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                            <strong>Approximate Preview Mode:</strong> Native conversion failed or file was dropped without a path. Formatting may not be perfect.
                          </div>
                        )}

                        {/* Floating In-Document Find Bar */}
                        {isTabActive && (
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
                        )}

                        {tab.effectiveFormat === 'xlsx' && tab.renderer instanceof XLSXRenderer ? (
                          <XlsxGridView
                            renderer={tab.renderer}
                            darkMode={darkMode}
                            scale={tab.scale}
                            searchQuery={isSearchOpen && isTabActive ? searchQuery : ''}
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
                            renderer={tab.renderer}
                            scale={tab.scale}
                            rotation={tab.rotation}
                            isContinuous={tab.isContinuous}
                            isDual={tab.isDual}
                            currentPage={tab.currentPage}
                            goToPage={tab.goToPage}
                            initialScrollTop={tab.scrollTop}
                            onScrollPositionChange={(top) => setTabScroll(tab.id, top)}
                            onPageChange={(page) => handlePageChange(page)}
                            darkMode={darkMode}
                            isVisible={isTabActive}
                            dimPages={dimPages}
                            searchQuery={isSearchOpen && isTabActive ? searchQuery : ''}
                            activeMatchPageIndex={searchResults[activeSearchIndex]?.pageIndex}
                            activeMatchIndex={searchResults[activeSearchIndex]?.matchIndex}
                          />
                        )}

                        {tab.effectiveFormat !== 'xlsx' && isTabActive && (
                          <FloatingActionButtons
                            onZoomIn={() => setTabScale(tab.id, Math.min(5.0, tab.scale + 0.15))}
                            onZoomOut={() => setTabScale(tab.id, Math.max(0.2, tab.scale - 0.15))}
                            canZoomIn={tab.scale < 4.9}
                            canZoomOut={tab.scale > 0.25}
                            darkMode={darkMode}
                          />
                        )}
                      </>
                    )}
                  </div>
                );
              })}
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
          onScaleChange={(s) => setTabScale(activeTab.id, s)}
          fileSize={activeTab.metadata?.fileSize}
          isContinuous={isContinuous}
          onToggleContinuous={() => updateActiveTab({ isContinuous: !isContinuous })}
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
      {isPresentationMode && currentFormat === 'pptx' && activeTab?.renderer instanceof PPTXRenderer && (
        <PresentationView
          renderer={activeTab.renderer}
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
