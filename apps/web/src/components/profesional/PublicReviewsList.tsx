import { memo, useCallback, useEffect, useState } from 'react';
import { getPublicProfessionalReviews } from '@/services/publicReviews';
import type { BookingReviewPage, BookingReviewResponse } from '@/types/review';

type Props = {
  slug: string;
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

const buildVisibleDistribution = (reviews: BookingReviewResponse[]) =>
  [5, 4, 3, 2, 1].map((stars) => {
    const count = reviews.filter((review) => review.rating === stars).length;
    const percentage = reviews.length > 0 ? Math.round((count / reviews.length) * 100) : 0;
    return { count, percentage, stars };
  });

export default memo(function PublicReviewsList({ slug, rating, reviewsCount }: Props) {
  const [page, setPage] = useState<BookingReviewPage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);

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

  if (isLoading && !page) {
    return (
      <section>
        <p className="text-sm text-[#64748B]">Cargando reseñas...</p>
      </section>
    );
  }

  if (loadError && !page) {
    return (
      <section>
        <div className="rounded-[18px] border border-[#FECACA] bg-[#FEF2F2] p-4">
          <p className="text-sm font-semibold text-[#991B1B]">No pudimos cargar las reseñas</p>
          <p className="mt-1 text-sm text-[#B91C1C]">{loadError}</p>
        </div>
      </section>
    );
  }

  if (!page || page.empty) return null;

  const visibleDistribution = buildVisibleDistribution(page.content);
  const hasGlobalRating = typeof rating === 'number' && Number.isFinite(rating);
  const totalReviews = typeof reviewsCount === 'number' ? reviewsCount : page.totalElements;
  const usesVisibleSample = page.content.length < page.totalElements;

  return (
    <section>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.32em] text-[color:var(--ink-faint)]">
            Reseñas
          </p>
          <h2 className="mt-2 text-3xl font-semibold text-[color:var(--ink)]">
            Lo que dicen los clientes
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[color:var(--ink-muted)]">
            Opiniones publicas reales sobre la experiencia de reserva y atencion.
          </p>
        </div>
      </div>

      {loadError ? (
        <div className="mt-4 rounded-[18px] border border-[#FDE68A] bg-[#FFFBEB] p-4">
          <p className="text-sm text-[#92400E]">
            Algunas acciones pueden estar desactualizadas porque hubo un problema al recargar.
          </p>
        </div>
      ) : null}

      <div className="mt-5 grid gap-5 xl:grid-cols-[300px,minmax(0,1fr)]">
        <div className="rounded-[22px] border border-[color:var(--border-soft)] bg-[color:var(--surface-soft)] p-5">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-[color:var(--ink-faint)]">
            Resumen
          </p>
          <div className="mt-4 flex items-end gap-3">
            <p className="text-5xl font-semibold tracking-[-0.05em] text-[color:var(--ink)]">
              {hasGlobalRating ? rating.toFixed(1) : '--'}
            </p>
            <div className="pb-1">
              <p className="text-sm font-semibold text-[color:var(--ink)]">sobre 5</p>
              <p className="text-sm text-[color:var(--ink-muted)]">
                {totalReviews} {totalReviews === 1 ? 'reseña publica' : 'reseñas publicas'}
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {visibleDistribution.map((row) => (
              <div key={row.stars} className="grid grid-cols-[24px,1fr,32px] items-center gap-3">
                <span className="text-sm font-semibold text-[color:var(--ink)]">{row.stars}</span>
                <div className="h-2.5 overflow-hidden rounded-full bg-white">
                  <div
                    className="h-full rounded-full bg-[color:var(--primary)]"
                    style={{ width: `${row.percentage}%` }}
                  />
                </div>
                <span className="text-right text-sm text-[color:var(--ink-muted)]">
                  {row.count}
                </span>
              </div>
            ))}
          </div>

          <p className="mt-5 text-xs leading-5 text-[color:var(--ink-faint)]">
            {usesVisibleSample
              ? 'La distribucion se calcula sobre las reseñas visibles cargadas en esta pagina.'
              : 'La distribucion corresponde a las reseñas publicas cargadas actualmente.'}
          </p>
        </div>

        <div className="space-y-4">
          {page.content.map((review: BookingReviewResponse) => (
            <article
              key={review.id}
              className="rounded-[20px] border border-[color:var(--border-soft)] bg-white p-5"
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
                  El texto de esta reseña no esta visible publicamente.
                </p>
              ) : review.text ? (
                <p className="mt-4 text-sm leading-7 text-[color:var(--ink-muted)]">{review.text}</p>
              ) : (
                <p className="mt-4 text-xs italic text-[color:var(--ink-faint)]">
                  Sin comentario, solo calificacion.
                </p>
              )}
            </article>
          ))}
        </div>
      </div>

      {page.totalPages > 1 ? (
        <div className="mt-6 flex items-center justify-center gap-3">
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
    </section>
  );
});
