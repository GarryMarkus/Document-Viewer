import { useRef, useState } from 'react';
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
}: HeaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pageInput, setPageInput] = useState('');
  const [editingPage, setEditingPage] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onFileSelected) {
      const url = URL.createObjectURL(file);
      onFileSelected(url, file.name);
    }
    setMenuOpen(false);
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

  return (
    <div 
      data-tauri-drag-region 
      onDoubleClick={(e) => {
        if ((e.target as HTMLElement).closest('button, input')) return;
        appWindow.toggleMaximize();
      }}
      className={`h-[38px] ${bg} flex items-center shrink-0 select-none border-b ${border} rounded-t-[12px]`}
    >
      {/* ===== LEFT HALF: App Controls ===== */}
      <div className="flex items-center h-full px-1.5 gap-0.5" data-tauri-drag-region>
        {/* Search */}
        <button className={`w-7 h-7 rounded-lg ${hover} ${active} flex items-center justify-center ${text}`} title="Search">
          <svg className="w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        </button>

        {/* App Title */}
        <span className={`text-sm font-semibold ${text} px-2 pointer-events-none`} data-tauri-drag-region>Document Viewer</span>

        {/* Hamburger Menu */}
        <div className="relative">
          <button 
            onClick={() => setMenuOpen(!menuOpen)} 
            className={`w-7 h-7 rounded-lg ${hover} ${active} flex items-center justify-center ${text}`}
            title="Menu"
          >
            <svg className="w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>

          {/* Dropdown */}
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <div className={`absolute top-full left-0 mt-1 w-52 rounded-xl shadow-xl border py-1.5 z-50 ${darkMode ? 'bg-dark-sidebar border-dark-border' : 'bg-white border-gray-200/80'}`}>
                <button 
                  onClick={() => fileInputRef.current?.click()} 
                  className={`w-full text-left px-4 py-2 text-sm ${text} ${hover} flex items-center gap-3`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" /></svg>
                  Open File…
                </button>
                <div className={`border-t my-1 ${darkMode ? 'border-dark-border' : 'border-gray-100'}`} />
                <button 
                  onClick={() => { onToggleDarkMode?.(); setMenuOpen(false); }}
                  className={`w-full text-left px-4 py-2 text-sm ${text} ${hover} flex items-center gap-3`}
                >
                  {darkMode ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><path strokeLinecap="round" d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
                  )}
                  {darkMode ? 'Light Mode' : 'Dark Mode'}
                </button>
                <div className={`border-t my-1 ${darkMode ? 'border-dark-border' : 'border-gray-100'}`} />
                <button className={`w-full text-left px-4 py-2 text-sm ${text} ${hover} flex items-center gap-3`}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  About
                </button>
              </div>
            </>
          )}
        </div>

        {/* Sidebar Toggle */}
        <button 
          onClick={onToggleSidebar}
          className={`w-7 h-7 rounded-lg flex items-center justify-center ${text} ${sidebarVisible ? activeBtn : `${hover} ${active}`}`}
          title="Toggle Sidebar (F9)"
        >
          <svg className="w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 4h10a1 1 0 011 1v14a1 1 0 01-1 1H9M9 4H5a1 1 0 00-1 1v14a1 1 0 001 1h4M9 4v16" /></svg>
        </button>
      </div>

      {/* ===== SEPARATOR ===== */}
      <div className={`w-px h-5 mx-1 ${darkMode ? 'bg-dark-border' : 'bg-adwaita-border'}`} />

      {/* ===== RIGHT HALF: Document Info + Window Controls ===== */}
      <div className="flex-1 flex items-center justify-between h-full pr-1.5" data-tauri-drag-region>
        <div className="flex items-center gap-2 min-w-0 px-2" data-tauri-drag-region>
          {fileName ? (
            <>
              <span className={`text-sm ${text} truncate max-w-[280px] pointer-events-none`} data-tauri-drag-region>{fileName}</span>

              {numPages > 0 && (
                <div className={`flex items-center gap-1 text-sm ${textDim} shrink-0 ml-2`}>
                  {editingPage ? (
                    <input 
                      type="number"
                      value={pageInput}
                      onChange={e => setPageInput(e.target.value)}
                      onBlur={handlePageSubmit}
                      onKeyDown={e => { if (e.key === 'Enter') handlePageSubmit(); if (e.key === 'Escape') setEditingPage(false); }}
                      className={`w-10 h-6 text-center text-sm border rounded px-1 focus:outline-none ${darkMode ? 'bg-dark-bg border-dark-border text-dark-text focus:border-dark-accent' : 'bg-white border-adwaita-border text-adwaita-text focus:border-adwaita-accent'}`}
                      autoFocus
                      min={1}
                      max={numPages}
                    />
                  ) : (
                    <button 
                      onClick={() => { setPageInput(String(currentPage)); setEditingPage(true); }}
                      className={`h-6 px-1.5 border rounded text-sm min-w-[28px] ${darkMode ? 'bg-dark-bg/60 border-dark-border text-dark-text hover:bg-dark-bg' : 'bg-white/60 border-adwaita-border text-adwaita-text hover:bg-white'}`}
                    >
                      {currentPage}
                    </button>
                  )}
                  <span className="pointer-events-none">of {numPages}</span>
                </div>
              )}
            </>
          ) : (
            <span className={`text-sm ${textDim} pointer-events-none`} data-tauri-drag-region>Document Viewer</span>
          )}
        </div>

        {/* Window controls */}
        <div className="flex items-center gap-1 shrink-0">
          <button className={`w-7 h-7 rounded-lg ${hover} ${active} flex items-center justify-center ${text}`} title="Document Options">
            <svg className="w-4 h-4 pointer-events-none" fill="currentColor" viewBox="0 0 20 20"><circle cx="10" cy="4" r="1.5"/><circle cx="10" cy="10" r="1.5"/><circle cx="10" cy="16" r="1.5"/></svg>
          </button>
          
          <button 
            onClick={() => appWindow.minimize()} 
            className={`w-7 h-7 rounded-full ${hover} ${active} flex items-center justify-center ${textDim}`}
            title="Minimize"
          >
            <svg className="w-3.5 h-3.5 pointer-events-none" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" d="M5 12h14" /></svg>
          </button>
          
          <button 
            onClick={() => appWindow.close()} 
            className={`w-8 h-[28px] rounded-md hover:bg-red-500/90 active:bg-red-600/90 flex items-center justify-center ${textDim} hover:text-white transition-colors`}
            title="Close"
          >
            <svg className="w-3.5 h-3.5 pointer-events-none" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      </div>

      <input 
        type="file" 
        accept="application/pdf" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
      />
    </div>
  );
}
