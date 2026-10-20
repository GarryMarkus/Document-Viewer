import { DocumentFormat } from '../../types/document';
import FormatIcon from './FormatIcon';

interface DocumentLoadingViewProps {
  fileName: string;
  format: DocumentFormat;
  statusText?: string;
  percent?: number;
  onCancel?: () => void;
}

export default function DocumentLoadingView({
  fileName,
  format,
  statusText = 'Loading document...',
  percent = 0,
  onCancel,
}: DocumentLoadingViewProps) {
  const displayPercent = Math.min(100, Math.max(0, percent));

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-background/80 backdrop-blur-sm select-none">
      <div className="w-full max-w-sm bg-surface-container border border-outline-variant rounded-2xl p-6 shadow-2xl flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-200">
        {/* Format Badge with Animated Spinner Ring */}
        <div className="relative mb-5">
          <div className="w-16 h-16 rounded-2xl bg-surface-container flex items-center justify-center shadow-inner">
            <FormatIcon format={format} size={32} />
          </div>
          {/* Circular Spinner Ring */}
          <div className="absolute -inset-1 rounded-[18px] border-2 border-primary/20 border-t-primary animate-spin motion-reduce:animate-none pointer-events-none" />
        </div>

        {/* File Name */}
        <h3 className="text-sm font-semibold text-on-surface truncate max-w-full mb-1">
          {fileName}
        </h3>

        {/* Status Line with Percentage */}
        <p className="text-xs text-on-surface-variant font-medium mb-4 flex items-center gap-1.5">
          <span>{statusText}</span>
          <span className="font-mono text-primary font-semibold">
            {displayPercent}%
          </span>
        </p>

        {/* Stitch WinUI Progress Track */}
        <div className="w-full bg-surface-container-highest rounded-full h-1.5 overflow-hidden mb-5">
          <div
            className="bg-primary h-full rounded-full transition-all duration-300 ease-out motion-reduce:transition-none"
            style={{ width: `${displayPercent}%` }}
          />
        </div>

        {/* Optional Cancel Action */}
        {onCancel && (
          <button
            onClick={onCancel}
            className="text-xs text-on-surface-variant hover:text-on-surface hover:bg-surface-container px-3 py-1.5 rounded-lg transition-colors font-medium border border-surface-container-high/60"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
