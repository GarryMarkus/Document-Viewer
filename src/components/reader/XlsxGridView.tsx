import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { XLSXRenderer, XlsxSheetData } from '../../engine/renderers/XLSXRenderer';

interface XlsxGridViewProps {
  renderer: XLSXRenderer;
  darkMode: boolean;
  scale: number;
  searchQuery?: string;
  activeMatchCell?: { sheetIndex: number; r: number; c: number };
}

export default function XlsxGridView({
  renderer,
  darkMode,
  scale,
  searchQuery = '',
  activeMatchCell,
}: XlsxGridViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [activeSheetName, setActiveSheetName] = useState(renderer.activeSheetName);
  const [selectedCell, setSelectedCell] = useState<{ r: number; c: number }>({ r: 0, c: 0 });
  const [selectedCellText, setSelectedCellText] = useState('');

  // Column width overrides
  const [colWidths, setColWidths] = useState<number[]>([]);

  const sheet: XlsxSheetData | undefined = useMemo(() => {
    return renderer.sheets.get(activeSheetName) || renderer.getActiveSheet();
  }, [renderer, activeSheetName]);

  // Initialize column widths
  useEffect(() => {
    if (sheet) {
      setColWidths([...sheet.colWidths]);
    }
  }, [sheet]);

  // Update formula bar text on selection change
  useEffect(() => {
    if (!sheet) return;
    const cell = sheet.data.get(`${selectedCell.r},${selectedCell.c}`);
    if (cell) {
      setSelectedCellText(cell.formula ? `=${cell.formula}` : String(cell.value ?? ''));
    } else {
      setSelectedCellText('');
    }
  }, [sheet, selectedCell]);

  const rowHeight = Math.round(28 * scale);
  const headerHeight = Math.round(30 * scale);
  const rowHeaderWidth = Math.round(50 * scale);

  // Compute column x-offsets
  const colOffsets = useMemo(() => {
    const offsets: number[] = [rowHeaderWidth];
    let cur = rowHeaderWidth;
    for (let i = 0; i < (colWidths.length || 26); i++) {
      const w = Math.round((colWidths[i] || 110) * scale);
      cur += w;
      offsets.push(cur);
    }
    return offsets;
  }, [colWidths, scale, rowHeaderWidth]);

  // Auto-scroll to active match cell
  useEffect(() => {
    if (!activeMatchCell || !containerRef.current) return;
    const targetSheet = renderer.sheetNames[activeMatchCell.sheetIndex];
    if (targetSheet && targetSheet !== activeSheetName) {
      setActiveSheetName(targetSheet);
    }
    setSelectedCell({ r: activeMatchCell.r, c: activeMatchCell.c });

    const targetY = activeMatchCell.r * rowHeight;
    const targetX = colOffsets[activeMatchCell.c] || 0;
    containerRef.current.scrollTo({
      top: Math.max(0, targetY - 120),
      left: Math.max(0, targetX - 120),
      behavior: 'smooth',
    });
  }, [activeMatchCell, renderer, activeSheetName, rowHeight, colOffsets]);

  const totalWidth = colOffsets[colOffsets.length - 1] || 2000;
  const totalHeight = (sheet?.rowCount || 100) * rowHeight + headerHeight;

  // Main high-performance grid render loop
  const renderGrid = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !sheet) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const viewW = container.clientWidth;
    const viewH = container.clientHeight;

    canvas.width = viewW * dpr;
    canvas.height = viewH * dpr;
    canvas.style.width = `${viewW}px`;
    canvas.style.height = `${viewH}px`;
    ctx.scale(dpr, dpr);

    const scrollLeft = container.scrollLeft;
    const scrollTop = container.scrollTop;

    // Background color
    ctx.fillStyle = darkMode ? '#131313' : '#FFFFFF';
    ctx.fillRect(0, 0, viewW, viewH);

    // Visible column range
    let startCol = 0;
    let endCol = colOffsets.length - 2;
    for (let c = 0; c < colOffsets.length - 1; c++) {
      if (colOffsets[c + 1] - scrollLeft > rowHeaderWidth) {
        startCol = c;
        break;
      }
    }
    for (let c = startCol; c < colOffsets.length - 1; c++) {
      if (colOffsets[c] - scrollLeft > viewW) {
        endCol = c;
        break;
      }
    }

    // Visible row range
    const startRow = Math.max(0, Math.floor((scrollTop) / rowHeight));
    const endRow = Math.min(sheet.rowCount - 1, Math.ceil((scrollTop + viewH) / rowHeight));

    ctx.font = `${Math.round(12 * scale)}px Geist, Segoe UI, sans-serif`;

    // 1. Draw Data Cells
    for (let r = startRow; r <= endRow; r++) {
      const y = r * rowHeight + headerHeight - scrollTop;

      for (let c = startCol; c <= endCol; c++) {
        const x = colOffsets[c] - scrollLeft;
        const w = colOffsets[c + 1] - colOffsets[c];

        // Alternating row background
        if (r % 2 === 1) {
          ctx.fillStyle = darkMode ? '#1A1A1A' : '#F9FBFD';
          ctx.fillRect(x, y, w, rowHeight);
        }

        // Search Match Highlight
        const cell = sheet.data.get(`${r},${c}`);
        if (cell && searchQuery.trim()) {
          const cellStr = String(cell.value ?? '').toLowerCase();
          if (cellStr.includes(searchQuery.toLowerCase())) {
            const currentSheetIdx = renderer.sheetNames.indexOf(activeSheetName);
            const isActiveCell = activeMatchCell && activeMatchCell.r === r && activeMatchCell.c === c && activeMatchCell.sheetIndex === currentSheetIdx;
            if (isActiveCell) {
              ctx.fillStyle = '#F97316';
              ctx.fillRect(x + 1, y + 1, w - 2, rowHeight - 2);
            } else {
              ctx.fillStyle = 'rgba(255, 235, 59, 0.45)';
              ctx.fillRect(x + 1, y + 1, w - 2, rowHeight - 2);
            }
          }
        }

        // Cell borders
        ctx.strokeStyle = darkMode ? '#262626' : '#E8ECEF';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, w, rowHeight);

        // Highlight selected cell
        if (r === selectedCell.r && c === selectedCell.c) {
          ctx.strokeStyle = '#0078D4';
          ctx.lineWidth = 2;
          ctx.strokeRect(x + 1, y + 1, w - 2, rowHeight - 2);
          ctx.fillStyle = darkMode ? 'rgba(0, 120, 212, 0.15)' : 'rgba(0, 120, 212, 0.08)';
          ctx.fillRect(x + 2, y + 2, w - 4, rowHeight - 4);
        }

        // Draw Cell Value
        if (cell) {
          ctx.fillStyle = darkMode ? '#E5E2E1' : '#1A1A1A';
          const text = cell.formatted || String(cell.value ?? '');
          const isNumber = typeof cell.value === 'number' || (!isNaN(Number(cell.value)) && !cell.value.toString().startsWith('$') === false);

          ctx.save();
          ctx.beginPath();
          ctx.rect(x + 4, y, w - 8, rowHeight);
          ctx.clip();

          if (isNumber) {
            ctx.textAlign = 'right';
            ctx.fillText(text, x + w - 8, y + rowHeight / 2 + 4);
          } else {
            ctx.textAlign = 'left';
            ctx.fillText(text, x + 8, y + rowHeight / 2 + 4);
          }
          ctx.restore();
        }
      }
    }

    // 2. Frozen Top Column Headers (A, B, C...)
    ctx.fillStyle = darkMode ? '#202020' : '#F3F4F6';
    ctx.fillRect(0, 0, viewW, headerHeight);

    ctx.strokeStyle = darkMode ? '#333333' : '#D1D5DB';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, headerHeight);
    ctx.lineTo(viewW, headerHeight);
    ctx.stroke();

    for (let c = startCol; c <= endCol; c++) {
      const x = colOffsets[c] - scrollLeft;
      const w = colOffsets[c + 1] - colOffsets[c];
      const colLetter = XLSX.utils.encode_col(c);

      // Header cell divider
      ctx.beginPath();
      ctx.moveTo(x + w, 0);
      ctx.lineTo(x + w, headerHeight);
      ctx.stroke();

      ctx.fillStyle = c === selectedCell.c ? (darkMode ? '#A3C9FF' : '#0078D4') : (darkMode ? '#A0A0A0' : '#4B5563');
      ctx.font = `600 ${Math.round(11 * scale)}px Geist, Segoe UI, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(colLetter, x + w / 2, headerHeight / 2 + 4);
    }

    // 3. Frozen Left Row Headers (1, 2, 3...)
    ctx.fillStyle = darkMode ? '#202020' : '#F3F4F6';
    ctx.fillRect(0, 0, rowHeaderWidth, viewH);

    ctx.beginPath();
    ctx.moveTo(rowHeaderWidth, 0);
    ctx.lineTo(rowHeaderWidth, viewH);
    ctx.stroke();

    for (let r = startRow; r <= endRow; r++) {
      const y = r * rowHeight + headerHeight - scrollTop;

      ctx.strokeStyle = darkMode ? '#333333' : '#D1D5DB';
      ctx.beginPath();
      ctx.moveTo(0, y + rowHeight);
      ctx.lineTo(rowHeaderWidth, y + rowHeight);
      ctx.stroke();

      ctx.fillStyle = r === selectedCell.r ? (darkMode ? '#A3C9FF' : '#0078D4') : (darkMode ? '#A0A0A0' : '#4B5563');
      ctx.font = `600 ${Math.round(11 * scale)}px Geist, Segoe UI, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(String(r + 1), rowHeaderWidth / 2, y + rowHeight / 2 + 4);
    }

    // 4. Top-Left Frozen Corner Anchor
    ctx.fillStyle = darkMode ? '#2A2A2A' : '#E5E7EB';
    ctx.fillRect(0, 0, rowHeaderWidth, headerHeight);
    ctx.strokeStyle = darkMode ? '#404040' : '#D1D5DB';
    ctx.strokeRect(0, 0, rowHeaderWidth, headerHeight);
    ctx.fillStyle = darkMode ? '#888888' : '#6B7280';
    ctx.textAlign = 'center';
    ctx.fillText('#', rowHeaderWidth / 2, headerHeight / 2 + 4);
  }, [darkMode, scale, sheet, colOffsets, rowHeight, headerHeight, rowHeaderWidth, selectedCell]);

  // Re-render when scroll or geometry changes
  useEffect(() => {
    let rafId = 0;
    const onScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(renderGrid);
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', onScroll, { passive: true });
    }
    renderGrid();

    return () => {
      if (container) container.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(rafId);
    };
  }, [renderGrid]);

  // Handle cell clicks
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left + container.scrollLeft;
    const y = e.clientY - rect.top + container.scrollTop;

    // Check if click was inside row or col header
    if (x < rowHeaderWidth || y < headerHeight) return;

    // Find row
    const r = Math.floor((y - headerHeight) / rowHeight);
    // Find col
    let c = 0;
    for (let i = 0; i < colOffsets.length - 1; i++) {
      if (x >= colOffsets[i] && x < colOffsets[i + 1]) {
        c = i;
        break;
      }
    }

    if (r >= 0 && c >= 0) {
      setSelectedCell({ r, c });
    }
  };

  const selectedColLetter = XLSX.utils.encode_col(selectedCell.c);
  const selectedCellRefName = `${selectedColLetter}${selectedCell.r + 1}`;

  return (
    <div className="w-full h-full flex flex-col select-none overflow-hidden bg-background">
      {/* 1. Formula & Address Bar Strip */}
      <div className="h-9 px-3 bg-surface-container-lowest border-b border-surface-container-high/60 flex items-center gap-2 shrink-0 z-30">
        <div className="w-16 h-6 px-1.5 rounded bg-surface-container text-xs font-mono font-semibold text-primary flex items-center justify-center shrink-0 border border-surface-container-high/60">
          {selectedCellRefName}
        </div>
        <div className="h-4 w-[1px] bg-outline-variant/60 mx-0.5" />
        <span className="text-xs font-serif italic text-outline shrink-0 font-bold">fx</span>
        <input
          type="text"
          readOnly
          value={selectedCellText}
          className="flex-1 h-6 px-2 text-xs bg-surface-container-low rounded border border-surface-container-high/40 text-on-surface focus:outline-none font-mono"
        />
      </div>

      {/* 2. Virtual Scroll Canvas Grid Area */}
      <div
        ref={containerRef}
        className="flex-1 w-full overflow-auto relative virtual-scroll-viewport"
        style={{ scrollBehavior: 'auto' }}
      >
        <div style={{ width: `${totalWidth}px`, height: `${totalHeight}px`, position: 'relative' }}>
          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            className="sticky top-0 left-0 block z-10"
          />
        </div>
      </div>

      {/* 3. Bottom Sheet Tabs Strip */}
      <div className="h-8 bg-surface-container-lowest border-t border-surface-container-high/60 px-2 flex items-center gap-1 shrink-0 z-30 overflow-x-auto">
        <span className="text-[11px] font-semibold text-outline uppercase tracking-wider px-2 shrink-0">
          Sheets:
        </span>
        {renderer.sheetNames.map((name) => {
          const isActive = name === activeSheetName;
          return (
            <button
              key={name}
              onClick={() => {
                renderer.setActiveSheet(name);
                setActiveSheetName(name);
              }}
              className={`h-6 px-3 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 shrink-0 ${
                isActive
                  ? 'bg-primary-container text-on-primary-container shadow-xs font-semibold'
                  : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-white' : 'bg-[#107C41]'}`} />
              <span>{name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
