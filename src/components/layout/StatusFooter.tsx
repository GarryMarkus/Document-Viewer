import { DocumentFormat } from '../../types/document';

interface StatusFooterProps {
  format: DocumentFormat;
  currentPage: number;
  numPages: number;
  scale: number;
  onScaleChange: (newScale: number) => void;
  fileSize?: string;
  isContinuous: boolean;
  onToggleContinuous: () => void;
  isDual: boolean;
  onToggleFpsOverlay?: () => void;
  showFpsOverlay?: boolean;
}

export default function StatusFooter({
  format,
  currentPage,
  numPages,
  scale,
  onScaleChange,
  fileSize,
  isContinuous,
  onToggleContinuous,
  isDual,
  onToggleFpsOverlay,
  showFpsOverlay,
}: StatusFooterProps) {
  const zoomPercent = Math.round(scale * 100);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    onScaleChange(val / 100);
  };

  return (
    <footer className="h-7 shrink-0 bg-surface-container-lowest/95 border-t border-surface-container-high/60 px-3 flex items-center justify-between text-[11px] text-on-surface-variant select-none z-50">
      {/* Left Metadata Status */}
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1.5 font-medium text-on-surface">
          <span className="w-2 h-2 rounded-full bg-primary" />
          Ready
        </span>

        {numPages > 0 && (
          <>
            <span className="text-outline/40">|</span>
            <span>
              {format === 'pptx' ? `Slide ${currentPage} of ${numPages}` : `Page ${currentPage} of ${numPages}`}
            </span>
          </>
        )}

        {fileSize && (
          <>
            <span className="text-outline/40">|</span>
            <span>{fileSize}</span>
          </>
        )}

        <span className="text-outline/40 hidden sm:inline">|</span>
        <span className="hidden sm:inline-flex items-center gap-1 text-on-surface-variant">
          <svg className="w-3 h-3 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          Read Only
        </span>

        {onToggleFpsOverlay && (
          <>
            <span className="text-outline/40">|</span>
            <button
              onClick={onToggleFpsOverlay}
              className={`px-1.5 py-0.5 rounded font-mono text-[10px] transition-colors ${
                showFpsOverlay
                  ? 'bg-emerald-500/20 text-emerald-400 font-bold'
                  : 'hover:bg-surface-container text-on-surface-variant'
              }`}
              title="Toggle Performance HUD (Ctrl+Shift+D)"
            >
              FPS HUD
            </button>
          </>
        )}
      </div>

      {/* Right Controls: Zoom Slider & Reading Mode */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onScaleChange(Math.max(0.2, scale - 0.1))}
            className="w-4 h-4 flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors"
            title="Zoom Out"
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>

          <input
            type="range"
            min="20"
            max="400"
            step="10"
            value={zoomPercent}
            onChange={handleSliderChange}
            className="h-1 w-20 bg-surface-container-high rounded accent-primary cursor-pointer"
          />

          <button
            onClick={() => onScaleChange(Math.min(5.0, scale + 0.1))}
            className="w-4 h-4 flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors"
            title="Zoom In"
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>

          <span className="min-w-[34px] text-right font-medium text-on-surface font-mono">
            {zoomPercent}%
          </span>
        </div>

        {format !== 'xlsx' && (
          <>
            <div className="h-3 w-[1px] bg-outline-variant/60" />
            <button
              onClick={onToggleContinuous}
              className="text-on-surface-variant hover:text-on-surface transition-colors flex items-center gap-1 font-medium"
              title="Click to toggle continuous scrolling (C)"
            >
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="6" y="3" width="12" height="7" rx="1" />
                <rect x="6" y="14" width="12" height="7" rx="1" />
              </svg>
              <span>{isDual ? 'Dual Spread' : isContinuous ? 'Continuous' : 'Single Page'}</span>
            </button>
          </>
        )}
      </div>
    </footer>
  );
}
