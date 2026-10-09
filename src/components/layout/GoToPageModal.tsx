import React, { useState, useEffect, useRef } from 'react';

interface GoToPageModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPage: number;
  numPages: number;
  onGoToPage: (page: number) => void;
}

export default function GoToPageModal({
  isOpen,
  onClose,
  currentPage,
  numPages,
  onGoToPage,
}: GoToPageModalProps) {
  const [pageInput, setPageInput] = useState(String(currentPage));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPageInput(String(currentPage));
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [isOpen, currentPage]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseInt(pageInput, 10);
    if (!isNaN(p) && p >= 1 && p <= numPages) {
      onGoToPage(p);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs select-none">
      <div className="w-80 bg-surface-container-lowest dark:bg-surface-container rounded-xl p-4 shadow-2xl border border-surface-container-high animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm text-on-surface">Go to Page</h3>
          <span className="text-xs text-on-surface-variant font-mono">1 – {numPages}</span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-on-surface-variant mb-1.5">
              Enter page number:
            </label>
            <input
              ref={inputRef}
              type="number"
              min={1}
              max={numPages}
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value)}
              className="w-full px-3 py-1.5 rounded-md bg-surface-container-low border border-surface-container-high text-on-surface text-sm font-mono focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-md text-xs text-on-surface-variant hover:bg-surface-container-high transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-md text-xs font-medium bg-primary text-on-primary hover:bg-primary/90 transition-colors shadow-xs"
            >
              Go
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
