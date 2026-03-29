import { useEffect, useState } from 'react';
import {
  getPublicAppFeedback,
  type PublicAppFeedbackItem,
} from '@/services/appFeedback';

const ROLE_LABELS: Record<string, string> = {
  CLIENT: 'Cliente',
  PROFESSIONAL: 'Profesional',
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

const initialsFromName = (name: string | null) => {
  if (!name) return 'P';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'P';
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

const Stars = ({ rating }: { rating: number }) => (
  <div className="text-sm">
    <span className="text-[#F59E0B]">{'★'.repeat(Math.max(0, Math.min(5, rating)))}</span>
    <span className="text-[#CBD5E1]">{'★'.repeat(Math.max(0, 5 - Math.min(5, rating)))}</span>
  </div>
);

export default function ReviewsSection() {
  const [reviews, setReviews] = useState<PublicAppFeedbackItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasResolved, setHasResolved] = useState(false);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        setIsLoading(true);
        const result = await getPublicAppFeedback(6);
        if (!active) return;
        setReviews(result.filter((item) => item.text && item.publicVisible));
      } catch {
        if (!active) return;
        setReviews([]);
      } finally {
        if (active) {
          setIsLoading(false);
          setHasResolved(true);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, []);

  if ((hasResolved || !isLoading) && reviews.length === 0) {
    return null;
  }

  return (
    <section className="px-4">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <div className="space-y-2">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.3em] text-[color:var(--ink-faint)]">
            Opiniones sobre Plura
          </p>
          <h2 className="text-2xl font-semibold text-[color:var(--ink)] sm:text-[2rem]">
            Confianza basada en experiencia real
          </h2>
          <p className="max-w-2xl text-sm text-[color:var(--ink-muted)] sm:text-base">
            Comentarios breves de clientes y profesionales que ya usan Plura.
          </p>
        </div>

        {isLoading && reviews.length === 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <article
                key={index}
                className="rounded-[26px] border border-[color:var(--border-soft)] bg-white/92 p-5 shadow-[var(--shadow-card)]"
              >
                <div className="animate-pulse space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-2xl bg-slate-200" />
                    <div className="space-y-2">
                      <div className="h-4 w-28 rounded-full bg-slate-200" />
                      <div className="h-3 w-20 rounded-full bg-slate-100" />
                    </div>
                  </div>
                  <div className="h-4 w-24 rounded-full bg-slate-100" />
                  <div className="space-y-2">
                    <div className="h-3 w-full rounded-full bg-slate-100" />
                    <div className="h-3 w-5/6 rounded-full bg-slate-100" />
                    <div className="h-3 w-4/6 rounded-full bg-slate-100" />
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : null}

        {reviews.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {reviews.map((review) => (
              <article
                key={review.id}
                className="rounded-[26px] border border-[color:var(--border-soft)] bg-white/94 p-5 shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[color:var(--surface-soft)] text-sm font-semibold text-[color:var(--ink)]">
                      {initialsFromName(review.authorDisplayName)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[color:var(--ink)]">
                        {review.authorDisplayName || 'Usuario Plura'}
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <Stars rating={review.rating} />
                        <span className="text-xs font-medium text-[color:var(--ink-muted)]">
                          {review.rating.toFixed(1)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <span className="rounded-full border border-[color:var(--border-soft)] bg-[color:var(--surface-soft)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--ink-muted)]">
                    {ROLE_LABELS[review.authorRole || ''] || 'Usuario'}
                  </span>
                </div>

                <p className="mt-4 line-clamp-4 text-sm leading-6 text-[color:var(--ink-muted)]">
                  {review.text}
                </p>

                <div className="mt-4 flex items-center justify-between gap-3 text-xs text-[color:var(--ink-faint)]">
                  <span>{review.category ? review.category.replaceAll('_', ' ') : 'Experiencia general'}</span>
                  <span>{formatDate(review.createdAt)}</span>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
