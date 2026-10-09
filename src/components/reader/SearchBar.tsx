import React, { useEffect, useRef } from 'react';

interface SearchBarProps {
  isOpen: boolean;
  onClose: () => void;
  query: string;
  onQueryChange: (query: string) => void;
  matchIndex: number;
  totalMatches: number;
  onNext: () => void;
  onPrev: () => void;
  matchCase: boolean;
  onToggleMatchCase: () => void;
  isSearching: boolean;
}

export default function SearchBar({
  isOpen,
  onClose,
  query,
  onQueryChange,
  matchIndex,
  totalMatches,
  onNext,
  onPrev,
  matchCase,
  onToggleMatchCase,
  isSearching,
}: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) {
        onPrev();
      } else {
        onNext();
      }
    }
  };

  return (
    <div className="absolute top-3 right-5 z-40 flex items-center gap-1.5 p-1.5 rounded-lg bg-surface-container-lowest/95 dark:bg-surface-container-low/95 backdrop-blur-md border border-surface-container-high/80 shadow-[0_8px_24px_rgba(0,0,0,0.18)] text-on-surface select-none transition-all animate-in fade-in slide-in-from-top-2 duration-150">
      {/* Search Input Box */}
      <div className="flex items-center gap-1.5 px-2 py-1 bg-surface-container-low dark:bg-surface-container rounded-md border border-surface-container-high/60 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/40">
        <svg className="w-3.5 h-3.5 text-on-surface-variant shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Find in document..."
          className="w-44 sm:w-56 bg-transparent text-xs text-on-surface placeholder:text-outline focus:outline-none"
        />

        {query && (
          <button
            onClick={() => onQueryChange('')}
            className="w-4 h-4 rounded-full hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant hover:text-on-surface"
            title="Clear"
          >
            <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      {/* Match Count Badge */}
      <div className="text-[11px] font-mono px-2 py-0.5 text-on-surface-variant whitespace-nowrap min-w-[50px] text-center">
        {isSearching ? (
          <span className="opacity-70 animate-pulse">Searching...</span>
        ) : query.trim() ? (
          totalMatches > 0 ? (
            `${matchIndex + 1} of ${totalMatches}`
          ) : (
            <span className="text-error">0 matches</span>
          )
        ) : null}
      </div>

      <div className="h-4 w-[1px] bg-surface-container-high mx-0.5" />

      {/* Match Case Toggle */}
      <button
        onClick={onToggleMatchCase}
        className={`w-6 h-6 rounded flex items-center justify-center text-xs font-semibold font-mono transition-colors ${
          matchCase
            ? 'bg-primary text-on-primary'
            : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
        }`}
        title="Match Case (Alt+C)"
      >
        Aa
      </button>

      {/* Previous Match Button */}
      <button
        onClick={onPrev}
        disabled={totalMatches === 0}
        className="w-6 h-6 rounded flex items-center justify-center text-on-surface-variant hover:bg-surface-container hover:text-on-surface disabled:opacity-30 disabled:pointer-events-none transition-colors"
        title="Previous Match (Shift+Enter / Shift+F3)"
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="18 15 12 9 6 15" />
        </svg>
      </button>

      {/* Next Match Button */}
      <button
        onClick={onNext}
        disabled={totalMatches === 0}
        className="w-6 h-6 rounded flex items-center justify-center text-on-surface-variant hover:bg-surface-container hover:text-on-surface disabled:opacity-30 disabled:pointer-events-none transition-colors"
        title="Next Match (Enter / F3)"
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      <div className="h-4 w-[1px] bg-surface-container-high mx-0.5" />

      {/* Close Search HUD */}
      <button
        onClick={onClose}
        className="w-6 h-6 rounded flex items-center justify-center text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
        title="Close (Esc)"
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}
