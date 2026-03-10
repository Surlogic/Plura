'use client';

import Image from 'next/image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { resolveAssetUrl } from '@/utils/assetUrl';

type BusinessGalleryProps = {
  photos: string[];
  businessName?: string;
};

const sanitizeImageSrc = (value: string): string | null => {
  const resolved = resolveAssetUrl(value);
  if (!resolved) return null;
  try {
    const parsed = new URL(resolved, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return resolved;
    }
    return null;
  } catch {
    return null;
  }
};

export default function BusinessGallery({ photos, businessName }: BusinessGalleryProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const normalizedPhotos = useMemo(() => {
    const unique = new Set<string>();
    const result: string[] = [];

    photos.forEach((photo) => {
      if (!photo) return;
      const normalized = sanitizeImageSrc(photo);
      if (!normalized || unique.has(normalized)) return;
      unique.add(normalized);
      result.push(normalized);
    });

    return result.slice(0, 15);
  }, [photos]);

  const updateScrollState = useCallback(() => {
    const node = trackRef.current;
    if (!node) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }

    const maxScrollLeft = node.scrollWidth - node.clientWidth;
    setCanScrollLeft(node.scrollLeft > 4);
    setCanScrollRight(maxScrollLeft - node.scrollLeft > 4);
  }, []);

  const scheduleScrollStateUpdate = useCallback(() => {
    if (rafRef.current !== null) return;
    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = null;
      updateScrollState();
    });
  }, [updateScrollState]);

  useEffect(() => {
    scheduleScrollStateUpdate();
  }, [normalizedPhotos.length, scheduleScrollStateUpdate]);

  useEffect(() => {
    window.addEventListener('resize', scheduleScrollStateUpdate, { passive: true });
    return () => window.removeEventListener('resize', scheduleScrollStateUpdate);
  }, [scheduleScrollStateUpdate]);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (activeIndex === null) return undefined;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActiveIndex(null);
        return;
      }
      if (event.key === 'ArrowRight') {
        setActiveIndex((prev) => {
          if (prev === null || normalizedPhotos.length === 0) return prev;
          return (prev + 1) % normalizedPhotos.length;
        });
      }
      if (event.key === 'ArrowLeft') {
        setActiveIndex((prev) => {
          if (prev === null || normalizedPhotos.length === 0) return prev;
          return (prev - 1 + normalizedPhotos.length) % normalizedPhotos.length;
        });
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeIndex, normalizedPhotos.length]);

  const scrollByViewport = (direction: -1 | 1) => {
    const node = trackRef.current;
    if (!node) return;
    const distance = Math.max(node.clientWidth * 0.85, 260);
    node.scrollBy({ left: direction * distance, behavior: 'smooth' });
  };

  if (normalizedPhotos.length === 0) {
    return (
      <div className="rounded-[20px] border border-dashed border-[#CBD5E1] bg-[#F8FAFC] px-5 py-8 text-sm text-[#64748B]">
        No hay fotos cargadas todavia.
      </div>
    );
  }

  return (
    <>
      <div className="relative">
        <div
          ref={trackRef}
          onScroll={scheduleScrollStateUpdate}
          className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 pr-1 scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {normalizedPhotos.map((photo, index) => (
            <button
              key={`${photo}-${index}`}
              type="button"
              onClick={() => setActiveIndex(index)}
              className="h-28 w-[160px] shrink-0 snap-start overflow-hidden rounded-[16px] border border-[#D9E2EC] bg-[#EEF2F6] transition hover:-translate-y-0.5 hover:shadow-sm sm:h-32 sm:w-[164px]"
              aria-label={`Abrir foto ${index + 1}`}
            >
              <span className="relative block h-full w-full">
                <Image
                  src={photo}
                  alt={`Foto ${index + 1} de ${businessName || 'negocio'}`}
                  fill
                  sizes="(max-width: 640px) 160px, 164px"
                  className="h-full w-full object-cover"
                />
              </span>
            </button>
          ))}
        </div>

        {normalizedPhotos.length > 1 ? (
          <>
            <button
              type="button"
              onClick={() => scrollByViewport(-1)}
              disabled={!canScrollLeft}
              className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-[color:var(--border-soft)] bg-white/95 text-base text-[color:var(--ink)] shadow-[var(--shadow-card)] transition disabled:cursor-not-allowed disabled:opacity-45"
              aria-label="Ver fotos anteriores"
            >
              {'<'}
            </button>
            <button
              type="button"
              onClick={() => scrollByViewport(1)}
              disabled={!canScrollRight}
              className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-[color:var(--border-soft)] bg-white/95 text-base text-[color:var(--ink)] shadow-[var(--shadow-card)] transition disabled:cursor-not-allowed disabled:opacity-45"
              aria-label="Ver fotos siguientes"
            >
              {'>'}
            </button>
          </>
        ) : null}
      </div>

      {activeIndex !== null ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8">
          <button
            type="button"
            className="absolute inset-0 bg-[rgba(18,49,38,0.82)]"
            onClick={() => setActiveIndex(null)}
            aria-label="Cerrar galeria"
          />
          <div className="relative z-[1] flex w-full items-center justify-center gap-3">
            {normalizedPhotos.length > 1 ? (
              <button
                type="button"
                onClick={() =>
                  setActiveIndex((prev) => {
                    if (prev === null) return prev;
                    return (prev - 1 + normalizedPhotos.length) % normalizedPhotos.length;
                  })
                }
                className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/40 bg-white/10 text-xl font-semibold text-white backdrop-blur-sm sm:flex"
                aria-label="Foto anterior"
              >
                {'<'}
              </button>
            ) : null}

            <div className="relative max-h-[92vh] max-w-[96vw] overflow-hidden rounded-[18px] border border-white/20 bg-black/25">
              <div className="relative h-[75vh] w-[92vw] max-w-[1200px] sm:h-[84vh] sm:w-[86vw]">
                <Image
                  src={normalizedPhotos[activeIndex]}
                  alt={`Foto ${activeIndex + 1} de ${businessName || 'negocio'}`}
                  fill
                  sizes="(max-width: 640px) 92vw, 86vw"
                  className="object-contain"
                  priority
                />
              </div>
              <button
                type="button"
                onClick={() => setActiveIndex(null)}
                className="absolute right-3 top-3 rounded-full border border-white/50 bg-black/30 px-3 py-1 text-xs font-semibold text-white"
                aria-label="Cerrar"
              >
                Cerrar
              </button>
            </div>

            {normalizedPhotos.length > 1 ? (
              <button
                type="button"
                onClick={() =>
                  setActiveIndex((prev) => {
                    if (prev === null) return prev;
                    return (prev + 1) % normalizedPhotos.length;
                  })
                }
                className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/40 bg-white/10 text-xl font-semibold text-white backdrop-blur-sm sm:flex"
                aria-label="Foto siguiente"
              >
                {'>'}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
