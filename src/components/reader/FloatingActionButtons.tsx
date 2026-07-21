interface FABProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  darkMode?: boolean;
}

export default function FloatingActionButtons({ onZoomIn, onZoomOut, darkMode }: FABProps) {
  const bg = darkMode ? 'bg-dark-fab hover:bg-[#666] active:bg-[#444]' : 'bg-adwaita-fab hover:bg-[#505050] active:bg-[#2a2a2a]';

  return (
    <div className="absolute bottom-6 right-6 flex flex-col gap-1.5">
      <button onClick={onZoomIn} className={`w-[42px] h-[42px] rounded-full ${bg} text-white flex items-center justify-center shadow-lg transition-all cursor-default`} title="Zoom In (Ctrl+=)">
        <svg className="w-5 h-5 pointer-events-none" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" /></svg>
      </button>
      <button onClick={onZoomOut} className={`w-[42px] h-[42px] rounded-full ${bg} text-white flex items-center justify-center shadow-lg transition-all cursor-default`} title="Zoom Out (Ctrl+-)">
        <svg className="w-5 h-5 pointer-events-none" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M18 12H6" /></svg>
      </button>
    </div>
  );
}
