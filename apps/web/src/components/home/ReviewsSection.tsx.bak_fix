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
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);
        const result = await getPublicAppFeedback(6);
        if (!active) return;
        setReviews(result.filter((item) => item.text && item.publicVisible));
      } catch (error) {
        if (!active) return;
        const message = error instanceof Error ? error.message : 'No pudimos cargar las reseñas.';
        setLoadError(message);
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, []);

  if (!isLoading && reviews.length === 0 && !loadError) {
    return null;
  }

  return (
    <section className="px-4">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[color:var(--ink-muted)]">
            Opiniones sobre Plura
          </p>
          <h2 className="text-2xl font-semibold text-[color:var(--ink)]">Lo que dicen quienes usan la app</h2>
          <p className="max-w-2xl text-sm text-[color:var(--ink-muted)]">
            Testimonios reales de clientes y profesionales que ya usan Plura en su día a día.
          </p>
        </div>

        {loadError ? (
          <div className="rounded-[24px] border border-[#FDE68A] bg-[#FFFBEB] p-5 text-sm text-[#92400E]">
            {loadError}
          </div>
        ) : null}

        {isLoading && reviews.length === 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((item) => (
              <div
                key={item}
                className="rounded-[24px] border border-[color:var(--border-soft)] bg-[color:var(--surface-strong)] p-5 shadow-[var(--shadow-card)]"
              >
                <div className="animate-pulse space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-[color:var(--border-soft)]" />
                    <div className="space-y-2">
                      <div className="h-3 w-28 rounded bg-[color:var(--border-soft)]" />
                      <div className="h-3 w-20 rounded bg-[color:var(--border-soft)]" />
                    </div>
                  </div>
                  <div className="h-3 w-full rounded bg-[color:var(--border-soft)]" />
                  <div className="h-3 w-5/6 rounded bg-[color:var(--border-soft)]" />
                  <div className="h-3 w-2/3 rounded bg-[color:var(--border-soft)]" />
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {reviews.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {reviews.map((review) => (
              <div
                key={review.id}
                className="rounded-[24px] border border-[color:var(--border-soft)] bg-[color:var(--surface-strong)] p-5 shadow-[var(--shadow-card)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--brand-cyan),var(--brand-navy))] text-sm font-semibold text-white">
                      {initialsFromName(review.authorDisplayName)}
                    </div>
                    <div>
                      <p className="font-semibold text-[color:var(--ink)]">
                        {review.authorDisplayName || 'Usuario Plura'}
                      </p>
                      <div className="flex items-center gap-2">
                        <Stars rating={review.rating} />
                        <span className="text-xs font-medium text-[color:var(--ink-muted)]">
                          {review.rating.toFixed(1)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <span className="rounded-full bg-[color:var(--surface-subtle)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--ink-muted)]">
                    {ROLE_LABELS[review.authorRole || ''] || 'Usuario'}
                  </span>
                </div>

                <p className="mt-4 text-sm leading-6 text-[color:var(--ink-muted)]">
                  {review.text}
                </p>

                <div className="mt-4 flex items-center justify-between gap-3 text-xs text-[color:var(--ink-muted)]">
                  <span>{review.category ? review.category.replaceAll('_', ' ') : 'Experiencia general'}</span>
                  <span>{formatDate(review.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
