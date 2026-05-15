import { useCallback, useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import {
  fetchFeedbackList,
  fetchFeedbackAnalytics,
  archiveFeedback,
  unarchiveFeedback,
} from '@/services/internalOps';
import type {
  InternalFeedbackListItem,
  InternalFeedbackListPage,
  InternalFeedbackAnalytics,
} from '@/services/internalOps';

const CATEGORY_LABELS: Record<string, string> = {
  UX: 'Experiencia de uso',
  BUG: 'Error o bug',
  PAYMENTS: 'Pagos',
  BOOKING: 'Reservas',
  DISCOVERY: 'Busqueda',
  OTHER: 'Otro',
};

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

const selectClass =
  'h-9 rounded-[10px] border border-[#D9E2EC] bg-white px-2 text-xs text-[#0E2A47] focus:border-[#1FB6A6] focus:outline-none';
const inputClass =
  'h-9 rounded-[10px] border border-[#D9E2EC] bg-white px-2 text-xs text-[#0E2A47] focus:border-[#1FB6A6] focus:outline-none';

function Pagination({
  page,
  isLoading,
  onPageChange,
}: {
  page: { totalPages: number; number: number; first: boolean; last: boolean };
  isLoading: boolean;
  onPageChange: (p: number) => void;
}) {
  if (page.totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-3 pt-2">
      <button
        type="button"
        disabled={page.first || isLoading}
        onClick={() => onPageChange(page.number - 1)}
        className="rounded-full border border-[#E2E7EC] px-4 py-2 text-xs font-semibold text-[#475569] disabled:opacity-40"
      >
        Anterior
      </button>
      <span className="text-xs text-[#64748B]">
        {page.number + 1} / {page.totalPages}
      </span>
      <button
        type="button"
        disabled={page.last || isLoading}
        onClick={() => onPageChange(page.number + 1)}
        className="rounded-full border border-[#E2E7EC] px-4 py-2 text-xs font-semibold text-[#475569] disabled:opacity-40"
      >
        Siguiente
      </button>
    </div>
  );
}

function OpsConfig({ onConfigured }: { onConfigured: () => void }) {
  const [apiUrl, setApiUrl] = useState(() =>
    typeof window !== 'undefined' ? localStorage.getItem('plura_ops_api_url') || '' : '',
  );
  const [token, setToken] = useState(() =>
    typeof window !== 'undefined' ? localStorage.getItem('plura_ops_token') || '' : '',
  );

  return (
    <div className="mx-auto max-w-md space-y-4 rounded-[20px] border border-[#E2E7EC] bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-[#0E2A47]">Configuracion de acceso</h2>
      <div>
        <label className="text-xs font-semibold text-[#64748B]">URL base API</label>
        <input
          type="text"
          value={apiUrl}
          onChange={(e) => setApiUrl(e.target.value)}
          placeholder="http://localhost:3000"
          className="mt-1 w-full rounded-[12px] border border-[#D9E2EC] px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="text-xs font-semibold text-[#64748B]">X-Internal-Token</label>
        <input
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Token interno"
          className="mt-1 w-full rounded-[12px] border border-[#D9E2EC] px-3 py-2 text-sm"
        />
      </div>
      <button
        type="button"
        onClick={() => {
          localStorage.setItem('plura_ops_api_url', apiUrl.trim());
          localStorage.setItem('plura_ops_token', token.trim());
          onConfigured();
        }}
        disabled={!apiUrl.trim() || !token.trim()}
        className="w-full rounded-full bg-[#0B1D2A] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
      >
        Conectar
      </button>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-[16px] border border-[#E2E7EC] bg-white px-4 py-3">
      <p className="text-[0.6rem] uppercase tracking-[0.25em] text-[#94A3B8]">{label}</p>
      <p className="mt-1 text-xl font-semibold text-[#0E2A47]">{value}</p>
    </div>
  );
}

export default function InternalFeedbackPage() {
  const [configured, setConfigured] = useState(false);
  const [page, setPage] = useState<InternalFeedbackListPage | null>(null);
  const [analytics, setAnalytics] = useState<InternalFeedbackAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [filterRole, setFilterRole] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterRating, setFilterRating] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const url = localStorage.getItem('plura_ops_api_url');
      const token = localStorage.getItem('plura_ops_token');
      if (url && token) setConfigured(true);
    }
  }, []);

  const load = useCallback(async (pageNum: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const [listResult, analyticsResult] = await Promise.all([
        fetchFeedbackList({
          page: pageNum,
          size: 20,
          authorRole: filterRole || undefined,
          category: filterCategory || undefined,
          rating: filterRating || undefined,
          status: filterStatus || undefined,
          from: filterFrom || undefined,
          to: filterTo || undefined,
        }),
        fetchFeedbackAnalytics(filterFrom || undefined, filterTo || undefined),
      ]);
      setPage(listResult);
      setAnalytics(analyticsResult);
      setCurrentPage(pageNum);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar datos.');
    } finally {
      setIsLoading(false);
    }
  }, [filterRole, filterCategory, filterRating, filterStatus, filterFrom, filterTo]);

  useEffect(() => {
    if (!configured) return;
    void load(0);
  }, [configured, load]);

  const handleArchiveToggle = async (id: number, currentStatus: string) => {
    try {
      if (currentStatus === 'ARCHIVED') {
        await unarchiveFeedback(id);
      } else {
        await archiveFeedback(id);
      }
      await load(currentPage);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al actualizar.');
    }
  };

  return (
    <>
      <Head>
        <title>Feedback app | Plura Ops</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>
      <div className="min-h-screen bg-[color:var(--background)] px-4 py-8">
        <div className="mx-auto max-w-5xl space-y-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold text-[#0E2A47]">Feedback de app</h1>
              <p className="text-sm text-[#64748B]">
                Panel interno exclusivo para feedback sobre el producto.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/internal/ops/reviews"
                className="rounded-full border border-[#E2E7EC] bg-white px-4 py-2 text-xs font-semibold text-[#475569] transition hover:-translate-y-0.5 hover:shadow-sm"
              >
                Ir a reseñas
              </Link>
              {configured ? (
                <button
                  type="button"
                  onClick={() => {
                    localStorage.removeItem('plura_ops_api_url');
                    localStorage.removeItem('plura_ops_token');
                    setConfigured(false);
                  }}
                  className="text-xs font-semibold text-[#94A3B8] underline"
                >
                  Cambiar conexion
                </button>
              ) : null}
            </div>
          </div>

          {!configured ? (
            <OpsConfig onConfigured={() => setConfigured(true)} />
          ) : (
            <div className="space-y-5">
              {error ? (
                <div className="rounded-[14px] border border-[#FECACA] bg-[#FFF5F5] px-4 py-3 text-sm text-[#B91C1C]">
                  {error}
                </div>
              ) : null}

              {analytics ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <StatCard label="Total" value={analytics.totalFeedbacks} />
                    <StatCard label="Rating promedio" value={analytics.averageRating != null ? analytics.averageRating.toFixed(2) : '—'} />
                    {Object.entries(analytics.countByAuthorRole).map(([role, count]) => (
                      <StatCard key={role} label={ROLE_LABELS[role] ?? role} value={count} />
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {Object.entries(analytics.countByCategory).map(([cat, count]) => (
                      <div key={cat} className="rounded-[14px] border border-[#E2E7EC] bg-white px-3 py-2">
                        <p className="text-[0.6rem] uppercase tracking-[0.2em] text-[#94A3B8]">{CATEGORY_LABELS[cat] ?? cat}</p>
                        <p className="mt-0.5 text-lg font-semibold text-[#0E2A47]">{count}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(analytics.countByRating).sort(([a], [b]) => Number(a) - Number(b)).map(([star, count]) => (
                      <div key={star} className="flex items-center gap-1 rounded-full border border-[#E2E7EC] bg-white px-3 py-1 text-xs">
                        <span className="text-[#F59E0B]">{'★'.repeat(Number(star))}</span>
                        <span className="font-semibold text-[#0E2A47]">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} className={selectClass}>
                  <option value="">Todos los roles</option>
                  <option value="CLIENT">Cliente</option>
                  <option value="PROFESSIONAL">Profesional</option>
                </select>
                <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className={selectClass}>
                  <option value="">Todas las categorias</option>
                  {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <select value={filterRating} onChange={(e) => setFilterRating(e.target.value)} className={selectClass}>
                  <option value="">Todos los ratings</option>
                  {[1, 2, 3, 4, 5].map((r) => <option key={r} value={r}>{'★'.repeat(r)}</option>)}
                </select>
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={selectClass}>
                  <option value="">Todos los estados</option>
                  <option value="ACTIVE">Activo</option>
                  <option value="ARCHIVED">Archivado</option>
                </select>
                <input type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} className={inputClass} />
                <input type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} className={inputClass} />
                <button type="button" onClick={() => load(0)} className="h-9 rounded-full bg-[#0B1D2A] px-4 text-xs font-semibold text-white">Filtrar</button>
              </div>

              {isLoading && !page ? <p className="text-sm text-[#64748B]">Cargando...</p> : !page || page.empty ? <p className="text-sm text-[#64748B]">Sin resultados.</p> : (
                <div className="space-y-3">
                  {page.content.map((item: InternalFeedbackListItem) => (
                    <div key={item.id} className={`rounded-[16px] border bg-white p-4 ${item.status === 'ARCHIVED' ? 'border-[#FDE68A] bg-[#FFFBEB]' : 'border-[#E2E7EC]'}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-[#0E2A47]">{item.authorName}</span>
                            <span className="rounded-full bg-[#F1F5F9] px-2 py-0.5 text-[0.6rem] font-semibold text-[#64748B]">{ROLE_LABELS[item.authorRole] ?? item.authorRole}</span>
                            {item.status === 'ARCHIVED' ? <span className="rounded-full bg-[#FEF3C7] px-2 py-0.5 text-[0.6rem] font-semibold text-[#92400E]">Archivado</span> : null}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-[#F59E0B]">{'★'.repeat(item.rating)}</span>
                            {item.category ? <span className="text-xs text-[#94A3B8]">{CATEGORY_LABELS[item.category] ?? item.category}</span> : null}
                            <span className="text-xs text-[#CBD5E1]">{formatDate(item.createdAt)}</span>
                          </div>
                        </div>
                        <button type="button" onClick={() => handleArchiveToggle(item.id, item.status)} className="shrink-0 rounded-full border border-[#E2E7EC] px-3 py-1 text-xs font-semibold text-[#475569] transition hover:-translate-y-0.5 hover:shadow-sm">
                          {item.status === 'ARCHIVED' ? 'Desarchivar' : 'Archivar'}
                        </button>
                      </div>
                      {item.text ? <p className="mt-2 text-sm text-[#475569]">{item.text}</p> : null}
                      {item.contextSource ? <p className="mt-1 text-[0.65rem] text-[#CBD5E1]">Desde: {item.contextSource}</p> : null}
                    </div>
                  ))}
                  <Pagination page={page} isLoading={isLoading} onPageChange={(p) => load(p)} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
