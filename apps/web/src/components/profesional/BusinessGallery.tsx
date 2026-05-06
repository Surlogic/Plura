'use client';

import Image from 'next/image';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
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

export default memo(function BusinessGallery({ photos, businessName }: BusinessGalleryProps) {
  const thumbnailTrackRef = useRef<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [failedPhotos, setFailedPhotos] = useState<string[]>([]);

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

  const availablePhotos = useMemo(
    () => normalizedPhotos.filter((photo) => !failedPhotos.includes(photo)),
    [failedPhotos, normalizedPhotos],
  );

  useEffect(() => {
    setFailedPhotos((prev) => prev.filter((photo) => normalizedPhotos.includes(photo)));
  }, [normalizedPhotos]);

  useEffect(() => {
    if (activeIndex === null) return;
    if (availablePhotos.length === 0) {
      setActiveIndex(null);
      return;
    }
    if (activeIndex >= availablePhotos.length) {
      setActiveIndex(availablePhotos.length - 1);
    }
  }, [activeIndex, availablePhotos.length]);

  useEffect(() => {
    if (activeIndex === null) return undefined;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActiveIndex(null);
        return;
      }
      if (event.key === 'ArrowRight') {
        setActiveIndex((prev) => {
          if (prev === null || availablePhotos.length === 0) return prev;
          return (prev + 1) % availablePhotos.length;
        });
      }
      if (event.key === 'ArrowLeft') {
        setActiveIndex((prev) => {
          if (prev === null || availablePhotos.length === 0) return prev;
          return (prev - 1 + availablePhotos.length) % availablePhotos.length;
        });
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeIndex, availablePhotos.length]);

  useEffect(() => {
    if (activeIndex === null) return;
    const node = thumbnailTrackRef.current;
    const target = node?.querySelector<HTMLElement>(`[data-photo-index="${activeIndex}"]`);
    target?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [activeIndex]);

  const handleImageError = (photo: string) => {
    setFailedPhotos((prev) => (prev.includes(photo) ? prev : [...prev, photo]));
  };

  if (availablePhotos.length === 0) {
    return (
      <div className="rounded-[24px] border border-dashed border-[#CBD5E1] bg-[#F8FAFC] px-5 py-10 text-sm text-[#64748B]">
        No hay fotos cargadas todavia.
      </div>
    );
  }

  const visiblePhotos = availablePhotos.slice(0, Math.min(availablePhotos.length, 8));
  const hiddenPhotosCount = Math.max(0, availablePhotos.length - visiblePhotos.length);

  return (
    <>
      <div className="overflow-hidden">
        <div className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {visiblePhotos.map((photo, index) => (
            <button
              key={`${photo}-${index}`}
              type="button"
              onClick={() => setActiveIndex(index)}
              className="group relative aspect-[4/3] w-[76vw] max-w-[360px] shrink-0 overflow-hidden rounded-[20px] border border-[#D9E2EC] bg-[#EEF2F6] text-left transition hover:-translate-y-0.5 hover:shadow-[0_18px_44px_-32px_rgba(15,23,42,0.24)] sm:w-[310px] lg:w-[340px]"
              aria-label={`Abrir foto ${index + 1}`}
            >
              <span className="absolute inset-0">
                <Image
                  src={photo}
                  alt={`Foto ${index + 1} de ${businessName || 'negocio'}`}
                  fill
                  sizes="(max-width: 640px) 76vw, 340px"
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                  onError={() => handleImageError(photo)}
                />
              </span>
              <span className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.02)_15%,rgba(15,23,42,0.36)_100%)]" />
              {hiddenPhotosCount > 0 && index === visiblePhotos.length - 1 ? (
                <span className="absolute inset-0 flex items-center justify-center bg-[rgba(15,23,42,0.42)] text-base font-semibold text-white">
                  +{hiddenPhotosCount} fotos
                </span>
              ) : null}
            </button>
          ))}
        </div>

        {availablePhotos.length > visiblePhotos.length ? (
          <button
            type="button"
            onClick={() => setActiveIndex(0)}
            className="mt-3 rounded-full border border-[color:var(--border-soft)] bg-white px-4 py-2 text-sm font-semibold text-[color:var(--ink)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-card)]"
          >
            Ver todas las fotos
          </button>
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
          <div className="relative z-[1] flex w-full max-w-[1320px] flex-col gap-4">
            <div className="flex items-center justify-between gap-4 text-white">
              <div>
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-white/70">
                  Galeria
                </p>
                <p className="mt-2 text-lg font-semibold">
                  {activeIndex + 1} de {availablePhotos.length}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveIndex(null)}
                className="rounded-full border border-white/40 bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm"
                aria-label="Cerrar"
              >
                Cerrar
              </button>
            </div>

            <div className="flex items-center justify-center gap-3">
              {availablePhotos.length > 1 ? (
                <button
                  type="button"
                  onClick={() =>
                    setActiveIndex((prev) => {
                      if (prev === null) return prev;
                      return (prev - 1 + availablePhotos.length) % availablePhotos.length;
                    })
                  }
                  className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/40 bg-white/10 text-xl font-semibold text-white backdrop-blur-sm sm:flex"
                  aria-label="Foto anterior"
                >
                  {'<'}
                </button>
              ) : null}

              <div className="relative max-h-[92vh] max-w-[96vw] overflow-hidden rounded-[24px] border border-white/20 bg-black/25">
                <div className="relative h-[70vh] w-[92vw] max-w-[1200px] sm:h-[78vh] sm:w-[86vw]">
                  <Image
                    src={availablePhotos[activeIndex]}
                    alt={`Foto ${activeIndex + 1} de ${businessName || 'negocio'}`}
                    fill
                    sizes="(max-width: 640px) 92vw, 86vw"
                    className="object-contain"
                    priority
                    onError={() => handleImageError(availablePhotos[activeIndex])}
                  />
                </div>
              </div>

              {availablePhotos.length > 1 ? (
                <button
                  type="button"
                  onClick={() =>
                    setActiveIndex((prev) => {
                      if (prev === null) return prev;
                      return (prev + 1) % availablePhotos.length;
                    })
                  }
                  className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/40 bg-white/10 text-xl font-semibold text-white backdrop-blur-sm sm:flex"
                  aria-label="Foto siguiente"
                >
                  {'>'}
                </button>
              ) : null}
            </div>

            {availablePhotos.length > 1 ? (
              <div
                ref={thumbnailTrackRef}
                className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                {availablePhotos.map((photo, index) => (
                  <button
                    key={`${photo}-thumb-${index}`}
                    type="button"
                    data-photo-index={index}
                    onClick={() => setActiveIndex(index)}
                    className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-[16px] border transition ${
                      index === activeIndex
                        ? 'border-white shadow-[0_0_0_2px_rgba(255,255,255,0.35)]'
                        : 'border-white/20 opacity-70 hover:opacity-100'
                    }`}
                    aria-label={`Ir a foto ${index + 1}`}
                  >
                    <Image
                      src={photo}
                      alt={`Miniatura ${index + 1} de ${businessName || 'negocio'}`}
                      fill
                      sizes="80px"
                      className="object-cover"
                      onError={() => handleImageError(photo)}
                    />
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
});
