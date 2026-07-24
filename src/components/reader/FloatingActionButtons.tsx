interface FABProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  canZoomIn?: boolean;
  canZoomOut?: boolean;
  darkMode?: boolean;
}

export default function FloatingActionButtons({ onZoomIn, onZoomOut, canZoomIn = true, canZoomOut = true, darkMode }: FABProps) {
  const bg = darkMode 
    ? 'bg-[#404040] hover:bg-[#4a4a4a] active:bg-[#383838]' 
    : 'bg-white hover:bg-[#f5f5f5] active:bg-[#ebebeb]';
  const iconColor = darkMode ? 'text-white/90' : 'text-[#2e3436]';
  const shadow = darkMode 
    ? 'shadow-lg shadow-black/40' 
    : 'shadow-lg shadow-black/15';

  return (
    <div className={`absolute bottom-5 right-5 flex flex-col gap-1.5 ${darkMode ? 'bg-[#363636]' : 'bg-white'} rounded-[14px] p-1.5 ${shadow} border ${darkMode ? 'border-white/[0.06]' : 'border-black/[0.06]'}`}>
      <button 
        onClick={onZoomIn} 
        disabled={!canZoomIn}
        className={`w-9 h-9 rounded-[10px] ${bg} ${iconColor} flex items-center justify-center transition-colors duration-100 cursor-default ${!canZoomIn ? 'opacity-40 pointer-events-none' : ''}`} 
        title="Zoom In (Ctrl+=)"
      >
        <svg className="w-[18px] h-[18px] pointer-events-none" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" /></svg>
      </button>
      <button 
        onClick={onZoomOut} 
        disabled={!canZoomOut}
        className={`w-9 h-9 rounded-[10px] ${bg} ${iconColor} flex items-center justify-center transition-colors duration-100 cursor-default ${!canZoomOut ? 'opacity-40 pointer-events-none' : ''}`} 
        title="Zoom Out (Ctrl+-)"
      >
        <svg className="w-[18px] h-[18px] pointer-events-none" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M18 12H6" /></svg>
      </button>
    </div>
  );
}
