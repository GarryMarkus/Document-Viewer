import { useRef } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';

const appWindow = getCurrentWindow();

interface HeaderProps {
  onFileSelected?: (url: string, name: string) => void;
  fileName?: string;
  numPages?: number;
  currentPage?: number;
}

export default function UnifiedHeaderbar({ onFileSelected, fileName = "No Document", numPages = 0, currentPage = 0 }: HeaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onFileSelected) {
      const url = URL.createObjectURL(file);
      onFileSelected(url, file.name);
    }
  };

  return (
    <div 
      data-tauri-drag-region 
      onDoubleClick={() => appWindow.toggleMaximize()}
      className="h-12 bg-adwaita-header border-b border-adwaita-border flex items-center justify-between px-2 shrink-0 select-none"
    >
      {/* Left side: Sidebar Toggle, Search & Open File */}
      <div className="flex gap-1" data-tauri-drag-region>
        <button className="p-2 rounded-md hover:bg-adwaita-hover transition-colors text-gray-700">
          <svg className="w-5 h-5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
        <button className="p-2 rounded-md hover:bg-adwaita-hover transition-colors text-gray-700">
          <svg className="w-5 h-5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        </button>

        {/* OPEN FILE BUTTON */}
        <button 
          onClick={() => fileInputRef.current?.click()} 
          className="p-2 rounded-md hover:bg-adwaita-hover transition-colors text-gray-700 flex items-center ml-2"
          title="Open PDF"
        >
          <svg className="w-5 h-5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" /></svg>
        </button>
        <input 
          type="file" 
          accept="application/pdf" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          className="hidden" 
        />
      </div>

      {/* Center: Document Title & Page Counter */}
      <div className="flex flex-col items-center pointer-events-none" data-tauri-drag-region>
        <span className="text-sm font-semibold text-gray-800">{fileName}</span>
        {numPages > 0 && <span className="text-xs text-gray-500">Page {currentPage} of {numPages}</span>}
      </div>

      {/* Right side: Window Controls */}
      <div className="flex gap-1">
        <button 
          onClick={() => appWindow.minimize()} 
          className="p-2 rounded-md hover:bg-adwaita-hover transition-colors text-gray-700"
        >
          <svg className="w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
        </button>
        <button 
          onClick={() => appWindow.toggleMaximize()} 
          className="p-2 rounded-md hover:bg-adwaita-hover transition-colors text-gray-700"
        >
          <svg className="w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
        </button>
        <button 
          onClick={() => appWindow.close()} 
          className="p-2 rounded-md hover:bg-red-500 hover:text-white transition-colors text-gray-700"
        >
          <svg className="w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
    </div>
  );
}
