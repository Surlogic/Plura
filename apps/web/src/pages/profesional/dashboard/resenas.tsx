'use client';

import { useCallback, useEffect, useState } from 'react';
import Button from '@/components/ui/Button';
import ProfessionalDashboardShell from '@/components/profesional/dashboard/ProfessionalDashboardShell';
import {
  DashboardHeaderBadge,
  DashboardHero,
  DashboardStatCard,
} from '@/components/profesional/dashboard/DashboardUI';
import { useProfessionalProfile } from '@/hooks/useProfessionalProfile';
import {
  getProfessionalReviews,
  hideReviewText,
  reportProfessionalReview,
  showReviewText,
} from '@/services/professionalReviews';
import type {
  BookingReviewPage,
  BookingReviewResponse,
  ReviewReportReason,
} from '@/types/review';

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
  const { profile, refreshProfile } = useProfessionalProfile();
  const [page, setPage] = useState<BookingReviewPage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [reportingReviewId, setReportingReviewId] = useState<number | null>(null);
  const [reportReason, setReportReason] = useState<ReviewReportReason>('SPAM');
  const [reportNote, setReportNote] = useState('');

  const load = useCallback(async (pageNum: number, isActive?: () => boolean) => {
    setIsLoading(true);
    setPageError(null);

    try {
      const result = await getProfessionalReviews(pageNum, 10);
      if (isActive && !isActive()) return;
      setPage(result);
      setCurrentPage(pageNum);
    } catch (error) {
      if (isActive && !isActive()) return;
      const message =
        error instanceof Error ? error.message : 'No pudimos cargar las reseñas.';
      setPageError(message);
    } finally {
      if (!isActive || isActive()) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    let active = true;
    void load(0, () => active);
    return () => {
      active = false;
    };
  }, [load]);

  const reloadReviewsAndProfile = useCallback(async () => {
    await Promise.all([load(currentPage), refreshProfile()]);
  }, [currentPage, load, refreshProfile]);

  const handleHide = async (reviewId: number) => {
    setActionLoading(reviewId);
    setActionError(null);
    setActionSuccess(null);

    try {
      await hideReviewText(reviewId);
      await reloadReviewsAndProfile();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'No pudimos ocultar el texto de la reseña.';
      setActionError(message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleShow = async (reviewId: number) => {
    setActionLoading(reviewId);
    setActionError(null);
    setActionSuccess(null);

    try {
      await showReviewText(reviewId);
      await reloadReviewsAndProfile();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'No pudimos volver a mostrar el texto de la reseña.';
      setActionError(message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReport = async (reviewId: number) => {
    setActionLoading(reviewId);
    setActionError(null);
    setActionSuccess(null);

    try {
      await reportProfessionalReview(reviewId, {
        reason: reportReason,
        note: reportNote.trim() || null,
      });
      setReportingReviewId(null);
      setReportReason('SPAM');
      setReportNote('');
      setActionSuccess('Reporte enviado a internal ops.');
      await reloadReviewsAndProfile();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'No pudimos reportar la reseña.';
      setActionError(message);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <ProfessionalDashboardShell profile={profile} active="Reseñas">
      <div className="space-y-6">
              <DashboardHero
                eyebrow="Reseñas"
                icon="resenas"
                accent="ink"
                title="Reseñas de clientes"
                description="Gestioná visibilidad pública y reportes sin perder de vista el estado reputacional del negocio."
                meta={(
                  <>
                    <DashboardHeaderBadge tone="accent">
                      ★ {profile?.rating?.toFixed(1) ?? '0.0'}
                    </DashboardHeaderBadge>
                    <DashboardHeaderBadge tone="success">
                      {profile?.reviewsCount ?? 0} reseñas
                    </DashboardHeaderBadge>
                  </>
                )}
              />

              {profile ? (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  <DashboardStatCard
                    label="Calificación"
                    value={`★ ${profile.rating?.toFixed(1) ?? '0.0'}`}
                    detail="Promedio visible del negocio"
                    icon="resenas"
                    tone="accent"
                  />
                  <DashboardStatCard
                    label="Total reseñas"
                    value={`${profile.reviewsCount ?? 0}`}
                    detail="Historial acumulado"
                    icon="check"
                  />
                </div>
              ) : null}

              {pageError ? (
                <div className="rounded-[18px] border border-[#FECACA] bg-[#FEF2F2] px-4 py-3">
                  <p className="text-sm font-semibold text-[#991B1B]">No pudimos cargar las reseñas</p>
                  <p className="mt-1 text-sm text-[#B91C1C]">{pageError}</p>
                </div>
              ) : null}

              {actionError ? (
                <div className="rounded-[18px] border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3">
                  <p className="text-sm text-[#92400E]">{actionError}</p>
                </div>
              ) : null}

              {actionSuccess ? (
                <div className="rounded-[18px] border border-[#BFEDE7] bg-[#F0FDFA] px-4 py-3">
                  <p className="text-sm text-[#0F766E]">{actionSuccess}</p>
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
                  {page.content.map((review: BookingReviewResponse) => {
                    const isReportingThisReview = reportingReviewId === review.id;
                    return (
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

                        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                          {review.reportedByProfessional ? (
                            <span className="rounded-full bg-[#EFF6FF] px-3 py-1.5 text-xs font-semibold text-[#1D4ED8]">
                              Reportada
                            </span>
                          ) : null}

                          {review.text ? (
                            <button
                              type="button"
                              disabled={actionLoading === review.id}
                              onClick={() =>
                                review.textHiddenByProfessional
                                  ? void handleShow(review.id)
                                  : void handleHide(review.id)
                              }
                              className="rounded-full border border-[#E2E7EC] px-3 py-1.5 text-xs font-semibold text-[#475569] transition hover:-translate-y-0.5 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {actionLoading === review.id
                                ? 'Guardando...'
                                : review.textHiddenByProfessional
                                  ? 'Mostrar texto'
                                  : 'Ocultar texto'}
                            </button>
                          ) : null}

                          {!review.reportedByProfessional ? (
                            <button
                              type="button"
                              disabled={actionLoading === review.id}
                              onClick={() => {
                                setActionError(null);
                                setActionSuccess(null);
                                setReportingReviewId((current) =>
                                  current === review.id ? null : review.id,
                                );
                                setReportReason('SPAM');
                                setReportNote('');
                              }}
                              className="rounded-full border border-[#DBEAFE] bg-white px-3 py-1.5 text-xs font-semibold text-[#1D4ED8] transition hover:-translate-y-0.5 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {isReportingThisReview ? 'Cancelar reporte' : 'Reportar reseña'}
                            </button>
                          ) : null}
                        </div>
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

                      {isReportingThisReview ? (
                        <div className="mt-4 rounded-[14px] border border-[#DBEAFE] bg-[#F8FBFF] p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#64748B]">
                            Reportar reseña
                          </p>
                          <p className="mt-1 text-sm text-[#475569]">
                            Internal ops revisará el reporte. Reportar no elimina ni oculta automáticamente la reseña.
                          </p>

                          <label className="mt-3 block text-xs font-semibold uppercase tracking-[0.2em] text-[#64748B]">
                            Motivo
                            <select
                              value={reportReason}
                              onChange={(event) => setReportReason(event.target.value as ReviewReportReason)}
                              className="mt-1.5 w-full rounded-[12px] border border-[#D9E2EC] bg-white px-3 py-2 text-sm text-[#0E2A47] outline-none transition focus:border-[#1FB6A6]"
                            >
                              <option value="SPAM">Spam o promoción engañosa</option>
                              <option value="OFFENSIVE">Contenido ofensivo</option>
                              <option value="FALSE_INFORMATION">Información falsa</option>
                              <option value="HARASSMENT">Acoso o maltrato</option>
                              <option value="OTHER">Otro</option>
                            </select>
                          </label>

                          <label className="mt-3 block text-xs font-semibold uppercase tracking-[0.2em] text-[#64748B]">
                            Nota opcional
                            <textarea
                              value={reportNote}
                              onChange={(event) => setReportNote(event.target.value)}
                              maxLength={1000}
                              className="mt-1.5 min-h-24 w-full rounded-[12px] border border-[#D9E2EC] bg-white px-3 py-2 text-sm text-[#0E2A47] outline-none transition focus:border-[#1FB6A6]"
                              placeholder="Explicá brevemente por qué reportás esta reseña."
                            />
                          </label>

                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              type="button"
                              disabled={actionLoading === review.id}
                              onClick={() => void handleReport(review.id)}
                              className="rounded-full bg-[#0B1D2A] px-4 py-2 text-xs font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {actionLoading === review.id ? 'Enviando...' : 'Enviar reporte'}
                            </button>
                            <button
                              type="button"
                              disabled={actionLoading === review.id}
                              onClick={() => setReportingReviewId(null)}
                              className="rounded-full border border-[#E2E7EC] bg-white px-4 py-2 text-xs font-semibold text-[#475569]"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                    );
                  })}

                  {page.totalPages > 1 ? (
                    <div className="flex items-center justify-center gap-3 pt-2">
                      <button
                        type="button"
                        disabled={page.first || isLoading}
                        onClick={() => void load(currentPage - 1)}
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
                        onClick={() => void load(currentPage + 1)}
                        className="rounded-full border border-[#E2E7EC] px-4 py-2 text-xs font-semibold text-[#475569] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Siguiente
                      </button>
                    </div>
                  ) : null}
                </div>
              )}
      </div>
    </ProfessionalDashboardShell>
  );
}
