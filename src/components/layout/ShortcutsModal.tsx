
interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ShortcutsModal({ isOpen, onClose }: ShortcutsModalProps) {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'Ctrl + O', action: 'Open file' },
    { key: 'Ctrl + P', action: 'Print document' },
    { key: 'Ctrl + F', action: 'Search in document' },
    { key: 'Ctrl + G', action: 'Go to page number' },
    { key: 'Ctrl + = / -', action: 'Zoom in / out' },
    { key: 'Ctrl + 0', action: 'Reset zoom (100%)' },
    { key: 'Ctrl + Scroll', action: 'Smooth zoom' },
    { key: 'Ctrl + Right', action: 'Rotate clockwise 90°' },
    { key: 'Ctrl + Left', action: 'Rotate counter-clockwise 90°' },
    { key: 'F11', action: 'Toggle fullscreen' },
    { key: 'F9', action: 'Toggle sidebar drawer' },
    { key: 'C', action: 'Toggle continuous scroll mode' },
    { key: 'D', action: 'Toggle two-page spread' },
    { key: 'Home / End', action: 'First / Last page' },
    { key: 'PageUp / PageDown', action: 'Previous / Next page' },
    { key: 'F5', action: 'Start slideshow (presentations)' },
    { key: 'Esc', action: 'Exit presentation / Close search' },
    { key: '?', action: 'Show shortcuts dialog' },
  ];

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-xs select-none p-4"
      onClick={onClose}
    >
      <div 
        className="bg-surface-container-low border border-surface-container-high text-on-surface rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3.5 border-b border-surface-container-high/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h.01M12 12h.01M16 12h.01M7 16h10" />
            </svg>
            <h2 className="text-sm font-bold text-on-surface">Keyboard Shortcuts</h2>
          </div>
          <button 
            onClick={onClose}
            className="w-6 h-6 rounded flex items-center justify-center text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
          >
            ×
          </button>
        </div>

        <div className="p-5 max-h-[60vh] overflow-y-auto space-y-2.5">
          {shortcuts.map((sc) => (
            <div key={sc.key} className="flex items-center justify-between text-xs">
              <span className="text-on-surface-variant">{sc.action}</span>
              <kbd className="px-2 py-1 rounded bg-surface-container text-on-surface font-mono text-[11px] border border-surface-container-high/60 shadow-xs">
                {sc.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="px-5 py-3 bg-surface-container-lowest/60 border-t border-surface-container-high/40 flex justify-end">
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
