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

    track.addEventListener('scroll', updateScrollState, { passive: true });
    window.addEventListener('resize', updateScrollState);

    return () => {
      track.removeEventListener('scroll', updateScrollState);
      window.removeEventListener('resize', updateScrollState);
    };
  }, [updateScrollState]);

  const handleScrollBy = (direction: -1 | 1) => {
    const track = trackRef.current;
    if (!track) return;
    const distance = step ?? Math.max(Math.floor(track.clientWidth * 0.82), 280);
    track.scrollBy({ left: distance * direction, behavior: 'smooth' });
  };

  return (
    <div className="space-y-3">
      <div className={`flex justify-end gap-2 ${controlsClassName ?? ''}`}>
        <button
          type="button"
          onClick={() => handleScrollBy(-1)}
          disabled={!canScrollLeft}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#E2E7EC] bg-white text-[#0E2A47] shadow-sm transition enabled:hover:-translate-y-0.5 enabled:hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40"
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
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#E2E7EC] bg-white text-[#0E2A47] shadow-sm transition enabled:hover:-translate-y-0.5 enabled:hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40"
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
        className={`flex gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden ${trackClassName ?? ''}`}
      >
        {children}
      </div>
    </div>
  );
}
