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
      className="h-10 shrink-0 select-none bg-[var(--titlebar-bg)] border-b border-[var(--titlebar-border)] px-2.5 flex items-center justify-between gap-2 z-50 relative transition-colors duration-150"
      data-tauri-drag-region
      onDoubleClick={(e) => {
        if ((e.target as HTMLElement).closest('button, input')) return;
        appWindow.toggleMaximize();
      }}
    >
      {/* ===== Left: Logo, App Label & Inset Document Tabs ===== */}
      <div className="flex items-center gap-2 min-w-0 flex-1 max-w-[55%] lg:max-w-[62%]" data-tauri-drag-region>
        <div className="flex items-center gap-1.5 shrink-0 pl-0.5 pr-1" data-tauri-drag-region>
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

        {/* Tab Strip with horizontal wheel scroll & hidden scrollbars */}
        <div 
          className="flex items-center gap-1 overflow-x-auto min-w-0 py-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]" 
          data-tauri-drag-region
          onWheel={(e) => {
            if (e.deltaY !== 0) {
              e.currentTarget.scrollLeft += e.deltaY;
            }
          }}
        >
          {tabs.map((tab, idx) => {
            const isActive = tab.id === activeTabId;
            const isLoading = tab.status === 'loading';
            const percent = tab.progress?.percent ?? 0;
            const tooltip = isLoading && tab.progress
              ? `${tab.name} (${percent}% - ${tab.progress.status})`
              : tab.name;

            const prevIsActive = idx > 0 && tabs[idx - 1].id === activeTabId;
            const showDivider = idx > 0 && !isActive && !prevIsActive;

            return (
              <div key={tab.id} className="relative flex items-center shrink-0 group">
                {/* Subtle vertical divider between adjacent inactive tabs */}
                {showDivider && (
                  <div className="absolute -left-[2px] h-3.5 w-[1px] bg-[var(--tab-divider)] pointer-events-none transition-opacity duration-150 group-hover:opacity-0" />
                )}

                <div
                  role="tab"
                  aria-selected={isActive}
                  tabIndex={0}
                  onClick={() => onSelectTab(tab.id)}
                  onAuxClick={(e) => {
                    if (e.button === 1) {
                      e.preventDefault();
                      e.stopPropagation();
                      onCloseTab(tab.id);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectTab(tab.id);
                    }
                  }}
                  className={`h-7 px-2.5 rounded-md flex items-center gap-1.5 cursor-pointer text-xs transition-all duration-150 shrink-0 max-w-[210px] select-none relative outline-none focus-visible:ring-1 focus-visible:ring-primary/50 ${
                    isActive
                      ? 'bg-[var(--tab-active-bg)] text-[var(--tab-active-text)] font-medium shadow-[var(--tab-active-shadow)] border border-[var(--tab-active-border)]'
                      : 'bg-[var(--tab-inactive-bg)] text-[var(--tab-inactive-text)] hover:bg-[var(--tab-hover-bg)] hover:text-[var(--tab-hover-text)] border border-transparent'
                  }`}
                  title={tooltip}
                >
                  {isLoading ? (
                    <div className="w-3.5 h-3.5 border-[1.5px] border-primary border-t-transparent rounded-full animate-spin motion-reduce:animate-none shrink-0" />
                  ) : (
                    <FormatIcon format={tab.format} size={14} className="shrink-0 transition-transform duration-150 group-hover:scale-105" />
                  )}
                  <span className="truncate max-w-[130px] sm:max-w-[160px] tracking-tight">
                    {tab.name}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onCloseTab(tab.id);
                    }}
                    className={`w-[18px] h-[18px] rounded flex items-center justify-center transition-all ml-0.5 shrink-0 ${
                      isActive
                        ? 'text-[var(--tab-active-text)]/70 hover:text-[var(--tab-active-text)] hover:bg-[var(--tab-close-hover)]'
                        : 'text-[var(--tab-inactive-text)]/60 hover:text-[var(--tab-hover-text)] hover:bg-[var(--tab-close-hover)] opacity-70 group-hover:opacity-100'
                    }`}
                    title="Close Tab (Ctrl+W)"
                    aria-label={`Close ${tab.name}`}
                  >
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>

                  {/* Progress bar along the tab bottom edge for active and background tabs */}
                  {isLoading && (
                    <div className="absolute bottom-0 left-1 right-1 h-[2px] bg-primary/20 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-300 ease-out motion-reduce:transition-none"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          <button
            onClick={onOpenFileClick}
            className="h-7 w-7 rounded-md flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-black/[0.06] dark:hover:bg-white/[0.08] active:scale-95 transition-all shrink-0 ml-0.5"
            title="Open Document (Ctrl+O)"
            aria-label="Open Document"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>
      </div>

      {/* ===== Center: In-Document Search Input ===== */}
      <div className="flex-1 max-w-xs sm:max-w-sm mx-auto px-2" data-tauri-drag-region>
        <div className="h-7 px-2.5 rounded-md bg-white/80 dark:bg-[#282C34] border border-outline-variant/60 dark:border-white/10 flex items-center gap-1.5 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/40 focus-within:bg-white dark:focus-within:bg-[#282C34] transition-all shadow-2xs">
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
            className="w-full bg-transparent text-xs text-on-surface placeholder:text-placeholder focus:outline-none"
          />
          <kbd className="text-[10px] text-on-surface-variant/80 bg-black/[0.04] dark:bg-white/[0.08] px-1 py-0.5 rounded font-mono shrink-0 hidden sm:inline">
            Ctrl+F
          </kbd>
        </div>
      </div>

      {/* ===== Right: Theme Toggle & WinUI Caption Controls ===== */}
      <div className="flex items-center gap-1 shrink-0" data-tauri-drag-region>
        <button
          onClick={onToggleDarkMode}
          className="w-7 h-7 rounded-md flex items-center justify-center text-on-surface-variant hover:bg-black/[0.06] dark:hover:bg-white/[0.08] hover:text-on-surface transition-colors"
          title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          aria-label={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {darkMode ? (
            <svg className="w-4 h-4 text-warning" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
            className="w-9 h-7 rounded-sm flex items-center justify-center text-on-surface-variant hover:bg-black/[0.06] dark:hover:bg-white/[0.08] hover:text-on-surface transition-colors"
            title="Minimize"
            aria-label="Minimize"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
          <button
            onClick={() => appWindow.toggleMaximize()}
            className="w-9 h-7 rounded-sm flex items-center justify-center text-on-surface-variant hover:bg-black/[0.06] dark:hover:bg-white/[0.08] hover:text-on-surface transition-colors"
            title="Maximize"
            aria-label="Maximize"
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
            </svg>
          </button>
          <button
            onClick={() => appWindow.close()}
            className="w-9 h-7 rounded-sm flex items-center justify-center text-on-surface-variant hover:bg-error hover:text-on-primary transition-colors"
            title="Close"
            aria-label="Close"
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
