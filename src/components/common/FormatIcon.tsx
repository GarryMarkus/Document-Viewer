import { DocumentFormat } from '../../types/document';

interface FormatIconProps {
  format: DocumentFormat;
  className?: string;
  size?: number;
}

export default function FormatIcon({ format, className = '', size = 16 }: FormatIconProps) {
  const iconSize = `${size}px`;

  switch (format) {
    case 'pdf':
      return (
        <span 
          style={{ width: iconSize, height: iconSize }} 
          className={`inline-flex items-center justify-center text-[#E02424] shrink-0 ${className}`}
          title="PDF Document"
        >
          <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="9" y1="13" x2="15" y2="13" />
            <line x1="9" y1="17" x2="13" y2="17" />
          </svg>
        </span>
      );

    case 'docx':
      return (
        <span 
          style={{ width: iconSize, height: iconSize }} 
          className={`inline-flex items-center justify-center text-[#185ABD] shrink-0 ${className}`}
          title="Word Document"
        >
          <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6H6a2 2 0 0 0-2 2z" />
            <path d="M14 2v6h6" />
            <line x1="8" y1="13" x2="16" y2="13" />
            <line x1="8" y1="17" x2="16" y2="17" />
            <line x1="8" y1="9" x2="10" y2="9" />
          </svg>
        </span>
      );

    case 'xlsx':
      return (
        <span 
          style={{ width: iconSize, height: iconSize }} 
          className={`inline-flex items-center justify-center text-[#107C41] shrink-0 ${className}`}
          title="Excel Spreadsheet"
        >
          <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M3 9h18" />
            <path d="M3 15h18" />
            <path d="M9 3v18" />
            <path d="M15 3v18" />
          </svg>
        </span>
      );

    case 'pptx':
      return (
        <span 
          style={{ width: iconSize, height: iconSize }} 
          className={`inline-flex items-center justify-center text-[#D83B01] shrink-0 ${className}`}
          title="PowerPoint Presentation"
        >
          <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="3" width="20" height="14" rx="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
          </svg>
        </span>
      );

    default:
      return (
        <span 
          style={{ width: iconSize, height: iconSize }} 
          className={`inline-flex items-center justify-center text-on-surface-variant shrink-0 ${className}`}
          title="Document"
        >
          <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
        </span>
      );
  }
}
