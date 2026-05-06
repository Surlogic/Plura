import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import PublicProfileMap from '@/components/profesional/PublicProfileMap';
import { getPublicProfessionalReviews } from '@/services/publicReviews';
import type { BookingReviewPage, BookingReviewResponse } from '@/types/review';

type Props = {
  slug: string;
  name: string;
  category: string;
  address?: string;
  city?: string;
  latitude?: number | null;
  longitude?: number | null;
  rating?: number | null;
  reviewsCount?: number | null;
};

const StarDisplay = ({ rating }: { rating: number }) => (
  <span className="text-sm text-[#F59E0B]">
    {'★'.repeat(rating)}
    <span className="text-[#CBD5E1]">{'★'.repeat(5 - rating)}</span>
  </span>
);

const formatDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString('es-UY', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '';
  }
};

const buildGoogleMapsHref = ({
  address,
  city,
  latitude,
  longitude,
}: {
  address?: string;
  city?: string;
  latitude?: number | null;
  longitude?: number | null;
}) => {
  if (typeof latitude === 'number' && typeof longitude === 'number') {
    return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
  }

  const query = [address?.trim(), city?.trim()].filter(Boolean).join(', ');
  if (!query) return '';
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
};

export default memo(function PublicReviewsList({
  slug,
  name,
  category,
  address = '',
  city = '',
  latitude,
  longitude,
  rating,
  reviewsCount,
}: Props) {
  const [page, setPage] = useState<BookingReviewPage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const load = useCallback(async (pageNum: number, isActive?: () => boolean) => {
    setIsLoading(true);
    setLoadError(null);

    try {
      const result = await getPublicProfessionalReviews(slug, pageNum, 10);
      if (isActive && !isActive()) return;
      setPage(result);
      setCurrentPage(pageNum);
    } catch (error) {
      if (isActive && !isActive()) return;
      const message =
        error instanceof Error ? error.message : 'No pudimos cargar las reseñas.';
      setLoadError(message);
    } finally {
      if (!isActive || isActive()) {
        setIsLoading(false);
      }
    }
  }, [slug]);

  useEffect(() => {
    let active = true;
    void load(0, () => active);
    return () => {
      active = false;
    };
  }, [load]);

  useEffect(() => {
    if (!isModalOpen) return undefined;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsModalOpen(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isModalOpen]);

  const hasGlobalRating = typeof rating === 'number' && Number.isFinite(rating);
  const totalReviews = typeof reviewsCount === 'number' ? reviewsCount : page?.totalElements ?? 0;
  const hasReviews = totalReviews > 0 && page?.empty === false;
  const mapHref = useMemo(
    () => buildGoogleMapsHref({ address, city, latitude, longitude }),
    [address, city, latitude, longitude],
  );
  const hasCoordinates =
    typeof latitude === 'number' && Number.isFinite(latitude) &&
    typeof longitude === 'number' && Number.isFinite(longitude);
  const locationLabel = [address.trim(), city.trim()].filter(Boolean).join(', ');

  return (
    <>
      <section>
        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.32em] text-[color:var(--ink-faint)]">
            Confianza y ubicación
          </p>
          <h2 className="mt-2 text-3xl font-semibold text-[color:var(--ink)]">
            Confianza y ubicación
          </h2>
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
          <div className="rounded-[22px] border border-[color:var(--border-soft)] bg-[color:var(--surface-soft)] p-6">
            <div className="flex min-h-[320px] flex-col items-center justify-center text-center">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-[color:var(--ink-faint)]">
                Reseñas
              </p>

              {hasReviews ? (
                <>
                  <p className="mt-5 text-6xl font-semibold tracking-[-0.05em] text-[color:var(--ink)]">
                    {hasGlobalRating ? rating.toFixed(1) : '--'}
                  </p>
                  <p className="mt-3 text-sm font-semibold text-[color:var(--ink)]">
                    {totalReviews} {totalReviews === 1 ? 'reseña pública' : 'reseñas públicas'}
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(true)}
                    className="mt-6 rounded-full border border-[color:var(--border-soft)] bg-white px-5 py-2.5 text-sm font-semibold text-[color:var(--ink)] shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:border-[color:var(--border-strong)] hover:bg-[color:var(--surface-hover)]"
                  >
                    Leer reseñas
                  </button>
                </>
              ) : loadError ? (
                <>
                  <p className="mt-5 text-lg font-semibold text-[#991B1B]">
                    No pudimos cargar las reseñas
                  </p>
                  <p className="mt-2 max-w-sm text-sm leading-6 text-[#B91C1C]">
                    {loadError}
                  </p>
                </>
              ) : isLoading ? (
                <p className="mt-5 text-sm text-[color:var(--ink-muted)]">Cargando reseñas...</p>
              ) : (
                <>
                  <p className="mt-5 text-lg font-semibold text-[color:var(--ink)]">
                    Todavía no hay reseñas públicas
                  </p>
                  <p className="mt-2 max-w-sm text-sm leading-6 text-[color:var(--ink-muted)]">
                    Cuando lleguen nuevas opiniones de clientes, las vas a poder leer desde acá.
                  </p>
                </>
              )}
            </div>
          </div>

          <div className="rounded-[22px] border border-[color:var(--border-soft)] bg-[color:var(--surface-soft)] p-3">
            {hasCoordinates ? (
              <div className="relative overflow-hidden rounded-[18px]">
                {mapHref ? (
                  <a
                    href={mapHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute right-4 top-4 z-10 rounded-full border border-white/85 bg-white/95 px-4 py-2 text-xs font-semibold text-[color:var(--ink)] shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:bg-white"
                  >
                    Cómo llegar
                  </a>
                ) : null}
                <PublicProfileMap
                  name={name}
                  category={category}
                  address={address}
                  city={city}
                  latitude={latitude}
                  longitude={longitude}
                  heightClassName="h-[320px] sm:h-[360px]"
                  interactive={false}
                />
              </div>
            ) : (
              <div className="flex min-h-[320px] flex-col justify-between rounded-[18px] border border-[color:var(--border-soft)] bg-white p-5">
                <div>
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-[color:var(--ink-faint)]">
                    Ubicación
                  </p>
                  {locationLabel ? (
                    <p className="mt-4 text-sm leading-7 text-[color:var(--ink-muted)] sm:text-base">
                      {locationLabel}
                    </p>
                  ) : (
                    <p className="mt-4 text-sm leading-7 text-[color:var(--ink-muted)]">
                      La ubicación pública todavía no está cargada.
                    </p>
                  )}
                </div>

                {mapHref ? (
                  <div className="mt-6">
                    <a
                      href={mapHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex rounded-full border border-[color:var(--border-soft)] bg-[color:var(--primary)] px-5 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:bg-[color:var(--primary-strong)]"
                    >
                      Abrir en Google Maps
                    </a>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </section>

      {isModalOpen ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center px-4 py-6">
          <button
            type="button"
            className="absolute inset-0 bg-[rgba(18,49,38,0.36)] backdrop-blur-[3px]"
            onClick={() => setIsModalOpen(false)}
            aria-label="Cerrar reseñas"
          />
          <div className="relative z-[1] flex w-full max-w-[760px] max-h-[88vh] flex-col overflow-hidden rounded-[24px] border border-[color:var(--border-soft)] bg-white shadow-[var(--shadow-lift)]">
            <div className="flex items-start justify-between gap-4 border-b border-[color:var(--border-soft)] px-5 py-4 sm:px-6">
              <div>
                <p className="text-[0.62rem] uppercase tracking-[0.35em] text-[color:var(--ink-faint)]">
                  Reseñas
                </p>
                <h3 className="mt-1 text-2xl font-semibold text-[color:var(--ink)]">
                  Lo que dicen los clientes
                </h3>
                <p className="mt-2 text-sm text-[color:var(--ink-muted)]">
                  {totalReviews} {totalReviews === 1 ? 'reseña pública' : 'reseñas públicas'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-full border border-[color:var(--border-soft)] px-3 py-1 text-xs font-semibold text-[color:var(--ink-muted)] transition hover:bg-[color:var(--surface-soft)]"
              >
                Cerrar
              </button>
            </div>

            <div className="overflow-y-auto px-5 py-5 sm:px-6">
              {loadError ? (
                <div className="rounded-[18px] border border-[#FECACA] bg-[#FEF2F2] p-4">
                  <p className="text-sm font-semibold text-[#991B1B]">No pudimos cargar las reseñas</p>
                  <p className="mt-1 text-sm text-[#B91C1C]">{loadError}</p>
                </div>
              ) : null}

              <div className="space-y-4">
                {(page?.content ?? []).map((review: BookingReviewResponse) => (
                  <article
                    key={review.id}
                    className="rounded-[20px] border border-[color:var(--border-soft)] bg-[color:var(--surface-soft)] p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--brand-cyan),var(--brand-navy))] text-sm font-semibold text-white">
                          {review.authorDisplayName?.charAt(0)?.toUpperCase() ?? '?'}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-[color:var(--ink)]">
                            {review.authorDisplayName}
                          </p>
                          <div className="mt-1 flex items-center gap-2">
                            <StarDisplay rating={review.rating} />
                            <span className="text-xs font-semibold text-[color:var(--ink-muted)]">
                              {review.rating.toFixed(1)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-[color:var(--ink-faint)]">{formatDate(review.createdAt)}</p>
                    </div>

                    {review.textHiddenByProfessional ? (
                      <p className="mt-4 text-sm italic leading-6 text-[color:var(--ink-faint)]">
                        El texto de esta reseña no está visible públicamente.
                      </p>
                    ) : review.text ? (
                      <p className="mt-4 text-sm leading-7 text-[color:var(--ink-muted)]">{review.text}</p>
                    ) : (
                      <p className="mt-4 text-xs italic text-[color:var(--ink-faint)]">
                        Sin comentario, solo calificación.
                      </p>
                    )}
                  </article>
                ))}
              </div>
            </div>

            {page && page.totalPages > 1 ? (
              <div className="flex items-center justify-center gap-3 border-t border-[color:var(--border-soft)] px-5 py-4 sm:px-6">
                <button
                  type="button"
                  disabled={page.first || isLoading}
                  onClick={() => void load(currentPage - 1)}
                  className="rounded-full border border-[color:var(--border-soft)] bg-white px-4 py-2 text-xs font-semibold text-[color:var(--ink)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Anterior
                </button>
                <span className="text-xs text-[color:var(--ink-muted)]">
                  {currentPage + 1} / {page.totalPages}
                </span>
                <button
                  type="button"
                  disabled={page.last || isLoading}
                  onClick={() => void load(currentPage + 1)}
                  className="rounded-full border border-[color:var(--border-soft)] bg-white px-4 py-2 text-xs font-semibold text-[color:var(--ink)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Siguiente
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
});
