interface FABProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  darkMode?: boolean;
}

export default function FloatingActionButtons({ onZoomIn, onZoomOut, onFit, darkMode }: FABProps) {
  const bg = darkMode ? 'bg-dark-fab hover:bg-[#666] active:bg-[#444]' : 'bg-adwaita-fab hover:bg-[#505050] active:bg-[#2a2a2a]';

  return (
    <div className="absolute bottom-6 right-6 flex flex-col gap-2">
      <button onClick={onFit} className={`w-11 h-11 rounded-full ${bg} text-white flex items-center justify-center shadow-lg transition-all cursor-default`} title="Fit to Width (Ctrl+0)">
        <svg className="w-5 h-5 pointer-events-none" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
      </button>
      <button onClick={onZoomIn} className={`w-11 h-11 rounded-full ${bg} text-white flex items-center justify-center shadow-lg transition-all cursor-default`} title="Zoom In (Ctrl+=)">
        <svg className="w-5 h-5 pointer-events-none" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" /></svg>
      </button>
      <button onClick={onZoomOut} className={`w-11 h-11 rounded-full ${bg} text-white flex items-center justify-center shadow-lg transition-all cursor-default`} title="Zoom Out (Ctrl+-)">
        <svg className="w-5 h-5 pointer-events-none" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M18 12H6" /></svg>
      </button>
    </div>
  );
}
