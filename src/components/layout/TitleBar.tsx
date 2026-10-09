import { getCurrentWindow } from '@tauri-apps/api/window';
import { DocumentTab } from '../../types/document';
import FormatIcon from '../common/FormatIcon';

const appWindow = getCurrentWindow();

interface TitleBarProps {
  tabs: DocumentTab[];
  activeTabId?: string;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
  onOpenFileClick: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSearchFocus?: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onToggleShortcutsModal?: () => void;
}

export default function TitleBar({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onOpenFileClick,
  searchQuery,
  onSearchChange,
  onSearchFocus,
  darkMode,
  onToggleDarkMode,
}: TitleBarProps) {
  const activeTab = tabs.find(t => t.id === activeTabId);

  return (
    <header 
      className="h-10 shrink-0 select-none bg-surface-container-lowest/95 border-b border-surface-container-high/80 px-2 flex items-center justify-between gap-2 z-50 relative"
      data-tauri-drag-region
      onDoubleClick={(e) => {
        if ((e.target as HTMLElement).closest('button, input')) return;
        appWindow.toggleMaximize();
      }}
    >
      {/* ===== Left: Logo, App Label & Inset Document Tabs ===== */}
      <div className="flex items-center gap-2 min-w-0 flex-1 max-w-[45%]" data-tauri-drag-region>
        <div className="flex items-center gap-1.5 shrink-0 pl-1" data-tauri-drag-region>
          <div className="w-5 h-5 flex items-center justify-center text-primary">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          </div>
          <span className="font-semibold text-xs text-on-surface tracking-wide mr-1 hidden sm:inline" data-tauri-drag-region>
            Docs
          </span>
        </div>

        {/* Tab Strip */}
        <div className="flex items-center gap-1 overflow-x-auto min-w-0" data-tauri-drag-region>
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            return (
              <div
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className={`h-7 px-2.5 rounded-t-md flex items-center gap-1.5 cursor-pointer text-xs transition-colors shrink-0 max-w-[200px] border-b-2 ${
                  isActive
                    ? 'bg-surface-container text-on-surface border-primary shadow-xs'
                    : 'bg-transparent text-on-surface-variant hover:bg-surface-container-low border-transparent'
                }`}
                title={tab.name}
              >
                <FormatIcon format={tab.format} size={14} />
                <span className="truncate max-w-[120px] font-medium">
                  {tab.name}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseTab(tab.id);
                  }}
                  className="w-4 h-4 rounded flex items-center justify-center text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface transition-colors ml-0.5"
                  title="Close Tab"
                >
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            );
          })}

          <button
            onClick={onOpenFileClick}
            className="w-6 h-6 rounded flex items-center justify-center text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors shrink-0"
            title="Open Document (Ctrl+O)"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>
      </div>

      {/* ===== Center: In-Document Search Input ===== */}
      <div className="flex-1 max-w-sm mx-auto px-2" data-tauri-drag-region>
        <div className="h-7 px-2.5 rounded bg-surface-container-low border border-surface-container-high/60 flex items-center gap-1.5 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/40 transition-all">
          <svg className="w-3.5 h-3.5 text-on-surface-variant shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onFocus={onSearchFocus}
            placeholder={activeTab ? "Search in document (Ctrl+F)" : "Search..."}
            className="w-full bg-transparent text-xs text-on-surface placeholder:text-outline focus:outline-none"
          />
          <kbd className="text-[10px] text-on-surface-variant bg-surface-container px-1 py-0.5 rounded font-mono shrink-0 hidden sm:inline">
            Ctrl+F
          </kbd>
        </div>
      </div>

      {/* ===== Right: Theme Toggle & WinUI Caption Controls ===== */}
      <div className="flex items-center gap-1 shrink-0" data-tauri-drag-region>
        <button
          onClick={onToggleDarkMode}
          className="w-7 h-7 rounded flex items-center justify-center text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
          title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {darkMode ? (
            <svg className="w-4 h-4 text-amber-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-slate-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          )}
        </button>

        {/* WinUI Caption Buttons */}
        <div className="flex items-center ml-1">
          <button
            onClick={() => appWindow.minimize()}
            className="w-9 h-7 flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors"
            title="Minimize"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
          <button
            onClick={() => appWindow.toggleMaximize()}
            className="w-9 h-7 flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors"
            title="Maximize"
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
            </svg>
          </button>
          <button
            onClick={() => appWindow.close()}
            className="w-9 h-7 flex items-center justify-center text-on-surface-variant hover:bg-[#C42B1C] hover:text-white transition-colors"
            title="Close"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
