import React from 'react';
import { DocumentFormat } from '../../types/document';
import FormatIcon from './FormatIcon';

export interface DocumentErrorInfo {
  type: 'password' | 'corrupted' | 'unsupported' | 'generic';
  message: string;
  isIncorrectPassword?: boolean;
}

interface DocumentErrorViewProps {
  fileName: string;
  format: DocumentFormat;
  error: DocumentErrorInfo;
  onRetry: () => void;
  onUnlock?: (password: string) => void;
  onOpenFile: () => void;
  onCloseTab: () => void;
}

export default function DocumentErrorView({
  fileName,
  format,
  error,
  onRetry,
  onUnlock,
  onOpenFile,
  onCloseTab,
}: DocumentErrorViewProps) {
  const [passwordInput, setPasswordInput] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordInput.trim() || !onUnlock) return;
    setIsSubmitting(true);
    onUnlock(passwordInput);
    setTimeout(() => setIsSubmitting(false), 500);
  };

  return (
    <div className="w-full h-full flex items-center justify-center p-6 select-none bg-background">
      <div className="max-w-md w-full bg-surface-container-low dark:bg-surface-container border border-surface-container-high/80 rounded-2xl p-6 shadow-xl flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-200">
        {/* Error / Format Icon Badge */}
        <div className="relative mb-4">
          <div className="w-16 h-16 rounded-2xl bg-surface-container flex items-center justify-center shadow-inner">
            <FormatIcon format={format} size={32} />
          </div>
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-error text-on-error flex items-center justify-center shadow-md">
            {error.type === 'password' ? (
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            )}
          </div>
        </div>

        {/* Title & Description */}
        <h2 className="text-base font-semibold text-on-surface mb-1 truncate max-w-full">
          {error.type === 'password'
            ? 'Password Protected'
            : error.type === 'unsupported'
            ? 'Unsupported Format'
            : 'Unable to Open Document'}
        </h2>

        <p className="text-xs text-on-surface-variant font-mono truncate max-w-full mb-3">
          {fileName}
        </p>

        <p className="text-xs text-on-surface-variant/80 mb-5 leading-relaxed">
          {error.type === 'password'
            ? error.isIncorrectPassword
              ? 'The password entered is incorrect. Please try again.'
              : 'This document is encrypted and requires a password to view.'
            : error.message || 'The file could not be parsed. It may be corrupt or damaged.'}
        </p>

        {/* Password Form (if password protected) */}
        {error.type === 'password' && onUnlock && (
          <form onSubmit={handlePasswordSubmit} className="w-full mb-5 space-y-2">
            <div className="relative">
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Enter password..."
                autoFocus
                className="w-full px-3 py-2 rounded-lg bg-surface-container-lowest border border-surface-container-high text-xs text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/40 font-sans"
              />
            </div>
            <button
              type="submit"
              disabled={!passwordInput.trim() || isSubmitting}
              className="w-full py-2 px-4 rounded-lg bg-primary text-on-primary text-xs font-semibold hover:brightness-110 disabled:opacity-40 transition-all shadow-xs"
            >
              {isSubmitting ? 'Unlocking...' : 'Unlock Document'}
            </button>
          </form>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2 w-full pt-2 border-t border-surface-container-high/60">
          <button
            onClick={onCloseTab}
            className="flex-1 py-1.5 px-3 rounded-lg border border-surface-container-high text-xs text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
          >
            Close Tab
          </button>

          {error.type !== 'password' ? (
            <button
              onClick={onRetry}
              className="flex-1 py-1.5 px-3 rounded-lg bg-surface-container hover:bg-surface-container-high text-xs text-on-surface font-medium transition-colors"
            >
              Try Again
            </button>
          ) : null}

          <button
            onClick={onOpenFile}
            className="flex-1 py-1.5 px-3 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold transition-colors"
          >
            Open Another
          </button>
        </div>
      </div>
    </div>
  );
}
