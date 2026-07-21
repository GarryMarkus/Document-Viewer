import { useRef, useState, useEffect } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';

const appWindow = getCurrentWindow();

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
}: HeaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [appMenuOpen, setAppMenuOpen] = useState(false);
  const [viewMenuOpen, setViewMenuOpen] = useState(false);
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

  const bg = darkMode ? 'bg-dark-header' : 'bg-adwaita-header';
  const border = darkMode ? 'border-dark-border' : 'border-adwaita-border';
  const text = darkMode ? 'text-dark-text' : 'text-adwaita-text';
  const textDim = darkMode ? 'text-dark-text-dim' : 'text-adwaita-text-dim';
  const hover = darkMode ? 'hover:bg-dark-hover' : 'hover:bg-adwaita-hover';
  const active = darkMode ? 'active:bg-dark-active' : 'active:bg-adwaita-active';
  const activeBtn = darkMode ? 'bg-dark-active' : 'bg-adwaita-active';

  // Popover Menu Styles
  const popoverBg = darkMode ? 'bg-dark-sidebar' : 'bg-white';
  const popoverBorder = darkMode ? 'border-[#1a1a1a]' : 'border-gray-300';
  const popoverShadow = darkMode ? 'shadow-[0_4px_24px_rgba(0,0,0,0.6)]' : 'shadow-[0_4px_24px_rgba(0,0,0,0.15)]';

  const renderAppMenu = () => (
    <div className="relative shrink-0" onClick={e => e.stopPropagation()}>
      <button 
        onClick={() => { setAppMenuOpen(!appMenuOpen); setViewMenuOpen(false); }} 
        className={`w-8 h-8 rounded-lg ${hover} ${active} flex items-center justify-center ${text} ${appMenuOpen ? activeBtn : ''}`}
        title="App Menu"
      >
        <svg className="w-5 h-5 pointer-events-none" fill="currentColor" viewBox="0 0 20 20"><circle cx="10" cy="4" r="1.5"/><circle cx="10" cy="10" r="1.5"/><circle cx="10" cy="16" r="1.5"/></svg>
      </button>

      {appMenuOpen && (
        <div className={`absolute top-[calc(100%+6px)] left-0 w-64 rounded-xl ${popoverBg} border ${popoverBorder} ${popoverShadow} py-2 z-50`}>
          <div className={`popover-caret-up left-3 border-l border-t ${popoverBorder}`}></div>
          <button onClick={() => fileInputRef.current?.click()} className={`w-full text-left px-4 py-1.5 text-sm ${text} ${hover} flex items-center justify-between`}>
            <span>Open...</span>
            <span className={textDim}>Ctrl+O</span>
          </button>
          <div className={`border-t my-1.5 ${darkMode ? 'border-white/10' : 'border-black/5'}`} />
          <button onClick={() => { onToggleDarkMode?.(); setAppMenuOpen(false); }} className={`w-full text-left px-4 py-1.5 text-sm ${text} ${hover} flex items-center justify-between`}>
            <span>{darkMode ? 'Day Mode' : 'Night Mode'}</span>
            <span className={textDim}>Ctrl+I</span>
          </button>
          <div className={`border-t my-1.5 ${darkMode ? 'border-white/10' : 'border-black/5'}`} />
          <button className={`w-full text-left px-4 py-1.5 text-sm ${text} ${hover} flex items-center justify-between`}>
            <span>Keyboard Shortcuts</span>
            <span className={textDim}>Ctrl+?</span>
          </button>
          <button className={`w-full text-left px-4 py-1.5 text-sm ${text} ${hover} flex items-center justify-between`}>
            <span>Help</span>
            <span className={textDim}>F1</span>
          </button>
          <button className={`w-full text-left px-4 py-1.5 text-sm ${text} ${hover}`}>
            About Document Viewer
          </button>
        </div>
      )}
    </div>
  );

  const renderViewMenu = () => (
    <div className="relative" onClick={e => e.stopPropagation()}>
      <button 
        onClick={() => { setViewMenuOpen(!viewMenuOpen); setAppMenuOpen(false); }} 
        className={`w-8 h-8 rounded-lg ${hover} ${active} flex items-center justify-center ${text} ${viewMenuOpen ? activeBtn : ''}`}
        title="View Options"
      >
        <svg className="w-5 h-5 pointer-events-none" fill="currentColor" viewBox="0 0 20 20"><circle cx="10" cy="4" r="1.5"/><circle cx="10" cy="10" r="1.5"/><circle cx="10" cy="16" r="1.5"/></svg>
      </button>

      {viewMenuOpen && (
        <div className={`absolute top-[calc(100%+6px)] right-0 w-64 rounded-xl ${popoverBg} border ${popoverBorder} ${popoverShadow} py-2 z-50`}>
          <div className={`popover-caret-up right-3 border-l border-t ${popoverBorder}`}></div>
          <button className={`w-full text-left px-4 py-1.5 text-sm ${text} ${hover} flex items-center justify-between`}>
            <span>Print...</span>
            <span className={textDim}>Ctrl+P</span>
          </button>
          <button className={`w-full text-left px-4 py-1.5 text-sm ${text} ${hover} flex items-center justify-between`}>
            <span>Fullscreen</span>
            <span className={textDim}>F11</span>
          </button>
          <button className={`w-full text-left px-4 py-1.5 text-sm ${text} ${hover} flex items-center justify-between`}>
            <span>Present as Slideshow</span>
            <span className={textDim}>F5</span>
          </button>
          <button className={`w-full text-left px-4 py-1.5 text-sm ${text} ${hover}`}>
            Sign Digitally...
          </button>
          <div className={`border-t my-1.5 ${darkMode ? 'border-white/10' : 'border-black/5'}`} />
          <button className={`w-full text-left px-4 py-1.5 text-sm ${text} ${hover} flex items-center justify-between`}>
            <span>Open a Copy</span>
            <span className={textDim}>Shift+Ctrl+N</span>
          </button>
          <button className={`w-full text-left px-4 py-1.5 text-sm ${text} ${hover} flex items-center justify-between`}>
            <span>Open With...</span>
            <span className={textDim}>Shift+Ctrl+O</span>
          </button>
          <button className={`w-full text-left px-4 py-1.5 text-sm ${text} ${hover}`}>
            Save As...
          </button>
          <div className={`border-t my-1.5 ${darkMode ? 'border-white/10' : 'border-black/5'}`} />
          <button className={`w-full text-left px-4 py-1.5 text-sm ${text} ${hover} flex items-center justify-between`}>
            <span className="flex items-center gap-2"><svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg> Continuous</span>
            <span className={textDim}>C</span>
          </button>
          <button className={`w-full text-left px-4 py-1.5 text-sm ${text} ${hover} flex items-center justify-between pl-10`}>
            <span>Dual</span>
            <span className={textDim}>D</span>
          </button>
          <button className={`w-full text-left px-4 py-1.5 text-sm ${text} ${hover} flex items-center justify-between`}>
            <span className="flex items-center gap-2"><svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg> Odd Pages Left</span>
            <span className={textDim}>O</span>
          </button>
          <button className={`w-full text-left px-4 py-1.5 text-sm ${text} ${hover} pl-10`}>
            Right to Left Document
          </button>
          <div className={`border-t my-1.5 ${darkMode ? 'border-white/10' : 'border-black/5'}`} />
          <button className={`w-full text-left px-4 py-1.5 text-sm ${text} ${hover} flex items-center justify-between`}>
            <span>Rotate ⤵</span>
            <span className={textDim}>Ctrl+Right</span>
          </button>
          <div className={`border-t my-1.5 ${darkMode ? 'border-white/10' : 'border-black/5'}`} />
          <button onClick={() => { onShowProperties?.(); setViewMenuOpen(false); }} className={`w-full text-left px-4 py-1.5 text-sm ${text} ${hover} flex items-center justify-between`}>
            <span>Document Properties</span>
            <span className={textDim}>Alt+Return</span>
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div 
      className={`h-[44px] flex items-center shrink-0 select-none w-full`}
      onDoubleClick={(e) => {
        if ((e.target as HTMLElement).closest('button, input')) return;
        appWindow.toggleMaximize();
      }}
    >
      {/* ===== LEFT HEADERBAR (Matches Sidebar Width) ===== */}
      {sidebarVisible && (
        <div 
          className={`h-full flex items-center px-2 gap-1 ${bg} w-[260px] shrink-0 border-r ${border}`}
          data-tauri-drag-region
        >
        <button className={`w-8 h-8 rounded-lg ${hover} ${active} flex items-center justify-center ${text} shrink-0`} title="Search">
          <svg className="w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        </button>
        <div className={`flex-1 min-w-0 flex items-center justify-center px-2 pointer-events-none`} data-tauri-drag-region>
          <span className={`text-sm font-bold ${text} truncate`}>
            Document Viewer
          </span>
        </div>
        {renderAppMenu()}
      </div>
      )}

      {/* ===== RIGHT HEADERBAR (Expands) ===== */}
      <div className={`h-full flex-1 min-w-0 flex items-center justify-between px-2 ${bg} border-b ${border}`} data-tauri-drag-region>
        
        {/* Left Side of Right Headerbar */}
        <div className="flex items-center gap-1 shrink-0" data-tauri-drag-region>
          {!sidebarVisible && (
            <button className={`w-8 h-8 rounded-lg ${hover} ${active} flex items-center justify-center ${text}`} title="Search">
              <svg className="w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </button>
          )}
          
          <button 
            onClick={onToggleSidebar}
            className={`w-8 h-8 rounded-lg flex items-center justify-center ${text} ${sidebarVisible ? activeBtn : `${hover} ${active}`}`}
            title="Toggle Sidebar (F9)"
          >
            <svg className="w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <rect x="3" y="4" width="18" height="16" rx="2" ry="2" stroke="currentColor" strokeWidth={2} fill="none" />
              <line x1="9" y1="4" x2="9" y2="20" stroke="currentColor" strokeWidth={2} />
            </svg>
          </button>

          {!sidebarVisible && (
            <div className="ml-1 shrink-0">{renderAppMenu()}</div>
          )}
        </div>

        {/* Center Title */}
        <div className="flex-1 px-4 flex items-center justify-center pointer-events-none min-w-0" data-tauri-drag-region>
          {fileName && (
            <span className={`text-[13px] font-bold ${text} truncate tracking-wide`} data-tauri-drag-region>
              {fileName}
            </span>
          )}
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-1.5 shrink-0" data-tauri-drag-region>
          {fileName && numPages > 0 && (
            <div className={`flex items-center gap-1.5 text-[13px] font-bold ${text} px-3 py-1 rounded-full ${darkMode ? 'bg-white/10' : 'bg-black/5'} mr-1`}>
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

          {/* Window controls */}
          <button 
            onClick={() => appWindow.minimize()} 
            className={`w-6 h-6 rounded-full ${darkMode ? 'bg-white/10 hover:bg-white/20' : 'bg-black/5 hover:bg-black/10'} flex items-center justify-center ml-1`}
          >
            <svg className={`w-3 h-3 ${text}`} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" d="M5 12h14" /></svg>
          </button>
          
          <button 
            onClick={() => appWindow.close()} 
            className={`w-6 h-6 rounded-full ${darkMode ? 'bg-white/10 hover:bg-white/20' : 'bg-black/5 hover:bg-black/10'} flex items-center justify-center hover:!bg-[#e01b24] hover:!border-transparent transition-colors group`}
          >
            <svg className={`w-3 h-3 ${text} group-hover:text-white`} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      </div>

      <input type="file" accept="application/pdf" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
    </div>
  );
}
