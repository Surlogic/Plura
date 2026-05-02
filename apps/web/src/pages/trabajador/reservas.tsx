'use client';

import { useCallback, useEffect, useState } from 'react';
import { isAxiosError } from 'axios';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import api from '@/services/api';

type WorkerBooking = {
  id: number;
  userId: number;
  userFullName: string;
  serviceId: string;
  serviceNameSnapshot: string;
  startDateTime: string;
  timezone: string;
  serviceDurationSnapshot: string;
  servicePostBufferMinutesSnapshot: number;
  servicePaymentTypeSnapshot: string;
  rescheduleCount: number;
  operationalStatus: string;
};

const extractApiMessage = (error: unknown, fallback: string) => {
  if (isAxiosError(error)) {
    const responseData = error.response?.data;
    if (typeof responseData === 'string' && responseData.trim()) {
      return responseData.trim();
    }
    if (responseData && typeof responseData === 'object') {
      const message = (responseData as { message?: unknown }).message;
      if (typeof message === 'string' && message.trim()) {
        return message.trim();
      }
    }
  }
  return fallback;
};

const toDateLabel = (value: string) => {
  try {
    return new Date(value).toLocaleString('es-UY', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return value;
  }
};

const statusVariant = (status: string): 'info' | 'warm' | 'neutral' => {
  switch (status) {
    case 'CONFIRMED':
      return 'info';
    case 'PENDING':
      return 'warm';
    default:
      return 'neutral';
  }
};

const statusLabel = (status: string) => {
  switch (status) {
    case 'PENDING':
      return 'Pendiente';
    case 'CONFIRMED':
      return 'Confirmada';
    case 'CANCELLED':
      return 'Cancelada';
    case 'COMPLETED':
      return 'Completada';
    case 'NO_SHOW':
      return 'No asistió';
    default:
      return status;
  }
};

export default function WorkerBookingsPage() {
  const [bookings, setBookings] = useState<WorkerBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [range, setRange] = useState({
    dateFrom: new Date().toISOString().slice(0, 10),
    dateTo: new Date(Date.now() + 60 * 24 * 3600 * 1000).toISOString().slice(0, 10),
  });

  const load = useCallback(
    async (dateFrom: string, dateTo: string) => {
      setLoading(true);
      setErrorMessage(null);
      try {
        const response = await api.get<WorkerBooking[]>('/trabajador/reservas', {
          params: { dateFrom, dateTo },
        });
        setBookings(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        setErrorMessage(extractApiMessage(error, 'No se pudieron cargar tus reservas.'));
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void load(range.dateFrom, range.dateTo);
  }, [load, range.dateFrom, range.dateTo]);

  return (
    <div className="app-shell min-h-screen bg-[color:var(--background)] text-[color:var(--ink)]">
      <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:py-10">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--accent-strong)]">
              Trabajador
            </p>
            <h1 className="text-3xl font-semibold leading-tight text-[color:var(--ink)]">
              Mis reservas
            </h1>
            <p className="mt-1 text-sm text-[color:var(--ink-muted)]">
              Filtrá por rango de fechas para ver el historial de turnos asignados.
            </p>
          </div>
          <Button href="/trabajador/calendario" variant="secondary">
            Volver a la agenda
          </Button>
        </div>

        <Card tone="default" padding="lg" className="mt-6 rounded-[24px]">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--ink-muted)]">
                Desde
              </label>
              <input
                type="date"
                className="h-10 rounded-[14px] border border-[color:var(--border-soft)] bg-white/92 px-3 text-sm"
                value={range.dateFrom}
                onChange={(event) => setRange((prev) => ({ ...prev, dateFrom: event.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--ink-muted)]">
                Hasta
              </label>
              <input
                type="date"
                className="h-10 rounded-[14px] border border-[color:var(--border-soft)] bg-white/92 px-3 text-sm"
                value={range.dateTo}
                onChange={(event) => setRange((prev) => ({ ...prev, dateTo: event.target.value }))}
              />
            </div>
            <Button
              variant="secondary"
              onClick={() => void load(range.dateFrom, range.dateTo)}
              disabled={loading}
            >
              {loading ? 'Cargando…' : 'Aplicar'}
            </Button>
          </div>
        </Card>

        {errorMessage ? (
          <p className="mt-4 rounded-[12px] border border-[color:var(--error-soft)] bg-[color:var(--error-soft)] px-3 py-2 text-xs text-[color:var(--error)]">
            {errorMessage}
          </p>
        ) : null}

        <div className="mt-6 grid gap-2">
          {loading ? (
            <p className="text-sm text-[color:var(--ink-muted)]">Cargando reservas…</p>
          ) : bookings.length === 0 ? (
            <Card tone="default" padding="lg" className="rounded-[24px]">
              <p className="text-sm text-[color:var(--ink-muted)]">
                No tenés reservas en ese rango.
              </p>
            </Card>
          ) : (
            bookings.map((booking) => (
              <Card
                key={booking.id}
                tone="default"
                padding="lg"
                className="flex flex-wrap items-center justify-between gap-3 rounded-[22px]"
              >
                <div>
                  <p className="text-sm font-semibold text-[color:var(--ink)]">
                    {toDateLabel(booking.startDateTime)} · {booking.serviceNameSnapshot}
                  </p>
                  <p className="text-xs text-[color:var(--ink-muted)]">
                    {booking.userFullName} · {booking.serviceDurationSnapshot}
                  </p>
                </div>
                <Badge variant={statusVariant(booking.operationalStatus)}>
                  {statusLabel(booking.operationalStatus)}
                </Badge>
              </Card>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
