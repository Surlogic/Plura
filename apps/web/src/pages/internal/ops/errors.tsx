import { useCallback, useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import {
  clearInternalOpsAccess,
  configureInternalOpsAccess,
  fetchAppErrorAnalytics,
  fetchAppErrorDetail,
  fetchAppErrorList,
  getDefaultInternalOpsBaseUrl,
  hasInternalOpsAccess,
} from '@/services/internalOps';
import type {
  InternalAppErrorAnalytics,
  InternalAppErrorDetail,
  InternalAppErrorListItem,
  InternalAppErrorListPage,
} from '@/services/internalOps';

const selectClass =
  'h-9 rounded-[10px] border border-[#D9E2EC] bg-white px-2 text-xs text-[#0E2A47] focus:border-[#1FB6A6] focus:outline-none';
const inputClass =
  'h-9 rounded-[10px] border border-[#D9E2EC] bg-white px-2 text-xs text-[#0E2A47] focus:border-[#1FB6A6] focus:outline-none';

const formatDateTime = (iso: string) => {
  try {
    return new Date(iso).toLocaleString('es-UY', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
};

function OpsConfig({ onConfigured }: { onConfigured: () => void }) {
  const [apiUrl, setApiUrl] = useState(getDefaultInternalOpsBaseUrl);
  const [token, setToken] = useState('');
  const [configError, setConfigError] = useState<string | null>(null);

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
          try {
            configureInternalOpsAccess({ baseUrl: apiUrl, token });
            setConfigError(null);
            setToken('');
            onConfigured();
          } catch (e) {
            setConfigError(e instanceof Error ? e.message : 'No se pudo configurar el acceso interno.');
          }
        }}
        disabled={!apiUrl.trim() || !token.trim()}
        className="w-full rounded-full bg-[#0B1D2A] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
      >
        Conectar
      </button>
      {configError ? <p className="text-xs font-semibold text-[#B91C1C]">{configError}</p> : null}
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

export default function InternalOpsErrorsPage() {
  const [configured, setConfigured] = useState(false);
  const [page, setPage] = useState<InternalAppErrorListPage | null>(null);
  const [analytics, setAnalytics] = useState<InternalAppErrorAnalytics | null>(null);
  const [selected, setSelected] = useState<InternalAppErrorDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [filterSource, setFilterSource] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('');
  const [filterResolved, setFilterResolved] = useState('false');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');

  useEffect(() => {
    if (hasInternalOpsAccess()) setConfigured(true);
  }, []);

  const load = useCallback(async (pageNum: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const [listResult, analyticsResult] = await Promise.all([
        fetchAppErrorList({
          page: pageNum,
          size: 20,
          source: filterSource || undefined,
          severity: filterSeverity || undefined,
          resolved: filterResolved === '' ? undefined : filterResolved,
          from: filterFrom || undefined,
          to: filterTo || undefined,
        }),
        fetchAppErrorAnalytics(filterFrom || undefined, filterTo || undefined),
      ]);
      setPage(listResult);
      setAnalytics(analyticsResult);
      setCurrentPage(pageNum);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar incidentes.');
    } finally {
      setIsLoading(false);
    }
  }, [filterFrom, filterResolved, filterSeverity, filterSource, filterTo]);

  useEffect(() => {
    if (!configured) return;
    void load(0);
  }, [configured, load]);

  const openDetail = async (id: number) => {
    try {
      setSelected(await fetchAppErrorDetail(id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar el detalle.');
    }
  };

  return (
    <>
      <Head>
        <title>Errores de app | Plura Ops</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>
      <div className="min-h-screen bg-[color:var(--background)] px-4 py-8">
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold text-[#0E2A47]">Errores de app</h1>
              <p className="text-sm text-[#64748B]">Incidentes agregados de backend, web y mobile.</p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/internal/feedback"
                className="rounded-full border border-[#E2E7EC] bg-white px-4 py-2 text-xs font-semibold text-[#475569]"
              >
                Feedback
              </Link>
              <Link
                href="/internal/ops/reviews"
                className="rounded-full border border-[#E2E7EC] bg-white px-4 py-2 text-xs font-semibold text-[#475569]"
              >
                Reseñas
              </Link>
              {configured ? (
                <button
                  type="button"
                  onClick={() => {
                    clearInternalOpsAccess();
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
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <StatCard label="Incidentes" value={analytics.totalIncidents} />
                  <StatCard label="Abiertos" value={analytics.openIncidents} />
                  <StatCard label="Vistos en rango" value={analytics.incidentsSeenInRange} />
                  <StatCard
                    label="Fuentes"
                    value={Object.entries(analytics.countBySource)
                      .map(([source, count]) => `${source}:${count}`)
                      .join(' · ') || '—'}
                  />
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <select value={filterSource} onChange={(e) => setFilterSource(e.target.value)} className={selectClass}>
                  <option value="">Todas las fuentes</option>
                  <option value="BACKEND">Backend</option>
                  <option value="ASYNC">Async</option>
                  <option value="WEB">Web</option>
                  <option value="MOBILE">Mobile</option>
                </select>
                <select value={filterSeverity} onChange={(e) => setFilterSeverity(e.target.value)} className={selectClass}>
                  <option value="">Todas las severidades</option>
                  <option value="ERROR">Error</option>
                  <option value="WARN">Warn</option>
                </select>
                <select value={filterResolved} onChange={(e) => setFilterResolved(e.target.value)} className={selectClass}>
                  <option value="">Todos</option>
                  <option value="false">Abiertos</option>
                  <option value="true">Resueltos</option>
                </select>
                <input type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} className={inputClass} />
                <input type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} className={inputClass} />
                <button type="button" onClick={() => load(0)} className="h-9 rounded-full bg-[#0B1D2A] px-4 text-xs font-semibold text-white">
                  Filtrar
                </button>
              </div>

              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_420px]">
                <div className="space-y-3">
                  {isLoading && !page ? (
                    <p className="text-sm text-[#64748B]">Cargando...</p>
                  ) : !page || page.empty ? (
                    <p className="text-sm text-[#64748B]">Sin incidentes.</p>
                  ) : (
                    page.content.map((item: InternalAppErrorListItem) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => void openDetail(item.id)}
                        className="w-full rounded-[16px] border border-[#E2E7EC] bg-white p-4 text-left transition hover:-translate-y-0.5 hover:shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-full bg-[#FEF2F2] px-2 py-0.5 text-[0.6rem] font-semibold text-[#B91C1C]">
                                {item.source}
                              </span>
                              <span className="rounded-full bg-[#F1F5F9] px-2 py-0.5 text-[0.6rem] font-semibold text-[#475569]">
                                {item.severity}
                              </span>
                              {item.httpStatus ? (
                                <span className="rounded-full bg-[#ECFEFF] px-2 py-0.5 text-[0.6rem] font-semibold text-[#155E75]">
                                  HTTP {item.httpStatus}
                                </span>
                              ) : null}
                            </div>
                            <p className="text-sm font-semibold text-[#0E2A47]">{item.errorType || 'UnknownError'}</p>
                            <p className="line-clamp-2 text-sm text-[#475569]">{item.message || 'Sin mensaje'}</p>
                            <p className="text-xs text-[#94A3B8]">
                              {item.route || 'sin ruta'} · {formatDateTime(item.lastSeenAt)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-semibold text-[#0E2A47]">{item.occurrenceCount}</p>
                            <p className="text-[0.65rem] uppercase tracking-[0.2em] text-[#94A3B8]">veces</p>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                  {page && page.totalPages > 1 ? (
                    <div className="flex items-center justify-center gap-3 pt-2">
                      <button
                        type="button"
                        disabled={page.first || isLoading}
                        onClick={() => void load(page.number - 1)}
                        className="rounded-full border border-[#E2E7EC] px-4 py-2 text-xs font-semibold text-[#475569] disabled:opacity-40"
                      >
                        Anterior
                      </button>
                      <span className="text-xs text-[#64748B]">{page.number + 1} / {page.totalPages}</span>
                      <button
                        type="button"
                        disabled={page.last || isLoading}
                        onClick={() => void load(page.number + 1)}
                        className="rounded-full border border-[#E2E7EC] px-4 py-2 text-xs font-semibold text-[#475569] disabled:opacity-40"
                      >
                        Siguiente
                      </button>
                    </div>
                  ) : null}
                </div>

                <aside className="rounded-[18px] border border-[#E2E7EC] bg-white p-4">
                  {!selected ? (
                    <p className="text-sm text-[#64748B]">Selecciona un incidente para ver detalle.</p>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <p className="text-[0.6rem] uppercase tracking-[0.25em] text-[#94A3B8]">Ultimo traceId</p>
                        <p className="mt-1 break-all text-sm font-semibold text-[#0E2A47]">{selected.traceId || '—'}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <p className="text-[#94A3B8]">Primera vez</p>
                          <p className="mt-1 text-[#0E2A47]">{formatDateTime(selected.firstSeenAt)}</p>
                        </div>
                        <div>
                          <p className="text-[#94A3B8]">Ultima vez</p>
                          <p className="mt-1 text-[#0E2A47]">{formatDateTime(selected.lastSeenAt)}</p>
                        </div>
                      </div>
                      {selected.contextJson ? (
                        <div>
                          <p className="text-[0.6rem] uppercase tracking-[0.25em] text-[#94A3B8]">Contexto</p>
                          <pre className="mt-2 max-h-40 overflow-auto rounded-[12px] bg-[#F8FAFC] p-3 text-[0.68rem] text-[#334155]">
                            {selected.contextJson}
                          </pre>
                        </div>
                      ) : null}
                      <div>
                        <p className="text-[0.6rem] uppercase tracking-[0.25em] text-[#94A3B8]">Stack trace</p>
                        <pre className="mt-2 max-h-[28rem] overflow-auto rounded-[12px] bg-[#0F172A] p-3 text-[0.68rem] text-[#E2E8F0]">
                          {selected.stackTrace || 'Sin stack trace'}
                        </pre>
                      </div>
                    </div>
                  )}
                </aside>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
