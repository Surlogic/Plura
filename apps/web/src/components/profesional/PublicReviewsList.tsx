import { memo, useCallback, useEffect, useState } from 'react';
import { getPublicProfessionalReviews } from '@/services/publicReviews';
import type { BookingReviewPage, BookingReviewResponse } from '@/types/review';

type Props = {
  slug: string;
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

export default memo(function PublicReviewsList({ slug }: Props) {
  const [page, setPage] = useState<BookingReviewPage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);

  const load = useCallback(async (pageNum: number) => {
    setIsLoading(true);
    try {
      const result = await getPublicProfessionalReviews(slug, pageNum, 10);
      setPage(result);
      setCurrentPage(pageNum);
    } catch {
      // silent
    } finally {
      setIsLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    void load(0);
  }, [load]);

  if (isLoading && !page) return null;
  if (!page || page.empty) return null;

  return (
    <section className="mt-10 border-t border-[#E6EBF0] pt-10">
      <p className="text-[0.65rem] uppercase tracking-[0.35em] text-[#94A3B8]">Reseñas</p>
      <h2 className="mt-2 text-2xl font-semibold">Lo que dicen los clientes</h2>

      <div className="mt-6 space-y-4">
        {page.content.map((review: BookingReviewResponse) => (
          <div
            key={review.id}
            className="rounded-[18px] border border-[#E2E7EC] bg-white p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--brand-cyan),var(--brand-navy))] text-xs font-semibold text-white">
                  {review.authorDisplayName?.charAt(0)?.toUpperCase() ?? '?'}
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#0E2A47]">{review.authorDisplayName}</p>
                  <StarDisplay rating={review.rating} />
                </div>
              </div>
              <p className="text-xs text-[#94A3B8]">{formatDate(review.createdAt)}</p>
            </div>
            {review.textHiddenByProfessional ? (
              <p className="mt-3 text-sm italic text-[#94A3B8]">
                Texto oculto por el profesional.
              </p>
            ) : review.text ? (
              <p className="mt-3 text-sm text-[#475569]">{review.text}</p>
            ) : null}
          </div>
        ))}
      </div>

      {page.totalPages > 1 ? (
        <div className="mt-4 flex items-center justify-center gap-3">
          <button
            type="button"
            disabled={page.first || isLoading}
            onClick={() => load(currentPage - 1)}
            className="rounded-full border border-[#E2E7EC] px-4 py-2 text-xs font-semibold text-[#475569] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Anterior
          </button>
          <span className="text-xs text-[#64748B]">
            {currentPage + 1} / {page.totalPages}
          </span>
          <button
            type="button"
            disabled={page.last || isLoading}
            onClick={() => load(currentPage + 1)}
            className="rounded-full border border-[#E2E7EC] px-4 py-2 text-xs font-semibold text-[#475569] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Siguiente
          </button>
        </div>
      ) : null}
    </section>
  );
});
