
interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutCategory {
  category: string;
  items: { key: string; action: string }[];
}

export default function ShortcutsModal({ isOpen, onClose }: ShortcutsModalProps) {
  if (!isOpen) return null;

  const shortcutGroups: ShortcutCategory[] = [
    {
      category: 'Tabs & Windows',
      items: [
        { key: 'Ctrl + W', action: 'Close active tab' },
        { key: 'Ctrl + T', action: 'New tab / Open document' },
        { key: 'Ctrl + Tab', action: 'Next tab' },
        { key: 'Ctrl + Shift + Tab', action: 'Previous tab' },
        { key: 'Ctrl + 1 - 8', action: 'Select tab 1 through 8' },
        { key: 'Ctrl + 9', action: 'Select last tab' },
        { key: 'Middle-Click Tab', action: 'Close tab' },
      ],
    },
    {
      category: 'Navigation & Gestures',
      items: [
        { key: 'Space / Shift+Space', action: 'Scroll down / up one screen' },
        { key: 'PageDown / PageUp', action: 'Next / Previous page' },
        { key: 'Ctrl + Home / End', action: 'Jump to first / last page' },
        { key: 'Mouse 4 / 5 (Side)', action: 'Back / Forward page navigation' },
        { key: 'Shift + Scroll', action: 'Horizontal scroll' },
      ],
    },
    {
      category: 'Zoom & Display',
      items: [
        { key: 'Pinch / Ctrl + Scroll', action: 'Smooth pinch-to-zoom' },
        { key: 'Ctrl + = / -', action: 'Zoom in / out (also Numpad)' },
        { key: 'Ctrl + 0', action: 'Reset zoom (100%)' },
        { key: 'Double-Click Canvas', action: 'Toggle Fit Width / 100%' },
        { key: 'Ctrl + Right / Left', action: 'Rotate clockwise / counter-clockwise 90°' },
        { key: 'C', action: 'Toggle continuous scroll mode' },
        { key: 'D', action: 'Toggle two-page spread' },
        { key: 'F11', action: 'Toggle fullscreen' },
      ],
    },
    {
      category: 'Tools & Utilities',
      items: [
        { key: 'Ctrl + F', action: 'Search in document' },
        { key: 'Ctrl + G', action: 'Go to page number' },
        { key: 'Ctrl + B / F9', action: 'Toggle sidebar drawer' },
        { key: 'Ctrl + D', action: 'Bookmark current page' },
        { key: 'Ctrl + P', action: 'Print document' },
        { key: 'Ctrl + R', action: 'Reload document' },
        { key: 'Ctrl + Shift + L', action: 'Toggle Dark / Light theme' },
        { key: 'F5', action: 'Start slideshow (presentations)' },
        { key: 'Esc', action: 'Exit presentation / Close search' },
        { key: '?', action: 'Show shortcuts dialog' },
      ],
    },
  ];

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-xs select-none p-4"
      onClick={onClose}
    >
      <div 
        className="bg-surface-container-high border border-outline-variant text-on-surface rounded-xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
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
            className="w-6 h-6 rounded flex items-center justify-center text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
          >
            ×
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {shortcutGroups.map((group) => (
            <div key={group.category} className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-primary border-b border-outline-variant/30 pb-1">
                {group.category}
              </h3>
              <div className="space-y-2 pt-0.5">
                {group.items.map((sc) => (
                  <div key={sc.key} className="flex items-center justify-between text-xs py-0.5">
                    <span className="text-on-surface-variant">{sc.action}</span>
                    <kbd className="px-2 py-0.5 rounded bg-surface-container text-on-surface font-mono text-[11px] border border-outline-variant/50 shadow-xs shrink-0">
                      {sc.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="px-5 py-3 bg-surface-container/60 border-t border-outline-variant/40 flex justify-end shrink-0">
          <button 
            onClick={onClose}
            className="px-4 py-1.5 rounded-md bg-primary hover:brightness-110 text-on-primary text-xs font-semibold shadow-xs transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
