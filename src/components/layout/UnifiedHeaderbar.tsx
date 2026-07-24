import { useRef, useState, useEffect } from 'react';
import { Window } from '@tauri-apps/api/window';

const appWindow = new Window('main');

interface HeaderProps {
  onFileSelected?: (url: string, name: string) => void;
  fileName?: string;
  numPages?: number;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  onToggleSidebar?: () => void;
  sidebarVisible?: boolean;
  darkMode?: boolean;
  onToggleDarkMode?: () => void;
  onShowProperties?: () => void;
  isContinuous?: boolean;
  onToggleContinuous?: () => void;
  isDual?: boolean;
  onToggleDual?: () => void;
  onRotate?: () => void;
}

export default function UnifiedHeaderbar({ 
  onFileSelected, 
  fileName = "", 
  numPages = 0, 
  currentPage = 0, 
  onPageChange,
  onToggleSidebar,
  sidebarVisible = true,
  darkMode = false,
  onToggleDarkMode,
  onShowProperties,
  isContinuous,
  onToggleContinuous,
  isDual,
  onToggleDual,
  onRotate,
}: HeaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [appMenuOpen, setAppMenuOpen] = useState(false);
  const [viewMenuOpen, setViewMenuOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [pageInput, setPageInput] = useState('');
  const [editingPage, setEditingPage] = useState(false);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClose = () => {
      setAppMenuOpen(false);
      setViewMenuOpen(false);
    };
    if (appMenuOpen || viewMenuOpen) {
      window.addEventListener('click', handleClose);
    }
    return () => window.removeEventListener('click', handleClose);
  }, [appMenuOpen, viewMenuOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onFileSelected) {
      const url = URL.createObjectURL(file);
      onFileSelected(url, file.name);
    }
    setAppMenuOpen(false);
    setViewMenuOpen(false);
  };

  const handlePageSubmit = () => {
    const num = parseInt(pageInput);
    if (!isNaN(num) && num >= 1 && num <= numPages && onPageChange) {
      onPageChange(num);
    }
    setEditingPage(false);
  };

  const text = darkMode ? 'text-dark-text' : 'text-adwaita-text';
  const textDim = darkMode ? 'text-dark-text-dim' : 'text-adwaita-text-dim';
  const hover = darkMode ? 'hover:bg-dark-hover' : 'hover:bg-adwaita-hover';
  const active = darkMode ? 'active:bg-dark-active' : 'active:bg-adwaita-active';
  const activeBtn = darkMode ? 'bg-dark-active' : 'bg-adwaita-active';

  // Popover Menu Styles
  const popoverBg = darkMode ? 'bg-dark-sidebar' : 'bg-white';
  const popoverBorder = darkMode ? 'border-white/10' : 'border-black/10';
  const popoverShadow = darkMode ? 'shadow-2xl shadow-black/50' : 'shadow-xl shadow-black/10';

  const renderAppMenu = () => (
    <div className="relative shrink-0" onClick={e => e.stopPropagation()}>
      <button 
        onClick={() => { setAppMenuOpen(!appMenuOpen); setViewMenuOpen(false); }} 
        className={`w-7 h-7 rounded-lg ${hover} ${active} flex items-center justify-center ${text} ${appMenuOpen ? activeBtn : ''}`}
        title="App Menu"
      >
        <svg className="w-5 h-5 pointer-events-none" fill="currentColor" viewBox="0 0 20 20"><circle cx="10" cy="4" r="1.5"/><circle cx="10" cy="10" r="1.5"/><circle cx="10" cy="16" r="1.5"/></svg>
      </button>

      {appMenuOpen && (
        <div className={`absolute top-[calc(100%+6px)] left-0 w-64 rounded-xl ${popoverBg} border ${popoverBorder} ${popoverShadow} p-1.5 z-50`}>
          <div className={`popover-caret-up left-3 border-l border-t ${popoverBorder}`}></div>
          <div className="flex flex-col">
            <button onClick={() => fileInputRef.current?.click()} className={`w-full text-left px-3 py-1.5 rounded-md text-sm ${text} ${hover} flex items-center justify-between`}>
              <span>Open...</span>
              <span className={textDim}>Ctrl+O</span>
            </button>
            <div className={`border-t my-1.5 mx-1 ${darkMode ? 'border-white/10' : 'border-black/5'}`} />
            <button onClick={() => { onToggleDarkMode?.(); setAppMenuOpen(false); }} className={`w-full text-left px-3 py-1.5 rounded-md text-sm ${text} ${hover} flex items-center justify-between`}>
              <span>{darkMode ? 'Day Mode' : 'Night Mode'}</span>
              <span className={textDim}>Ctrl+I</span>
            </button>
            <div className={`border-t my-1.5 mx-1 ${darkMode ? 'border-white/10' : 'border-black/5'}`} />
            <button onClick={() => { setShortcutsOpen(true); setAppMenuOpen(false); }} className={`w-full text-left px-3 py-1.5 rounded-md text-sm ${text} ${hover} flex items-center justify-between`}>
              <span>Keyboard Shortcuts</span>
              <span className={textDim}>Ctrl+?</span>
            </button>
            <button onClick={() => { setAboutOpen(true); setAppMenuOpen(false); }} className={`w-full text-left px-3 py-1.5 rounded-md text-sm ${text} ${hover}`}>
              About Document Viewer
            </button>
          </div>
        </div>
      )}
      
      {aboutOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50" onClick={() => setAboutOpen(false)}>
          <div className={`${popoverBg} p-6 rounded-xl shadow-2xl max-w-sm w-full mx-4 border ${popoverBorder}`} onClick={e => e.stopPropagation()}>
            <h2 className={`text-xl font-bold mb-2 ${text}`}>Document Viewer</h2>
            <p className={`text-sm ${textDim} mb-4`}>Version 2.0.0</p>
            <p className={`text-sm ${text} mb-6`}>A fast, elegant, and modern PDF reader for your documents.</p>
            <button onClick={() => setAboutOpen(false)} className="w-full py-2 bg-[#3584e4] hover:bg-[#1c71d8] text-white rounded-lg text-sm font-medium transition-colors">
              Close
            </button>
          </div>
        </div>
      )}

      {shortcutsOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50" onClick={() => setShortcutsOpen(false)}>
          <div className={`${popoverBg} p-6 rounded-xl shadow-2xl max-w-md w-full mx-4 border ${popoverBorder}`} onClick={e => e.stopPropagation()}>
            <h2 className={`text-xl font-bold mb-4 ${text}`}>Keyboard Shortcuts</h2>
            
            <div className="flex flex-col gap-3 mb-6 max-h-[60vh] overflow-y-auto pr-2">
              <div className="flex items-center justify-between">
                <span className={`text-sm ${textDim}`}>Open Document</span>
                <kbd className={`px-2 py-1 bg-black/5 dark:bg-white/10 rounded text-xs ${text} font-mono`}>Ctrl + O</kbd>
              </div>
              <div className="flex items-center justify-between">
                <span className={`text-sm ${textDim}`}>Zoom In / Out</span>
                <kbd className={`px-2 py-1 bg-black/5 dark:bg-white/10 rounded text-xs ${text} font-mono`}>Ctrl + / -</kbd>
              </div>
              <div className="flex items-center justify-between">
                <span className={`text-sm ${textDim}`}>Fullscreen</span>
                <kbd className={`px-2 py-1 bg-black/5 dark:bg-white/10 rounded text-xs ${text} font-mono`}>F11</kbd>
              </div>
              <div className="flex items-center justify-between">
                <span className={`text-sm ${textDim}`}>Toggle Sidebar</span>
                <kbd className={`px-2 py-1 bg-black/5 dark:bg-white/10 rounded text-xs ${text} font-mono`}>F9</kbd>
              </div>
              <div className="flex items-center justify-between">
                <span className={`text-sm ${textDim}`}>Continuous Mode</span>
                <kbd className={`px-2 py-1 bg-black/5 dark:bg-white/10 rounded text-xs ${text} font-mono`}>C</kbd>
              </div>
              <div className="flex items-center justify-between">
                <span className={`text-sm ${textDim}`}>Dual Mode</span>
                <kbd className={`px-2 py-1 bg-black/5 dark:bg-white/10 rounded text-xs ${text} font-mono`}>D</kbd>
              </div>
              <div className="flex items-center justify-between">
                <span className={`text-sm ${textDim}`}>Rotate Pages</span>
                <kbd className={`px-2 py-1 bg-black/5 dark:bg-white/10 rounded text-xs ${text} font-mono`}>Ctrl + Arrow</kbd>
              </div>
              <div className="flex items-center justify-between">
                <span className={`text-sm ${textDim}`}>Document Properties</span>
                <kbd className={`px-2 py-1 bg-black/5 dark:bg-white/10 rounded text-xs ${text} font-mono`}>Alt + Return</kbd>
              </div>
            </div>

            <button onClick={() => setShortcutsOpen(false)} className="w-full py-2 bg-[#3584e4] hover:bg-[#1c71d8] text-white rounded-lg text-sm font-medium transition-colors">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const CheckIcon = () => (
    <svg className="w-[14px] h-[14px] mr-2" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
  );

  const renderViewMenu = () => (
    <div className="relative" onClick={e => e.stopPropagation()}>
      <button 
        onClick={() => { setViewMenuOpen(!viewMenuOpen); setAppMenuOpen(false); }} 
        className={`w-7 h-7 rounded-lg ${hover} ${active} flex items-center justify-center ${text} ${viewMenuOpen ? activeBtn : ''}`}
        title="View Options"
      >
        <svg className="w-5 h-5 pointer-events-none" fill="currentColor" viewBox="0 0 20 20"><circle cx="10" cy="4" r="1.5"/><circle cx="10" cy="10" r="1.5"/><circle cx="10" cy="16" r="1.5"/></svg>
      </button>

      {viewMenuOpen && (
        <div className={`absolute top-[calc(100%+6px)] right-0 w-[280px] rounded-xl ${popoverBg} border ${popoverBorder} ${popoverShadow} p-1.5 z-50`}>
          <div className={`popover-caret-up right-3 border-l border-t ${popoverBorder}`}></div>
          <div className="flex flex-col">
            <button onClick={() => {
              document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
              setViewMenuOpen(false);
            }} className={`w-full text-left px-3 py-1.5 rounded-md text-sm ${text} ${hover} flex items-center justify-between`}>
              <span>Fullscreen</span>
              <span className={textDim}>F11</span>
            </button>
            <button onClick={() => { onToggleSidebar?.(); setViewMenuOpen(false); }} className={`w-full text-left px-3 py-1.5 rounded-md text-sm ${text} ${hover} flex items-center justify-between`}>
              <span>Toggle Sidebar</span>
              <span className={textDim}>F9</span>
            </button>
            <button onClick={() => { onToggleContinuous?.(); setViewMenuOpen(false); }} className={`relative w-full text-left px-3 py-1.5 rounded-md text-sm ${text} ${hover} flex items-center justify-between pl-[34px]`}>
              {isContinuous && <div className="absolute left-3"><CheckIcon /></div>}
              <span>Continuous</span>
              <span className={textDim}>C</span>
            </button>
            <button onClick={() => { onToggleDual?.(); setViewMenuOpen(false); }} className={`relative w-full text-left px-3 py-1.5 rounded-md text-sm ${text} ${hover} flex items-center justify-between pl-[34px]`}>
              {isDual && <div className="absolute left-3"><CheckIcon /></div>}
              <span>Dual</span>
              <span className={textDim}>D</span>
            </button>
            <div className={`border-t my-1.5 mx-1 ${darkMode ? 'border-white/10' : 'border-black/5'}`} />
            <button onClick={() => { onRotate?.(); setViewMenuOpen(false); }} className={`w-full text-left px-3 py-1.5 rounded-md text-sm ${text} ${hover} flex items-center justify-between pl-[34px]`}>
              <span>Rotate ⤵</span>
              <span className={textDim}>Ctrl+Right</span>
            </button>
            <div className={`border-t my-1.5 mx-1 ${darkMode ? 'border-white/10' : 'border-black/5'}`} />
            <button onClick={() => { onShowProperties?.(); setViewMenuOpen(false); }} className={`w-full text-left px-3 py-1.5 rounded-md text-sm ${text} ${hover} flex items-center justify-between pl-[34px]`}>
              <span>Document Properties</span>
              <span className={textDim}>Alt+Return</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div 
      className={`h-[46px] flex items-center shrink-0 select-none w-full bg-adwaita-header dark:bg-dark-header border-b border-adwaita-border dark:border-dark-border`}
      onDoubleClick={(e) => {
        if ((e.target as HTMLElement).closest('button, input')) return;
        appWindow.toggleMaximize();
      }}
      data-tauri-drag-region
    >
      {/* ===== LEFT HEADERBAR (Matches Sidebar Width) ===== */}
      <div 
        className={`h-full flex items-center px-2 gap-1 shrink-0 border-r border-adwaita-border dark:border-dark-border transition-all duration-300 ease-in-out ${sidebarVisible ? 'w-[260px] opacity-100' : 'w-0 opacity-0 overflow-hidden border-none px-0'}`}
        data-tauri-drag-region
      >
        <div className="min-w-[244px] h-full flex items-center">{renderAppMenu()}</div>
      </div>

      {/* ===== RIGHT HEADERBAR (Expands) ===== */}
      <div className={`h-full flex-1 min-w-0 flex items-center justify-between px-2`} data-tauri-drag-region>
        
        {/* Left Side of Right Headerbar */}
        <div className="flex items-center gap-1.5 shrink-0" data-tauri-drag-region>
          <button onClick={onToggleSidebar} className={`w-8 h-8 rounded-pill ${hover} ${active} flex items-center justify-center ${text}`} title="Toggle Sidebar">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="2"/>
              <path d="M9 4v16" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </button>
          {!sidebarVisible && (
            <div className="ml-1 shrink-0">{renderAppMenu()}</div>
          )}
        </div>

        {/* Center Title */}
        <div className="flex-1 px-4 flex items-center justify-center pointer-events-none min-w-0" data-tauri-drag-region>
          {fileName ? (
            <span className={`text-[14px] font-bold ${text} truncate tracking-wide`} data-tauri-drag-region>
              {fileName}
            </span>
          ) : (
            <span className={`text-[14px] font-bold ${text} truncate tracking-wide`} data-tauri-drag-region>
              Document Viewer
            </span>
          )}
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-1.5 shrink-0" data-tauri-drag-region>
          {fileName && numPages > 0 && (
            <div className={`flex items-center gap-1.5 text-[13px] font-bold ${text} px-3 py-1.5 rounded-pill ${darkMode ? 'bg-dark-active' : 'bg-adwaita-active'} mr-2 shadow-sm`}>
              {editingPage ? (
                <input 
                  type="number"
                  value={pageInput}
                  onChange={e => setPageInput(e.target.value)}
                  onBlur={handlePageSubmit}
                  onKeyDown={e => { if (e.key === 'Enter') handlePageSubmit(); if (e.key === 'Escape') setEditingPage(false); }}
                  className={`w-8 text-center bg-transparent focus:outline-none`}
                  autoFocus min={1} max={numPages}
                />
              ) : (
                <button onClick={() => { setPageInput(String(currentPage)); setEditingPage(true); }}>
                  {currentPage}
                </button>
              )}
              <span className={`font-normal ${textDim}`}>of {numPages}</span>
            </div>
          )}

          {renderViewMenu()}

          {/* Window controls (GNOME style) */}
          <div className="flex items-center gap-2 ml-4 mr-1">
            <button 
              onClick={() => appWindow.minimize()} 
              className={`w-6 h-6 rounded-full ${darkMode ? 'bg-white/10 hover:bg-white/20' : 'bg-black/5 hover:bg-black/10'} flex items-center justify-center`}
            >
              <svg className={`w-3.5 h-3.5 ${text}`} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" d="M5 12h14" /></svg>
            </button>
            <button 
              onClick={() => appWindow.toggleMaximize()} 
              className={`w-6 h-6 rounded-full ${darkMode ? 'bg-white/10 hover:bg-white/20' : 'bg-black/5 hover:bg-black/10'} flex items-center justify-center`}
            >
              <svg className={`w-3 h-3 ${text}`} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2" /></svg>
            </button>
            <button 
              onClick={() => appWindow.close()} 
              className={`w-6 h-6 rounded-full ${darkMode ? 'bg-[#e01b24] hover:bg-[#c01c28]' : 'bg-[#e01b24] hover:bg-[#c01c28]'} flex items-center justify-center transition-colors group`}
            >
              <svg className={`w-3.5 h-3.5 text-white`} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>
      </div>

      <input type="file" accept="application/pdf" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
    </div>
  );
}
