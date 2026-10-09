import { DocumentFormat, DocumentOutlineItem, DocumentMetadata } from '../types/document';

export interface DocumentPageSize {
  width: number;
  height: number;
}

export interface PageRenderOptions {
  scale: number;
  rotation: number;
  dpr?: number;
  isPreview?: boolean;
}

export interface SearchResult {
  pageIndex: number;
  matchIndex: number;
  text: string;
  row?: number;
  col?: number;
}

export interface DocumentRenderer {
  open(fileData: ArrayBuffer | Uint8Array, fileName: string, password?: string): Promise<DocumentMetadata>;
  getPageCount(): number;
  getPageSize(pageIndex: number): DocumentPageSize;
  renderPage(
    pageIndex: number,
    canvas: HTMLCanvasElement,
    options: PageRenderOptions,
    wrapper?: HTMLDivElement
  ): Promise<void>;
  cancelRender?(pageIndex: number): void;
  search(query: string): Promise<SearchResult[]>;
  getOutline(): Promise<DocumentOutlineItem[]>;
  destroy(): void;
  format: DocumentFormat;
}
