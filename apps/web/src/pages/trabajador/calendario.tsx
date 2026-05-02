'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { isAxiosError } from 'axios';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import api from '@/services/api';

type WorkerSummary = {
  workerId: string;
  displayName: string;
  email: string;
  status: string;
  professionalId?: string | null;
  professionalName?: string | null;
  professionalSlug?: string | null;
};

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
      weekday: 'short',
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

export default function WorkerCalendarPage() {
  const [summary, setSummary] = useState<WorkerSummary | null>(null);
  const [bookings, setBookings] = useState<WorkerBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const [summaryResponse, bookingsResponse] = await Promise.all([
        api.get<WorkerSummary>('/trabajador/me'),
        api.get<WorkerBooking[]>('/trabajador/calendario'),
      ]);
      setSummary(summaryResponse.data ?? null);
      setBookings(Array.isArray(bookingsResponse.data) ? bookingsResponse.data : []);
    } catch (error) {
      setErrorMessage(extractApiMessage(error, 'No se pudo cargar tu agenda.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const upcomingByDay = useMemo(() => {
    const groups = new Map<string, WorkerBooking[]>();
    for (const booking of bookings) {
      const dayKey = booking.startDateTime.slice(0, 10);
      const existing = groups.get(dayKey) ?? [];
      existing.push(booking);
      groups.set(dayKey, existing);
    }
    return Array.from(groups.entries())
      .map(([day, list]) => ({
        day,
        list: list.sort((a, b) => a.startDateTime.localeCompare(b.startDateTime)),
      }))
      .sort((a, b) => a.day.localeCompare(b.day));
  }, [bookings]);

  return (
    <div className="app-shell min-h-screen bg-[color:var(--background)] text-[color:var(--ink)]">
      <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:py-10">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--accent-strong)]">
              Trabajador
            </p>
            <h1 className="text-3xl font-semibold leading-tight text-[color:var(--ink)]">
              Tu agenda en {summary?.professionalName ?? 'el local'}
            </h1>
            {summary ? (
              <p className="mt-1 text-sm text-[color:var(--ink-muted)]">
                Hola, {summary.displayName}. Estas son tus reservas asignadas.
              </p>
            ) : null}
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => void load()} disabled={loading}>
              {loading ? 'Cargando…' : 'Actualizar'}
            </Button>
            <Button href="/trabajador/reservas" variant="brand">
              Ver todas las reservas
            </Button>
          </div>
        </div>

        {errorMessage ? (
          <p className="mt-4 rounded-[12px] border border-[color:var(--error-soft)] bg-[color:var(--error-soft)] px-3 py-2 text-xs text-[color:var(--error)]">
            {errorMessage}
          </p>
        ) : null}

        <div className="mt-6 space-y-4">
          {loading ? (
            <p className="text-sm text-[color:var(--ink-muted)]">Cargando agenda…</p>
          ) : upcomingByDay.length === 0 ? (
            <Card tone="default" padding="lg" className="rounded-[26px]">
              <p className="text-sm text-[color:var(--ink-muted)]">
                No tenés reservas asignadas en los próximos 30 días.
              </p>
            </Card>
          ) : (
            upcomingByDay.map(({ day, list }) => (
              <div key={day} className="space-y-2">
                <h2 className="text-sm font-semibold text-[color:var(--ink)]">
                  {new Date(`${day}T00:00:00`).toLocaleDateString('es-UY', {
                    weekday: 'long',
                    day: '2-digit',
                    month: 'long',
                  })}
                </h2>
                <div className="grid gap-2">
                  {list.map((booking) => (
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
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
