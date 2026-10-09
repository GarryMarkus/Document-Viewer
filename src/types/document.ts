export type DocumentFormat = 'pdf' | 'docx' | 'xlsx' | 'pptx' | 'unknown';

export interface RecentFileItem {
  path: string;
  name: string;
  format: DocumentFormat;
  size?: number;
  lastOpened: number;
  lastPage?: number;
  lastScrollTop?: number;
}

export interface DocumentTab {
  id: string;
  name: string;
  path?: string;
  format: DocumentFormat;
  fileBytes?: Uint8Array;
  url?: string;
}

export interface DocumentOutlineItem {
  title: string;
  pageNum?: number;
  level?: number;
  items?: DocumentOutlineItem[];
}

export interface DocumentMetadata {
  title?: string;
  author?: string;
  creator?: string;
  producer?: string;
  pageCount?: number;
  wordCount?: number;
  fileSize?: string;
  format?: DocumentFormat;
  created?: string;
  modified?: string;
}
