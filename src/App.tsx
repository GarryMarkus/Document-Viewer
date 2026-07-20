import { useState, useEffect, useCallback, useRef } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { invoke } from '@tauri-apps/api/core';
import UnifiedHeaderbar from './components/layout/UnifiedHeaderbar';
import ContextualSidebar from './components/layout/ContextualSidebar';
import Canvas from './components/reader/Canvas';
import FloatingActionButtons from './components/reader/FloatingActionButtons';
import PropertiesModal from './components/layout/PropertiesModal';

const appWindow = getCurrentWindow();

function App() {
  const [scale, setScale] = useState(1.2);
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [outline, setOutline] = useState<any[]>([]);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [goToPage, setGoToPage] = useState<number | undefined>(undefined);
  const [isDragging, setIsDragging] = useState(false);
  const [metadata, setMetadata] = useState<any>(null);
  const [showProperties, setShowProperties] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('darkMode') === 'true';
  });
  const [isMaximized, setIsMaximized] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check for a PDF passed via command line (double-clicking a file in Windows)
  useEffect(() => {
    const handleStartupFile = async () => {
      try {
        const filePath = await invoke<string | null>('check_startup_file');
        if (filePath) {
          const name = filePath.split(/[\\/]/).pop() || "Document.pdf";
          const fileBytes = await invoke<number[]>('read_file_bytes', { path: filePath });
          
          const blob = new Blob([new Uint8Array(fileBytes)], { type: 'application/pdf' });
          const url = URL.createObjectURL(blob);
          
          setFileName(name);
          setPdfUrl(url);
        }
      } catch (e) {
        console.error("Failed to load startup file:", e);
      }
    };
    handleStartupFile();
  }, []);

  // Dark mode: toggle class on <html> and persist
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', String(darkMode));
    
    // Dynamically update the runtime window icon based on theme
    const updateIcon = async () => {
      try {
        const iconPath = darkMode ? '/document reader (dark).png' : '/document reader (light).png';
        const response = await fetch(iconPath);
        const buffer = await response.arrayBuffer();
        await appWindow.setIcon(new Uint8Array(buffer));
      } catch (e) {
        console.warn("Failed to set dynamic window icon:", e);
      }
    };
    updateIcon();
  }, [darkMode]);

  // Track maximized state for rounded corners
  useEffect(() => {
    const checkMaximized = async () => {
      try {
        const maximized = await appWindow.isMaximized();
        setIsMaximized(maximized);
      } catch {}
    };

    checkMaximized();

    // Listen for resize events to detect maximize/restore
    const handleResize = () => {
      checkMaximized();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Open a file
  const openFile = useCallback((file: File) => {
    if (file.type === 'application/pdf') {
      const url = URL.createObjectURL(file);
      setPdfUrl(url);
      setFileName(file.name);
      setCurrentPage(1);
      setGoToPage(undefined);
      setMetadata(null);
    }
  }, []);

  // Drag-and-drop handlers
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
    if (file) openFile(file);
  };

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'o') {
        e.preventDefault();
        fileInputRef.current?.click();
      }
      if (e.ctrlKey && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        setScale(s => Math.min(4, s + 0.2));
      }
      if (e.ctrlKey && e.key === '-') {
        e.preventDefault();
        setScale(s => Math.max(0.3, s - 0.2));
      }
      if (e.ctrlKey && e.key === '0') {
        e.preventDefault();
        setScale(1.0);
      }
      if (e.key === 'F11') {
        e.preventDefault();
        document.fullscreenElement 
          ? document.exitFullscreen() 
          : document.documentElement.requestFullscreen();
      }
      if (e.key === 'F9') {
        e.preventDefault();
        setSidebarVisible(v => !v);
      }
    };

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        setScale(s => Math.min(4, Math.max(0.3, s + delta)));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('wheel', handleWheel);
    };
  }, []);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) openFile(file);
  };

  return (
    <div 
      className={`window-frame ${isDragging ? 'drag-over-active' : ''} ${isMaximized ? 'maximized' : ''}`}
      onDrop={handleDrop} 
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <UnifiedHeaderbar 
        onFileSelected={(url, name) => {
          setPdfUrl(url);
          setFileName(name);
          setCurrentPage(1);
          setGoToPage(undefined);
        }}
        fileName={fileName}
        numPages={numPages}
        currentPage={currentPage}
        onPageChange={(page) => {
          setCurrentPage(page);
          setGoToPage(page);
        }}
        onToggleSidebar={() => setSidebarVisible(v => !v)}
        sidebarVisible={sidebarVisible}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(d => !d)}
        onShowProperties={() => setShowProperties(true)}
      />

      <div className="flex flex-1 overflow-hidden">
        <ContextualSidebar 
          outline={outline} 
          visible={sidebarVisible}
          documentUrl={pdfUrl}
          numPages={numPages}
          currentPage={currentPage}
          onPageSelect={(page) => {
            setCurrentPage(page);
            setGoToPage(page);
          }}
          darkMode={darkMode}
        />

        <div className="flex-1 relative">
          <Canvas 
            scale={scale} 
            documentUrl={pdfUrl} 
            goToPage={goToPage}
            darkMode={darkMode}
            onDocumentLoad={(pages, documentOutline, docMetadata) => {
              setNumPages(pages);
              setOutline(documentOutline);
              setMetadata(docMetadata);
              setCurrentPage(1);
            }}
            onPageChange={(page) => {
              setCurrentPage(page);
            }}
          />
          
          {pdfUrl && (
            <FloatingActionButtons 
              onZoomIn={() => setScale(s => Math.min(4, s + 0.2))}
              onZoomOut={() => setScale(s => Math.max(0.3, s - 0.2))}
              onFit={() => setScale(1.0)}
              darkMode={darkMode}
            />
          )}
        </div>
      </div>

      <input 
        type="file" 
        accept="application/pdf" 
        ref={fileInputRef} 
        onChange={handleFileInputChange} 
        className="hidden" 
      />

      <PropertiesModal 
        isOpen={showProperties}
        onClose={() => setShowProperties(false)}
        metadata={metadata}
        fileName={fileName}
        numPages={numPages}
        darkMode={darkMode}
      />
    </div>
  );
}

export default App;
