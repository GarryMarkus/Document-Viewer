import { useEffect, useState } from 'react';
import { PPTXRenderer, SlideData } from '../../engine/renderers/PPTXRenderer';

interface PresentationViewProps {
  renderer: PPTXRenderer;
  initialSlide?: number;
  onExit: () => void;
}

export default function PresentationView({
  renderer,
  initialSlide = 1,
  onExit,
}: PresentationViewProps) {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(initialSlide - 1);
  const [showNotes, setShowNotes] = useState(false);
  const totalSlides = renderer.getPageCount();

  const slide: SlideData | undefined = renderer.getSlide(currentSlideIndex);

  const nextSlide = () => {
    if (currentSlideIndex < totalSlides - 1) {
      setCurrentSlideIndex(i => i + 1);
    }
  };

  const prevSlide = () => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex(i => i - 1);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onExit();
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault();
        nextSlide();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        prevSlide();
      } else if (e.key === 'Home') {
        e.preventDefault();
        setCurrentSlideIndex(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        setCurrentSlideIndex(totalSlides - 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSlideIndex, totalSlides, onExit]);

  if (!slide) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center select-none overflow-hidden">
      {/* 16:9 Slide Canvas */}
      <div className="relative w-full h-full max-w-[96vw] max-h-[96vh] aspect-video flex items-center justify-center shadow-2xl">
        <div
          className="w-full h-full rounded-sm overflow-hidden"
          dangerouslySetInnerHTML={{ __html: slide.htmlSnippet }}
        />

        {/* Speaker notes popover */}
        {showNotes && slide.notes && (
          <div className="absolute bottom-6 left-6 max-w-md bg-black/80 backdrop-blur-md text-white p-4 rounded-xl border border-white/20 text-xs shadow-2xl">
            <div className="font-bold uppercase tracking-wider text-primary text-[10px] mb-1">Speaker Notes</div>
            <p className="leading-relaxed">{slide.notes}</p>
          </div>
        )}
      </div>

      {/* Floating Presentation Controls on Hover */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-black/70 backdrop-blur-md border border-white/10 text-white flex items-center gap-4 text-xs opacity-20 hover:opacity-100 transition-opacity">
        <button
          onClick={prevSlide}
          disabled={currentSlideIndex === 0}
          className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-white/20 disabled:opacity-30"
          title="Previous Slide"
        >
          ‹
        </button>
        <span className="font-mono font-medium">
          {currentSlideIndex + 1} / {totalSlides}
        </span>
        <button
          onClick={nextSlide}
          disabled={currentSlideIndex === totalSlides - 1}
          className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-white/20 disabled:opacity-30"
          title="Next Slide"
        >
          ›
        </button>

        {slide.notes && (
          <button
            onClick={() => setShowNotes(v => !v)}
            className={`px-2 py-0.5 rounded text-[11px] transition-colors ${showNotes ? 'bg-primary text-white' : 'hover:bg-white/20'}`}
          >
            Notes
          </button>
        )}

        <button
          onClick={onExit}
          className="px-2 py-0.5 rounded text-[11px] text-neutral-400 hover:text-white"
        >
          End Show (Esc)
        </button>
      </div>
    </div>
  );
}
