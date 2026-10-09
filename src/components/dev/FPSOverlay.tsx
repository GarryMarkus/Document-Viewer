import { useState, useEffect, useRef } from 'react';

interface FPSOverlayProps {
  onRunBenchmark?: () => Promise<void>;
  isBenchmarking?: boolean;
}

export default function FPSOverlay({ onRunBenchmark, isBenchmarking = false }: FPSOverlayProps) {
  const [fps, setFps] = useState(60);
  const [frameTime, setFrameTime] = useState(16.6);
  const [minFps, setMinFps] = useState(60);
  const [droppedFrames, setDroppedFrames] = useState(0);
  const [isOpen, setIsOpen] = useState(true);

  const frameTimesRef = useRef<number[]>([]);
  const lastTimeRef = useRef(performance.now());
  const rafIdRef = useRef<number>(0);

  useEffect(() => {
    let frameCount = 0;
    let lastSecond = performance.now();

    const loop = (now: number) => {
      const delta = now - lastTimeRef.current;
      lastTimeRef.current = now;

      if (delta > 0) {
        frameTimesRef.current.push(delta);
        if (frameTimesRef.current.length > 60) frameTimesRef.current.shift();

        if (delta > 20) {
          setDroppedFrames(d => d + 1);
        }
      }

      frameCount++;
      if (now - lastSecond >= 500) {
        const currentFps = Math.round((frameCount * 1000) / (now - lastSecond));
        setFps(currentFps);
        setMinFps(prev => Math.min(prev, currentFps));

        const avgDelta = frameTimesRef.current.reduce((a, b) => a + b, 0) / (frameTimesRef.current.length || 1);
        setFrameTime(Math.round(avgDelta * 10) / 10);

        frameCount = 0;
        lastSecond = now;
      }

      rafIdRef.current = requestAnimationFrame(loop);
    };

    rafIdRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafIdRef.current);
  }, []);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-9 right-4 z-[90] px-2 py-1 rounded bg-black/80 text-emerald-400 text-[10px] font-mono border border-emerald-500/40 hover:bg-black transition-colors shadow-lg"
        title="Open FPS Monitor (Ctrl+Shift+D)"
      >
        {fps} FPS
      </button>
    );
  }

  const fpsColor = fps >= 58 ? 'text-emerald-400' : fps >= 45 ? 'text-amber-400' : 'text-rose-400';

  return (
    <div className="fixed bottom-9 right-4 z-[90] bg-black/85 backdrop-blur-md text-white rounded-lg p-2.5 text-xs font-mono border border-white/10 shadow-2xl w-48 select-none">
      <div className="flex items-center justify-between border-b border-white/10 pb-1.5 mb-2">
        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Perf HUD</span>
        <button
          onClick={() => setIsOpen(false)}
          className="text-neutral-500 hover:text-white transition-colors text-[10px]"
        >
          Hide
        </button>
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-neutral-400">FPS:</span>
          <span className={`font-bold ${fpsColor}`}>{fps} FPS</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-neutral-400">1% Low:</span>
          <span className="text-neutral-300">{minFps} FPS</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-neutral-400">Frame time:</span>
          <span className="text-neutral-200">{frameTime} ms</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-neutral-400">Dropped:</span>
          <span className={droppedFrames > 0 ? "text-amber-400" : "text-neutral-400"}>
            {droppedFrames} frames
          </span>
        </div>
      </div>

      {onRunBenchmark && (
        <button
          onClick={onRunBenchmark}
          disabled={isBenchmarking}
          className="w-full mt-2.5 py-1 rounded bg-primary-container text-on-primary-container text-[11px] font-semibold hover:brightness-110 active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
        >
          {isBenchmarking ? (
            <span>Benchmarking...</span>
          ) : (
            <>
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              <span>Benchmark Scroll</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}
