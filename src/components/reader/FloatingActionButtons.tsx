interface FABProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  canZoomIn?: boolean;
  canZoomOut?: boolean;
  darkMode?: boolean;
}

export default function FloatingActionButtons({ onZoomIn, onZoomOut, canZoomIn = true, canZoomOut = true, darkMode }: FABProps) {
  const bg = darkMode ? 'bg-[#555555] hover:bg-[#666] active:bg-[#444]' : 'bg-[#e0e0e0] hover:bg-[#d5d5d5] active:bg-[#c0c0c0] text-[#2e3436]';
  const iconColor = darkMode ? 'text-white' : 'text-[#2e3436]';

  return (
    <div className="absolute bottom-6 right-6 flex flex-col gap-2">
      <button 
        onClick={onZoomIn} 
        disabled={!canZoomIn}
        className={`w-[44px] h-[44px] rounded-full ${bg} ${iconColor} flex items-center justify-center shadow-md transition-all cursor-default border border-black/10 ${!canZoomIn ? 'opacity-50 pointer-events-none' : ''}`} 
        title="Zoom In (Ctrl+=)"
      >
        <svg className="w-[20px] h-[20px] pointer-events-none" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" /></svg>
      </button>
      <button 
        onClick={onZoomOut} 
        disabled={!canZoomOut}
        className={`w-[44px] h-[44px] rounded-full ${bg} ${iconColor} flex items-center justify-center shadow-md transition-all cursor-default border border-black/10 ${!canZoomOut ? 'opacity-50 pointer-events-none' : ''}`} 
        title="Zoom Out (Ctrl+-)"
      >
        <svg className="w-[20px] h-[20px] pointer-events-none" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M18 12H6" /></svg>
      </button>
    </div>
  );
}
