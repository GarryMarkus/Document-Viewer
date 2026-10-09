import * as XLSX from 'xlsx';
import { DocumentRenderer, DocumentPageSize, SearchResult } from '../types';
import { DocumentOutlineItem, DocumentMetadata } from '../../types/document';

export interface XlsxCellData {
  row: number;
  col: number;
  value: any;
  formula?: string;
  type?: string;
  formatted?: string;
}

export interface XlsxSheetData {
  name: string;
  rowCount: number;
  colCount: number;
  data: Map<string, XlsxCellData>;
  colWidths: number[];
  rowHeights: number[];
}

export class XLSXRenderer implements DocumentRenderer {
  public format = 'xlsx' as const;
  private workbook: XLSX.WorkBook | null = null;
  public sheets: Map<string, XlsxSheetData> = new Map();
  public sheetNames: string[] = [];
  public activeSheetName = '';
  private isDestroyed = false;

  async open(fileData: ArrayBuffer | Uint8Array, fileName: string): Promise<DocumentMetadata> {
    this.destroy();
    this.isDestroyed = false;

    this.workbook = XLSX.read(fileData, {
      type: fileData instanceof Uint8Array ? 'array' : 'buffer',
      cellFormula: true,
      cellStyles: true,
      cellDates: true,
    });

    if (this.isDestroyed) {
      throw new Error('XLSXRenderer destroyed during load');
    }

    this.sheetNames = this.workbook.SheetNames;
    this.activeSheetName = this.sheetNames[0] || 'Sheet1';

    // Parse sheets
    for (const name of this.sheetNames) {
      const worksheet = this.workbook.Sheets[name];
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
      const rowCount = range.e.r + 1;
      const colCount = range.e.c + 1;

      const cellMap = new Map<string, XlsxCellData>();
      for (let r = 0; r <= range.e.r; r++) {
        for (let c = 0; c <= range.e.c; c++) {
          const addr = XLSX.utils.encode_cell({ r, c });
          const cell = worksheet[addr];
          if (cell) {
            cellMap.set(`${r},${c}`, {
              row: r,
              col: c,
              value: cell.v,
              formula: cell.f,
              type: cell.t,
              formatted: cell.w || String(cell.v ?? ''),
            });
          }
        }
      }

      // Default column widths and row heights
      const colWidths = new Array(colCount).fill(110);
      const rowHeights = new Array(rowCount).fill(26);

      this.sheets.set(name, {
        name,
        rowCount: Math.max(rowCount, 100),
        colCount: Math.max(colCount, 26),
        data: cellMap,
        colWidths,
        rowHeights,
      });
    }

    const metadata: DocumentMetadata = {
      title: fileName.replace(/\.xlsx?$/i, ''),
      format: 'xlsx',
      pageCount: this.sheetNames.length,
    };

    return metadata;
  }

  getActiveSheet(): XlsxSheetData | undefined {
    return this.sheets.get(this.activeSheetName) || this.sheets.get(this.sheetNames[0]);
  }

  setActiveSheet(name: string): void {
    if (this.sheets.has(name)) {
      this.activeSheetName = name;
    }
  }

  getPageCount(): number {
    return this.sheetNames.length;
  }

  getPageSize(): DocumentPageSize {
    return { width: 1200, height: 800 };
  }

  async renderPage(): Promise<void> {
    // XLSX uses the specialized virtual XlsxGridView component
  }

  cancelRender(): void {}

  async search(query: string): Promise<SearchResult[]> {
    if (!query.trim() || !this.workbook) return [];
    const results: SearchResult[] = [];
    const lowerQuery = query.toLowerCase();

    this.sheetNames.forEach((sheetName, sheetIdx) => {
      const sheet = this.sheets.get(sheetName);
      if (!sheet) return;

      sheet.data.forEach((cell) => {
        const str = String(cell.value ?? '').toLowerCase();
        if (str.includes(lowerQuery)) {
          const colLetter = XLSX.utils.encode_col(cell.col);
          results.push({
            pageIndex: sheetIdx,
            matchIndex: cell.row,
            text: `${sheetName}!${colLetter}${cell.row + 1}: ${cell.value}`,
            row: cell.row,
            col: cell.col,
          });
        }
      });
    });

    return results;
  }

  async getOutline(): Promise<DocumentOutlineItem[]> {
    return this.sheetNames.map((name, idx) => ({
      title: name,
      pageNum: idx + 1,
    }));
  }

  destroy(): void {
    this.isDestroyed = true;
    this.workbook = null;
    this.sheets.clear();
    this.sheetNames = [];
  }
}
