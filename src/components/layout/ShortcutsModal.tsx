
import { useState, useEffect, useMemo } from 'react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutCategory {
  category: string;
  items: { key: string; action: string }[];
}

export default function ShortcutsModal({ isOpen, onClose }: ShortcutsModalProps) {
  const [filterQuery, setFilterQuery] = useState('');

  useEffect(() => {
    if (isOpen) {
      setFilterQuery('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const shortcutGroups: ShortcutCategory[] = useMemo(() => [
    {
      category: 'Tabs & Windows',
      items: [
        { key: 'Ctrl + W / Ctrl + F4', action: 'Close active tab' },
        { key: 'Ctrl + T / Ctrl + O', action: 'New tab / Open document' },
        { key: 'Ctrl + Tab / PageDown', action: 'Next tab' },
        { key: 'Ctrl + Shift + Tab / PageUp', action: 'Previous tab' },
        { key: 'Ctrl + 1 - 8', action: 'Select tab 1 through 8' },
        { key: 'Ctrl + 9', action: 'Select last tab' },
        { key: 'Middle-Click Tab', action: 'Close tab' },
        { key: 'F11', action: 'Toggle fullscreen window' },
      ],
    },
    {
      category: 'Navigation & Scrolling',
      items: [
        { key: 'Space / Shift + Space', action: 'Scroll down / up one screen' },
        { key: 'PageDown / PageUp', action: 'Next / Previous page or screen' },
        { key: 'Home / End', action: 'First / Last page' },
        { key: 'Ctrl + Home / End', action: 'Jump to top / bottom of document' },
        { key: 'Mouse 4 / 5 (Side)', action: 'Back / Forward page navigation' },
        { key: 'Shift + Scroll', action: 'Horizontal scroll' },
        { key: 'Ctrl + G', action: 'Go to page number' },
      ],
    },
    {
      category: 'Touchpad & Mouse Gestures',
      items: [
        { key: 'Pinch (Trackpad / Touch)', action: 'Smooth precision pinch-to-zoom' },
        { key: 'Ctrl + Scroll', action: 'Smooth mousewheel zoom anchored to cursor' },
        { key: 'Middle-Click + Drag', action: 'Pan document canvas (Hand tool)' },
        { key: 'Double-Click Canvas', action: 'Toggle Fit Width / 100% zoom' },
      ],
    },
    {
      category: 'Zoom & Display',
      items: [
        { key: 'Ctrl + = / -', action: 'Zoom in / out (also Numpad + / -)' },
        { key: 'Ctrl + 0', action: 'Reset zoom to 100% (also Numpad 0)' },
        { key: 'Ctrl + Right / Left', action: 'Rotate clockwise / counter-clockwise 90°' },
        { key: 'C', action: 'Toggle continuous vertical scroll' },
        { key: 'D', action: 'Toggle two-page spread' },
        { key: 'F5', action: 'Start slideshow presentation (PPTX)' },
      ],
    },
    {
      category: 'Tools & Utilities',
      items: [
        { key: 'Ctrl + F', action: 'Find in document' },
        { key: 'F3 / Shift + F3', action: 'Next / Previous search match' },
        { key: 'Ctrl + B / F9', action: 'Toggle sidebar drawer (Pages, Outline, Bookmarks)' },
        { key: 'Ctrl + D', action: 'Bookmark current page' },
        { key: 'Ctrl + P', action: 'Print document' },
        { key: 'Ctrl + R', action: 'Reload document' },
        { key: 'Ctrl + Shift + L', action: 'Toggle Dark / Light theme' },
        { key: 'Ctrl + Shift + D', action: 'Toggle FPS & Benchmark HUD' },
        { key: 'Esc', action: 'Close search / modals / presentation / drawer' },
        { key: '?', action: 'Show keyboard shortcuts reference' },
      ],
    },
  ], []);

  const filteredGroups = useMemo(() => {
    const q = filterQuery.trim().toLowerCase();
    if (!q) return shortcutGroups;

    return shortcutGroups
      .map((group) => {
        const matchesCategory = group.category.toLowerCase().includes(q);
        const matchedItems = group.items.filter(
          (item) =>
            matchesCategory ||
            item.action.toLowerCase().includes(q) ||
            item.key.toLowerCase().includes(q)
        );
        return { ...group, items: matchedItems };
      })
      .filter((group) => group.items.length > 0);
  }, [shortcutGroups, filterQuery]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-xs select-none p-4"
      onClick={onClose}
    >
      <div 
        className="bg-surface-container-high border border-outline-variant text-on-surface rounded-xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-outline-variant/60 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h.01M12 12h.01M16 12h.01M7 16h10" />
            </svg>
            <h2 className="text-sm font-bold text-on-surface">Keyboard Shortcuts & Gestures</h2>
          </div>
          <button 
            onClick={onClose}
            className="w-6 h-6 rounded flex items-center justify-center text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            ×
          </button>
        </div>

        {/* Live Filter Search Input */}
        <div className="px-5 pt-3 pb-1 shrink-0">
          <div className="relative flex items-center">
            <svg className="w-3.5 h-3.5 absolute left-3 text-on-surface-variant/70 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Search shortcuts or gestures (e.g. pinch, tab, zoom)..."
              autoFocus
              className="w-full bg-surface-container text-xs text-on-surface placeholder:text-placeholder pl-8.5 pr-8 py-2 rounded-lg border border-outline-variant/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/40 transition-all"
            />
            {filterQuery && (
              <button
                onClick={() => setFilterQuery('')}
                className="absolute right-2.5 w-4 h-4 rounded-full flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-active text-xs cursor-pointer"
                title="Clear search"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* Shortcuts List */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1 min-h-[220px]">
          {filteredGroups.length === 0 ? (
            <div className="py-8 text-center text-xs text-on-surface-variant">
              <p>No shortcuts or gestures matching &ldquo;<span className="text-on-surface font-medium">{filterQuery}</span>&rdquo;</p>
              <button
                onClick={() => setFilterQuery('')}
                className="mt-2 text-primary hover:underline cursor-pointer"
              >
                Clear search filter
              </button>
            </div>
          ) : (
            filteredGroups.map((group) => (
              <div key={group.category} className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-primary border-b border-outline-variant/30 pb-1">
                  {group.category}
                </h3>
                <div className="space-y-2 pt-0.5">
                  {group.items.map((sc) => (
                    <div key={sc.key} className="flex items-center justify-between text-xs py-0.5 gap-3">
                      <span className="text-on-surface-variant">{sc.action}</span>
                      <kbd className="px-2 py-0.5 rounded bg-surface-container text-on-surface font-mono text-[11px] border border-outline-variant/50 shadow-xs shrink-0">
                        {sc.key}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-surface-container/60 border-t border-outline-variant/40 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-on-surface-variant">
            Press <kbd className="px-1.5 py-0.5 rounded bg-surface-container border border-outline-variant/50 font-mono text-[10px]">Esc</kbd> to close
          </span>
          <button 
            onClick={onClose}
            className="px-4 py-1.5 rounded-md bg-primary hover:brightness-110 text-on-primary text-xs font-semibold shadow-xs transition-all cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
