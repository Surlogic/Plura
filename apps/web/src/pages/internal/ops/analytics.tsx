import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import {
  fetchOpsAnalyticsSummary,
  type InternalOpsAnalyticsSummary,
} from '@/services/internalOps';

const inputClass =
  'h-9 rounded-[10px] border border-[#D9E2EC] bg-white px-2 text-xs text-[#0E2A47] focus:border-[#1FB6A6] focus:outline-none';

const formatMoney = (value: number) => {
  try {
    return new Intl.NumberFormat('es-UY', {
      style: 'currency',
      currency: 'UYU',
      maximumFractionDigits: 0,
    }).format(value ?? 0);
  } catch {
    return `$${Math.round(value ?? 0)}`;
  }
};

const formatPercent = (value: number) => `${(value ?? 0).toFixed(2)}%`;
const formatInt = (value: number) => (value ?? 0).toLocaleString('es-UY');
const formatRate = (value: number) => `${(value ?? 0).toFixed(1)}`;

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

function StatCard({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-[16px] border border-[#E2E7EC] bg-white px-4 py-3">
      <p className="text-[0.6rem] uppercase tracking-[0.25em] text-[#94A3B8]">{label}</p>
      <p className="mt-1 text-xl font-semibold text-[#0E2A47]">{value}</p>
      {detail ? <p className="mt-1 text-xs text-[#64748B]">{detail}</p> : null}
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3 rounded-[20px] border border-[#E2E7EC] bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold text-[#0E2A47]">{title}</h2>
        {subtitle ? <p className="text-sm text-[#64748B]">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}

function Table({
  columns,
  rows,
}: {
  columns: string[];
  rows: ReactNode[][];
}) {
  return (
    <div className="overflow-x-auto rounded-[16px] border border-[#E2E7EC]">
      <table className="min-w-full divide-y divide-[#E2E7EC] text-sm">
        <thead className="bg-[#F8FAFC]">
          <tr>
            {columns.map((column) => (
              <th key={column} className="px-3 py-2 text-left text-[0.65rem] uppercase tracking-[0.18em] text-[#64748B]">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#EEF2F6] bg-white">
          {rows.map((row, index) => (
            <tr key={index}>
              {row.map((cell, cellIndex) => (
                <td key={`${index}-${cellIndex}`} className="px-3 py-2 align-top text-[#0E2A47]">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function InternalOpsAnalyticsPage() {
  const [configured, setConfigured] = useState(false);
  const [analytics, setAnalytics] = useState<InternalOpsAnalyticsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const url = localStorage.getItem('plura_ops_api_url');
      const token = localStorage.getItem('plura_ops_token');
      if (url && token) {
        setConfigured(true);
      }
    }
  }, []);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetchOpsAnalyticsSummary(from || undefined, to || undefined);
      setAnalytics(response);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar analytics.');
    } finally {
      setIsLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    if (!configured) return;
    void load();
  }, [configured, load]);

  const topCategoriesByRevenue = useMemo(
    () => [...(analytics?.categoryPerformance || [])].sort((a, b) => b.estimatedRevenue - a.estimatedRevenue).slice(0, 10),
    [analytics],
  );
  const topCategoriesByCancellation = useMemo(
    () => [...(analytics?.categoryPerformance || [])].sort((a, b) => b.cancellationRate - a.cancellationRate).slice(0, 10),
    [analytics],
  );
  const topCategoriesByNoShow = useMemo(
    () => [...(analytics?.categoryPerformance || [])].sort((a, b) => b.noShowRate - a.noShowRate).slice(0, 10),
    [analytics],
  );
  const topCategoriesByTicket = useMemo(
    () => [...(analytics?.categoryPerformance || [])].sort((a, b) => b.averageTicket - a.averageTicket).slice(0, 10),
    [analytics],
  );

  const topProfessionalsByRevenue = useMemo(
    () => [...(analytics?.professionalPerformance || [])].sort((a, b) => b.estimatedRevenue - a.estimatedRevenue).slice(0, 10),
    [analytics],
  );
  const topProfessionalsByOccupancy = useMemo(
    () => [...(analytics?.professionalPerformance || [])].sort((a, b) => b.occupancyRate - a.occupancyRate).slice(0, 10),
    [analytics],
  );
  const topProfessionalsByReviews = useMemo(
    () => [...(analytics?.professionalPerformance || [])].sort((a, b) => b.reviewsCount - a.reviewsCount).slice(0, 10),
    [analytics],
  );

  return (
    <>
      <Head>
        <title>Ops Analytics | Plura Ops</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>
      <div className="min-h-screen bg-[#F8FAFC] px-4 py-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold text-[#0E2A47]">Ops Analytics</h1>
              <p className="text-sm text-[#64748B]">
                Tablero interno para negocio, marketplace, conversion y retencion.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/internal/feedback"
                className="rounded-full border border-[#E2E7EC] bg-white px-4 py-2 text-xs font-semibold text-[#475569] transition hover:-translate-y-0.5 hover:shadow-sm"
              >
                Feedback app
              </Link>
              <Link
                href="/internal/ops/reviews"
                className="rounded-full border border-[#E2E7EC] bg-white px-4 py-2 text-xs font-semibold text-[#475569] transition hover:-translate-y-0.5 hover:shadow-sm"
              >
                Resenas
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

              <div className="flex flex-wrap items-center gap-2 rounded-[16px] border border-[#E2E7EC] bg-white p-4 shadow-sm">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#94A3B8]">Rango</div>
                <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputClass} />
                <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputClass} />
                <button
                  type="button"
                  onClick={() => load()}
                  disabled={isLoading}
                  className="h-9 rounded-full bg-[#0B1D2A] px-4 text-xs font-semibold text-white disabled:opacity-50"
                >
                  {isLoading ? 'Cargando...' : 'Actualizar'}
                </button>
                {analytics?.overview ? (
                  <span className="ml-auto text-xs text-[#64748B]">
                    {analytics.overview.from} - {analytics.overview.to}
                  </span>
                ) : null}
              </div>

              {analytics ? (
                <>
                  <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                    <StatCard label="Reservas" value={formatInt(analytics.overview.totalReservations)} />
                    <StatCard label="Completadas" value={formatInt(analytics.overview.completedReservations)} />
                    <StatCard label="Canceladas" value={formatInt(analytics.overview.cancelledReservations)} />
                    <StatCard label="No show" value={formatInt(analytics.overview.noShowReservations)} />
                    <StatCard label="Facturacion est." value={formatMoney(analytics.overview.estimatedRevenue)} />
                    <StatCard label="Ticket prom." value={formatMoney(analytics.overview.averageTicket)} />
                    <StatCard label="Searches" value={formatInt(analytics.overview.totalSearches)} />
                    <StatCard label="Profile views" value={formatInt(analytics.overview.totalProfileViews)} />
                    <StatCard label="Retorno" value={formatPercent(analytics.retention.returningRate)} detail={`${formatInt(analytics.retention.returningClients)} clientes`} />
                    <StatCard label="Retencion" value={formatPercent(analytics.retention.windowRetentionRate)} detail={`${formatInt(analytics.retention.retainedFromPreviousWindow)} retenidos`} />
                  </div>

                  <Section
                    title="Rubros"
                    subtitle="Reservas, facturacion, ticket, cancelaciones y no-show por rubro."
                  >
                    <div className="grid gap-4 xl:grid-cols-2">
                      <Table
                        columns={['Rubro', 'Reservas', 'Facturacion', 'Ticket', 'Cancelacion', 'No-show']}
                        rows={(analytics.categoryPerformance || []).slice(0, 10).map((item) => [
                          item.categoryLabel,
                          formatInt(item.totalBookings),
                          formatMoney(item.estimatedRevenue),
                          formatMoney(item.averageTicket),
                          formatPercent(item.cancellationRate),
                          formatPercent(item.noShowRate),
                        ])}
                      />
                      <div className="grid gap-4 md:grid-cols-2">
                        <Table
                          columns={['Top facturacion', 'Valor']}
                          rows={topCategoriesByRevenue.map((item) => [
                            item.categoryLabel,
                            formatMoney(item.estimatedRevenue),
                          ])}
                        />
                        <Table
                          columns={['Top ticket', 'Valor']}
                          rows={topCategoriesByTicket.map((item) => [
                            item.categoryLabel,
                            formatMoney(item.averageTicket),
                          ])}
                        />
                        <Table
                          columns={['Top cancelacion', 'Tasa']}
                          rows={topCategoriesByCancellation.map((item) => [
                            item.categoryLabel,
                            formatPercent(item.cancellationRate),
                          ])}
                        />
                        <Table
                          columns={['Top no-show', 'Tasa']}
                          rows={topCategoriesByNoShow.map((item) => [
                            item.categoryLabel,
                            formatPercent(item.noShowRate),
                          ])}
                        />
                      </div>
                    </div>
                  </Section>

                  <Section
                    title="Funnel por Rubro"
                    subtitle="Busqueda -> perfil -> reserva, usando tracking server-side sobre search y vistas de perfil."
                  >
                    <Table
                      columns={['Rubro', 'Searches', 'Perfiles', 'Reservas', 'Search->Perfil', 'Perfil->Reserva', 'Search->Reserva']}
                      rows={(analytics.funnelByCategory || []).slice(0, 12).map((item) => [
                        item.categoryLabel,
                        formatInt(item.searches),
                        formatInt(item.profileViews),
                        formatInt(item.reservations),
                        formatPercent(item.searchToProfileRate),
                        formatPercent(item.profileToReservationRate),
                        formatPercent(item.searchToReservationRate),
                      ])}
                    />
                  </Section>

                  <Section
                    title="Servicios"
                    subtitle="Servicios mas reservados y con mayor valor estimado."
                  >
                    <Table
                      columns={['Servicio', 'Rubro', 'Reservas', 'Facturacion', 'Ticket']}
                      rows={(analytics.servicePerformance || []).slice(0, 15).map((item) => [
                        item.serviceName,
                        item.categoryLabel,
                        formatInt(item.totalBookings),
                        formatMoney(item.estimatedRevenue),
                        formatMoney(item.averageTicket),
                      ])}
                    />
                  </Section>

                  <div className="grid gap-4 xl:grid-cols-2">
                    <Section
                      title="Retencion y Recompra"
                      subtitle="Clientes activos, recurrentes, repetidores del periodo y retencion contra la ventana anterior."
                    >
                      <div className="grid grid-cols-2 gap-3">
                        <StatCard label="Clientes activos" value={formatInt(analytics.retention.activeClients)} />
                        <StatCard label="Clientes recurrentes" value={formatInt(analytics.retention.returningClients)} />
                        <StatCard label="Tasa retorno" value={formatPercent(analytics.retention.returningRate)} />
                        <StatCard label="2+ reservas" value={formatInt(analytics.retention.repeatClientsInPeriod)} />
                        <StatCard label="Tasa recompra" value={formatPercent(analytics.retention.repeatRate)} />
                        <StatCard label="Retencion ventana" value={formatPercent(analytics.retention.windowRetentionRate)} />
                      </div>
                    </Section>

                    <Section
                      title="Demanda"
                      subtitle="Dias y horarios con mayor demanda sobre startDateTime de la reserva."
                    >
                      <div className="grid gap-4 md:grid-cols-2">
                        <Table
                          columns={['Dia', 'Reservas']}
                          rows={(analytics.demandByWeekday || []).map((item) => [
                            item.label,
                            formatInt(item.count),
                          ])}
                        />
                        <Table
                          columns={['Hora', 'Reservas']}
                          rows={(analytics.demandByHour || []).slice(0, 12).map((item) => [
                            item.label,
                            formatInt(item.count),
                          ])}
                        />
                      </div>
                    </Section>
                  </div>

                  <Section
                    title="Ciudades"
                    subtitle="Ciudades o zonas con mas exploracion, vistas de perfil y reservas."
                  >
                    <Table
                      columns={['Ciudad', 'Searches', 'Perfiles', 'Reservas', 'Perfil->Reserva', 'Search->Reserva']}
                      rows={(analytics.cityPerformance || []).slice(0, 15).map((item) => [
                        item.city,
                        formatInt(item.searches),
                        formatInt(item.profileViews),
                        formatInt(item.reservations),
                        formatPercent(item.profileToReservationRate),
                        formatPercent(item.searchToReservationRate),
                      ])}
                    />
                  </Section>

                  <Section
                    title="Profesionales Top"
                    subtitle="Ranking por reservas, ingresos estimados, ocupacion y resenas."
                  >
                    <div className="grid gap-4 xl:grid-cols-3">
                      <Table
                        columns={['Top reservas', 'Reservas', 'Facturacion']}
                        rows={(analytics.professionalPerformance || []).slice(0, 10).map((item) => [
                          <div key={item.professionalId}>
                            <div className="font-semibold">{item.professionalName}</div>
                            <div className="text-xs text-[#64748B]">{item.categoryLabel} · {item.city}</div>
                          </div>,
                          formatInt(item.totalBookings),
                          formatMoney(item.estimatedRevenue),
                        ])}
                      />
                      <Table
                        columns={['Top ingresos', 'Facturacion', 'Ticket']}
                        rows={topProfessionalsByRevenue.map((item) => [
                          <div key={item.professionalId}>
                            <div className="font-semibold">{item.professionalName}</div>
                            <div className="text-xs text-[#64748B]">{item.categoryLabel}</div>
                          </div>,
                          formatMoney(item.estimatedRevenue),
                          formatMoney(item.averageTicket),
                        ])}
                      />
                      <Table
                        columns={['Top ocupacion', 'Ocupacion', 'Resenas']}
                        rows={topProfessionalsByOccupancy.map((item) => [
                          <div key={item.professionalId}>
                            <div className="font-semibold">{item.professionalName}</div>
                            <div className="text-xs text-[#64748B]">{item.city}</div>
                          </div>,
                          formatPercent(item.occupancyRate),
                          `${formatInt(item.reviewsCount)} · ${formatRate(item.rating)}`,
                        ])}
                      />
                    </div>
                    <div className="mt-4">
                      <Table
                        columns={['Top resenas', 'Rating', 'Resenas']}
                        rows={topProfessionalsByReviews.map((item) => [
                          item.professionalName,
                          formatRate(item.rating),
                          formatInt(item.reviewsCount),
                        ])}
                      />
                    </div>
                  </Section>
                </>
              ) : isLoading ? (
                <p className="text-sm text-[#64748B]">Cargando analytics...</p>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
