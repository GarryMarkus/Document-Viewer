import { RecentFileItem } from '../../types/document';
import FormatIcon from '../common/FormatIcon';
import { formatBytes } from '../../utils/recentFiles';

interface RecentFilesViewProps {
  recentFiles: RecentFileItem[];
  onOpenFile: () => void;
  onSelectRecent: (file: RecentFileItem) => void;
  onRemoveRecent: (identifier: string) => void;
  onClearRecents: () => void;
}

export default function RecentFilesView({
  recentFiles,
  onOpenFile,
  onSelectRecent,
  onRemoveRecent,
  onClearRecents,
}: RecentFilesViewProps) {
  const formatTimeAgo = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'Yesterday';
    return `${days}d ago`;
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-start p-6 overflow-y-auto select-none bg-background">
      <div className="max-w-2xl w-full flex flex-col gap-6 items-center my-auto py-4">
        {/* Header & Logo */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-primary-container text-on-primary-container mx-auto flex items-center justify-center shadow-lg shadow-primary/20">
            <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-on-surface tracking-tight">
            Document Viewer
          </h1>
          <p className="text-xs text-on-surface-variant max-w-md mx-auto">
            Fast, high-fidelity reader for PDF, Word documents, Excel spreadsheets, and PowerPoint presentations.
          </p>
        </div>

        {/* Drop Zone Box */}
        <div
          onClick={onOpenFile}
          className="w-full p-8 rounded-xl border-2 border-dashed border-surface-container-highest hover:border-primary bg-surface-container-lowest/70 hover:bg-surface-container-low transition-all cursor-pointer flex flex-col items-center justify-center gap-3 text-center group shadow-xs"
        >
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 rounded-md bg-[#E02424]/10 text-[#E02424] text-xs font-semibold">PDF</span>
            <span className="px-2.5 py-1 rounded-md bg-[#185ABD]/10 text-[#185ABD] text-xs font-semibold">DOCX</span>
            <span className="px-2.5 py-1 rounded-md bg-[#107C41]/10 text-[#107C41] text-xs font-semibold">XLSX</span>
            <span className="px-2.5 py-1 rounded-md bg-[#D83B01]/10 text-[#D83B01] text-xs font-semibold">PPTX</span>
          </div>

          <div className="space-y-1">
            <p className="text-sm font-semibold text-on-surface group-hover:text-primary transition-colors">
              Click to browse or drop files here
            </p>
            <p className="text-xs text-on-surface-variant">
              Drag any document onto the window to open it immediately
            </p>
          </div>

          <button
            type="button"
            className="mt-2 px-4 py-2 rounded-md bg-primary hover:brightness-110 text-on-primary text-xs font-semibold shadow-sm transition-all flex items-center gap-2"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
            Choose Document (Ctrl+O)
          </button>
        </div>

        {/* Recent Files List */}
        {recentFiles.length > 0 && (
          <div className="w-full space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-semibold text-on-surface uppercase tracking-wider">
                Recent Documents
              </span>
              <button
                onClick={onClearRecents}
                className="text-[11px] text-on-surface-variant hover:text-error transition-colors"
              >
                Clear Recents
              </button>
            </div>

            <div className="bg-surface-container-lowest rounded-xl border border-surface-container-high/60 overflow-hidden divide-y divide-surface-container-high/40 shadow-xs">
              {recentFiles.slice(0, 8).map((file) => (
                <div
                  key={file.path || file.name}
                  onClick={() => onSelectRecent(file)}
                  className="p-3 hover:bg-surface-container transition-colors cursor-pointer flex items-center justify-between gap-3 group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center shrink-0">
                      <FormatIcon format={file.format} size={18} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-on-surface group-hover:text-primary transition-colors truncate">
                        {file.name}
                      </div>
                      <div className="text-[11px] text-outline truncate flex items-center gap-2">
                        {file.size ? <span>{formatBytes(file.size)}</span> : null}
                        {file.lastPage && file.lastPage > 1 ? (
                          <>
                            <span>•</span>
                            <span>Last read: Page {file.lastPage}</span>
                          </>
                        ) : null}
                        <span>•</span>
                        <span>{formatTimeAgo(file.lastOpened)}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveRecent(file.path || file.name);
                    }}
                    className="w-6 h-6 rounded flex items-center justify-center text-outline hover:text-error hover:bg-surface-container-highest transition-colors opacity-0 group-hover:opacity-100"
                    title="Remove from recents"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Shortcuts Hint */}
        <div className="text-center text-[11px] text-on-surface-variant/70 flex items-center gap-4 flex-wrap justify-center pt-2">
          <span><kbd className="px-1.5 py-0.5 rounded bg-surface-container text-on-surface font-mono">Ctrl+O</kbd> Open</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-surface-container text-on-surface font-mono">Ctrl+F</kbd> Search</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-surface-container text-on-surface font-mono">F11</kbd> Fullscreen</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-surface-container text-on-surface font-mono">F9</kbd> Sidebar</span>
        </div>
      </div>
    </div>
  );
}
