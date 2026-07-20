interface FABProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
}

export default function FloatingActionButtons({ onZoomIn, onZoomOut, onFit }: FABProps) {
  return (
    <div className="absolute bottom-8 right-8 flex flex-col gap-2 bg-white/80 backdrop-blur-md p-2 rounded-[20px] shadow-lg border border-gray-200/50">
      {/* Zoom In */}
      <button onClick={onZoomIn} className="p-2.5 rounded-full hover:bg-gray-100 text-gray-700 transition-colors cursor-default" title="Zoom In">
        <svg className="w-5 h-5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
      </button>
      
      {/* Fit to Screen */}
      <button onClick={onFit} className="p-2.5 rounded-full hover:bg-gray-100 text-gray-700 transition-colors cursor-default" title="Fit to Screen">
        <svg className="w-5 h-5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
      </button>
      
      {/* Zoom Out */}
      <button onClick={onZoomOut} className="p-2.5 rounded-full hover:bg-gray-100 text-gray-700 transition-colors cursor-default" title="Zoom Out">
        <svg className="w-5 h-5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
      </button>
    </div>
  );
}
