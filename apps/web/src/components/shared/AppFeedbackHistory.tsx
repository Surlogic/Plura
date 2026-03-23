import { useCallback, useEffect, useState } from 'react';
import type { AppFeedbackPage, AppFeedbackResponse } from '@/types/appFeedback';

type Props = {
  fetchFeedback: (page: number, size: number) => Promise<AppFeedbackPage>;
};

const CATEGORY_LABELS: Record<string, string> = {
  UX: 'Experiencia de uso',
  BUG: 'Error o bug',
  PAYMENTS: 'Pagos',
  BOOKING: 'Reservas',
  DISCOVERY: 'Busqueda',
  OTHER: 'Otro',
};

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

const StarDisplay = ({ rating }: { rating: number }) => (
  <span className="text-sm text-[#F59E0B]">
    {'★'.repeat(rating)}
    <span className="text-[#CBD5E1]">{'★'.repeat(5 - rating)}</span>
  </span>
);

export default function AppFeedbackHistory({ fetchFeedback }: Props) {
  const [page, setPage] = useState<AppFeedbackPage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);

  const load = useCallback(
    async (pageNum: number) => {
      setIsLoading(true);
      try {
        const result = await fetchFeedback(pageNum, 5);
        setPage(result);
        setCurrentPage(pageNum);
      } catch {
        // silent
      } finally {
        setIsLoading(false);
      }
    },
    [fetchFeedback],
  );

  useEffect(() => {
    void load(0);
  }, [load]);

  if (isLoading && !page) {
    return <p className="text-sm text-[color:var(--ink-muted)]">Cargando historial...</p>;
  }

  if (!page || page.empty) {
    return (
      <p className="text-sm text-[color:var(--ink-muted)]">
        Todavia no enviaste feedback.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {page.content.map((item: AppFeedbackResponse) => (
        <div
          key={item.id}
          className="rounded-[14px] border border-[color:var(--border-soft)] bg-[color:var(--surface-strong)] px-4 py-3"
        >
          <div className="flex items-center justify-between gap-3">
            <StarDisplay rating={item.rating} />
            <span className="text-xs text-[color:var(--ink-faint)]">
              {formatDate(item.createdAt)}
            </span>
          </div>
          {item.category ? (
            <span className="mt-1 inline-block rounded-full bg-[color:var(--surface-soft)] px-2 py-0.5 text-[0.65rem] font-semibold text-[color:var(--ink-muted)]">
              {CATEGORY_LABELS[item.category] ?? item.category}
            </span>
          ) : null}
          {item.text ? (
            <p className="mt-2 text-sm text-[color:var(--ink)]">{item.text}</p>
          ) : null}
        </div>
      ))}

      {page.totalPages > 1 ? (
        <div className="flex items-center justify-center gap-3 pt-1">
          <button
            type="button"
            disabled={page.first || isLoading}
            onClick={() => load(currentPage - 1)}
            className="rounded-full border border-[color:var(--border-soft)] px-3 py-1.5 text-xs font-semibold text-[color:var(--ink-muted)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Anterior
          </button>
          <span className="text-xs text-[color:var(--ink-faint)]">
            {currentPage + 1} / {page.totalPages}
          </span>
          <button
            type="button"
            disabled={page.last || isLoading}
            onClick={() => load(currentPage + 1)}
            className="rounded-full border border-[color:var(--border-soft)] px-3 py-1.5 text-xs font-semibold text-[color:var(--ink-muted)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Siguiente
          </button>
        </div>
      ) : null}
    </div>
  );
}
