import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

type HorizontalScrollerProps = {
  children: ReactNode;
  itemsCount: number;
  trackClassName?: string;
  controlsClassName?: string;
  step?: number;
};

export default function HorizontalScroller({
  children,
  itemsCount,
  trackClassName,
  controlsClassName,
  step,
}: HorizontalScrollerProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;

    const maxScrollLeft = track.scrollWidth - track.clientWidth;
    setCanScrollLeft(track.scrollLeft > 4);
    setCanScrollRight(maxScrollLeft - track.scrollLeft > 4);
  }, []);

  useEffect(() => {
    updateScrollState();
  }, [updateScrollState, itemsCount]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    let rafId: number | null = null;
    const throttledUpdate = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        updateScrollState();
      });
    };

    track.addEventListener('scroll', throttledUpdate, { passive: true });
    window.addEventListener('resize', throttledUpdate);

    return () => {
      track.removeEventListener('scroll', throttledUpdate);
      window.removeEventListener('resize', throttledUpdate);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [updateScrollState]);

  const handleScrollBy = useCallback((direction: -1 | 1) => {
    const track = trackRef.current;
    if (!track) return;
    const distance = step ?? Math.max(Math.floor(track.clientWidth * 0.82), 280);
    track.scrollBy({ left: distance * direction, behavior: 'smooth' });
  }, [step]);

  return (
    <div className="space-y-4">
      <div className={`flex justify-end gap-2 ${controlsClassName ?? ''}`}>
        <button
          type="button"
          onClick={() => handleScrollBy(-1)}
          disabled={!canScrollLeft}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#DFE7EF] bg-white text-[#0E2A47] transition enabled:hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Desplazar hacia la izquierda"
        >
          <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
            <path
              d="M12.5 4.5L7.5 10l5 5.5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => handleScrollBy(1)}
          disabled={!canScrollRight}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#DFE7EF] bg-white text-[#0E2A47] transition enabled:hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Desplazar hacia la derecha"
        >
          <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
            <path
              d="M7.5 4.5L12.5 10l-5 5.5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      <div
        ref={trackRef}
        className={`flex gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [scrollbar-color:transparent_transparent] [&::-webkit-scrollbar]:hidden [&::-webkit-scrollbar]:h-0 [&::-webkit-scrollbar]:w-0 ${trackClassName ?? ''}`}
      >
        {children}
      </div>
    </div>
  );
}
