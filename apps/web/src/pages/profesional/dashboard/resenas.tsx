'use client';

import { useCallback, useEffect, useState } from 'react';
import ProfesionalSidebar from '@/components/profesional/Sidebar';
import Button from '@/components/ui/Button';
import { DashboardHero } from '@/components/profesional/dashboard/DashboardUI';
import { useProfessionalProfile } from '@/hooks/useProfessionalProfile';
import {
  getProfessionalReviews,
  hideReviewText,
  showReviewText,
} from '@/services/professionalReviews';
import type { BookingReviewPage, BookingReviewResponse } from '@/types/review';

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
  <span className="text-sm">
    <span className="text-[#F59E0B]">{'★'.repeat(rating)}</span>
    <span className="text-[#CBD5E1]">{'★'.repeat(5 - rating)}</span>
  </span>
);

export default function ProfesionalResenasPage() {
  const { profile } = useProfessionalProfile();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [page, setPage] = useState<BookingReviewPage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const load = useCallback(async (pageNum: number) => {
    setIsLoading(true);
    try {
      const result = await getProfessionalReviews(pageNum, 10);
      setPage(result);
      setCurrentPage(pageNum);
    } catch {
      // silent
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(0);
  }, [load]);

  const handleHide = async (reviewId: number) => {
    setActionLoading(reviewId);
    try {
      await hideReviewText(reviewId);
      await load(currentPage);
    } catch {
      // silent
    } finally {
      setActionLoading(null);
    }
  };

  const handleShow = async (reviewId: number) => {
    setActionLoading(reviewId);
    try {
      await showReviewText(reviewId);
      await load(currentPage);
    } catch {
      // silent
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="app-shell min-h-screen bg-[color:var(--background)] text-[color:var(--ink)]">
      <div className="flex min-h-screen">
        <aside className="hidden w-[260px] shrink-0 border-r border-[color:var(--border-soft)] bg-[color:var(--sidebar-surface)] lg:block">
          <div className="sticky top-0 h-screen overflow-y-auto">
            <ProfesionalSidebar profile={profile} active="Reseñas" />
          </div>
        </aside>

        <div className="flex-1">
          <div className="px-4 pt-4 sm:px-6 lg:hidden">
            <Button type="button" size="sm" onClick={() => setIsMenuOpen((prev) => !prev)}>
              {isMenuOpen ? 'Cerrar menu' : 'Abrir menu'}
            </Button>
          </div>

          {isMenuOpen ? (
            <div className="border-b border-[color:var(--border-soft)] bg-[color:var(--surface)]/92 backdrop-blur-xl lg:hidden">
              <ProfesionalSidebar profile={profile} active="Reseñas" />
            </div>
          ) : null}

          <main className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
            <div className="space-y-6">
              <DashboardHero
                eyebrow="Reseñas"
                icon="resenas"
                accent="ink"
                title="Reseñas de clientes"
                description="Gestioná las reseñas que dejan tus clientes. Podés ocultar el texto de una reseña, pero la calificación numérica siempre es visible."
              />

              {profile ? (
                <div className="flex gap-4">
                  <div className="rounded-[18px] border border-[#E2E7EC] bg-white px-5 py-4">
                    <p className="text-xs uppercase tracking-[0.25em] text-[#94A3B8]">Calificación</p>
                    <p className="mt-1 text-2xl font-semibold text-[#0E2A47]">
                      ★ {profile.rating?.toFixed(1) ?? '0.0'}
                    </p>
                  </div>
                  <div className="rounded-[18px] border border-[#E2E7EC] bg-white px-5 py-4">
                    <p className="text-xs uppercase tracking-[0.25em] text-[#94A3B8]">Total reseñas</p>
                    <p className="mt-1 text-2xl font-semibold text-[#0E2A47]">
                      {profile.reviewsCount ?? 0}
                    </p>
                  </div>
                </div>
              ) : null}

              {isLoading && !page ? (
                <p className="text-sm text-[#64748B]">Cargando reseñas...</p>
              ) : !page || page.empty ? (
                <div className="rounded-[18px] border border-dashed border-[#E2E7EC] bg-[#F8FAFC] px-6 py-10 text-center text-sm text-[#64748B]">
                  Todavía no tenés reseñas de clientes.
                </div>
              ) : (
                <div className="space-y-4">
                  {page.content.map((review: BookingReviewResponse) => (
                    <div
                      key={review.id}
                      className="rounded-[18px] border border-[#E2E7EC] bg-white p-5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--brand-cyan),var(--brand-navy))] text-sm font-semibold text-white">
                            {review.authorDisplayName?.charAt(0)?.toUpperCase() ?? '?'}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-[#0E2A47]">
                              {review.authorDisplayName}
                            </p>
                            <div className="flex items-center gap-2">
                              <StarDisplay rating={review.rating} />
                              <span className="text-xs text-[#94A3B8]">
                                {formatDate(review.createdAt)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {review.text ? (
                          <button
                            type="button"
                            disabled={actionLoading === review.id}
                            onClick={() =>
                              review.textHiddenByProfessional
                                ? handleShow(review.id)
                                : handleHide(review.id)
                            }
                            className="shrink-0 rounded-full border border-[#E2E7EC] px-3 py-1.5 text-xs font-semibold text-[#475569] transition hover:-translate-y-0.5 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {actionLoading === review.id
                              ? 'Guardando...'
                              : review.textHiddenByProfessional
                                ? 'Mostrar texto'
                                : 'Ocultar texto'}
                          </button>
                        ) : null}
                      </div>

                      {review.text ? (
                        <div className="mt-3">
                          {review.textHiddenByProfessional ? (
                            <div className="rounded-[12px] border border-dashed border-[#FDE68A] bg-[#FFFBEB] px-3 py-2">
                              <p className="text-xs font-semibold text-[#92400E]">Texto oculto públicamente</p>
                              <p className="mt-1 text-sm text-[#475569]">{review.text}</p>
                            </div>
                          ) : (
                            <p className="text-sm text-[#475569]">{review.text}</p>
                          )}
                        </div>
                      ) : (
                        <p className="mt-3 text-xs italic text-[#94A3B8]">Sin texto, solo calificación.</p>
                      )}
                    </div>
                  ))}

                  {page.totalPages > 1 ? (
                    <div className="flex items-center justify-center gap-3 pt-2">
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
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
