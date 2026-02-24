'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';
import ProfesionalSidebar from '@/components/profesional/Sidebar';
import { useProfessionalProfile } from '@/hooks/useProfessionalProfile';
import { loadProfessionalReservations } from '@/lib/professionalReservations';
import { loadProfessionalSchedule } from '@/lib/professionalSchedule';
import type {
  ProfessionalReservation,
  ProfessionalSchedule,
  WorkDayKey,
  WorkDaySchedule,
  WorkShift,
} from '@/types/professional';

const dayLabelsShort: Record<WorkDayKey, string> = {
  mon: 'Lun',
  tue: 'Mar',
  wed: 'Mié',
  thu: 'Jue',
  fri: 'Vie',
  sat: 'Sáb',
  sun: 'Dom',
};

const dayKeyByIndex: Record<number, WorkDayKey> = {
  0: 'sun',
  1: 'mon',
  2: 'tue',
  3: 'wed',
  4: 'thu',
  5: 'fri',
  6: 'sat',
};

const monthNames = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
const monthNamesShort = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
];

const toLocalDateKey = (date: Date) => date.toLocaleDateString('en-CA');

const startOfWeek = (date: Date) => {
  const result = new Date(date);
  const day = result.getDay();
  const diff = (day + 6) % 7;
  result.setDate(result.getDate() - diff);
  result.setHours(0, 0, 0, 0);
  return result;
};

const parseTimeToMinutes = (value: string) => {
  const [hours, minutes] = value.split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
};

export default function ProfesionalDashboardPage() {
  const { profile } = useProfessionalProfile();
  const [reservations, setReservations] = useState<ProfessionalReservation[]>([]);
  const [schedule, setSchedule] = useState<ProfessionalSchedule | null>(null);
  const [calendarView, setCalendarView] = useState<'week' | 'month'>('week');
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);

  useEffect(() => {
    if (!profile?.id) return;
    setReservations(loadProfessionalReservations(profile.id));
    setSchedule(loadProfessionalSchedule(profile.id, { allowFallback: false }));
  }, [profile?.id]);

  const today = new Date();
  const todayKey = toLocalDateKey(today);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const yesterdayKey = toLocalDateKey(yesterday);

  // Fixed current week — used for stats only
  const currentWeekStart = startOfWeek(today);
  const currentWeekEnd = new Date(currentWeekStart);
  currentWeekEnd.setDate(currentWeekStart.getDate() + 6);
  const weekStartKey = toLocalDateKey(currentWeekStart);
  const weekEndKey = toLocalDateKey(currentWeekEnd);

  // Navigated week — used for calendar display
  const weekDays = useMemo(() => {
    const base = startOfWeek(today);
    base.setDate(base.getDate() + weekOffset * 7);
    return Array.from({ length: 7 }).map((_, index) => {
      const date = new Date(base);
      date.setDate(base.getDate() + index);
      const dayKey = dayKeyByIndex[date.getDay()];
      return {
        dayKey,
        dateKey: toLocalDateKey(date),
        label: `${dayLabelsShort[dayKey]} ${date.getDate()}`,
      };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekOffset]);

  // Navigated month — used for calendar display
  const monthGridDays = useMemo(() => {
    const firstOfMonth = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
    const gridStart = startOfWeek(firstOfMonth);
    return Array.from({ length: 42 }).map((_, index) => {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + index);
      const dayKey = dayKeyByIndex[date.getDay()];
      return {
        dayKey,
        dateKey: toLocalDateKey(date),
        day: date.getDate(),
        isCurrentMonth: date.getMonth() === firstOfMonth.getMonth(),
        isToday: toLocalDateKey(date) === todayKey,
      };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthOffset, todayKey]);

  const calendarWeekLabel = useMemo(() => {
    const base = startOfWeek(today);
    base.setDate(base.getDate() + weekOffset * 7);
    const end = new Date(base);
    end.setDate(base.getDate() + 6);
    const fmt = (d: Date) => `${d.getDate()} ${monthNamesShort[d.getMonth()]}`;
    return weekOffset === 0 ? 'Semana actual' : `${fmt(base)} – ${fmt(end)}`;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekOffset]);

  const monthLabel = useMemo(() => {
    const firstOfMonth = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
    return `${monthNames[firstOfMonth.getMonth()]} ${firstOfMonth.getFullYear()}`;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthOffset]);

  const reservationsByDate = useMemo(() => {
    const map = new Map<string, ProfessionalReservation[]>();
    reservations.forEach((reservation) => {
      if (!reservation.date) return;
      const list = map.get(reservation.date) ?? [];
      list.push(reservation);
      map.set(reservation.date, list);
    });
    map.forEach((list) => {
      list.sort((a, b) => {
        const aMinutes = a.time ? parseTimeToMinutes(a.time) ?? 0 : 0;
        const bMinutes = b.time ? parseTimeToMinutes(b.time) ?? 0 : 0;
        return aMinutes - bMinutes;
      });
    });
    return map;
  }, [reservations]);

  const todayCount = reservations.filter((r) => r.date === todayKey).length;
  const yesterdayCount = reservations.filter((r) => r.date === yesterdayKey).length;
  const todayDiff = todayCount - yesterdayCount;

  const weekReservations = reservations.filter(
    (r) => r.date >= weekStartKey && r.date <= weekEndKey,
  );
  const uniqueClientsWeek = new Set(
    weekReservations.map((r) => r.clientName).filter(Boolean),
  ).size;

  const scheduleDays = schedule?.days.filter((day) => day.enabled && !day.paused) ?? [];
  const scheduleDaySet = new Set(scheduleDays.map((day) => day.day));

  const currentWeekDays = useMemo(() => {
    return Array.from({ length: 7 }).map((_, index) => {
      const date = new Date(currentWeekStart);
      date.setDate(currentWeekStart.getDate() + index);
      const dayKey = dayKeyByIndex[date.getDay()];
      return { dayKey, dateKey: toLocalDateKey(date) };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const daysWithReservations = currentWeekDays.filter((day) => {
    if (!scheduleDaySet.has(day.dayKey)) return false;
    return (reservationsByDate.get(day.dateKey)?.length ?? 0) > 0;
  }).length;

  const occupancyValue =
    scheduleDays.length > 0
      ? `${Math.round((daysWithReservations / scheduleDays.length) * 100)}%`
      : 'Sin horario';
  const occupancyDetail =
    scheduleDays.length > 0
      ? `Días con reservas: ${daysWithReservations}/${scheduleDays.length}`
      : 'Configurá horarios';

  const stats = [
    {
      label: 'Reservas hoy',
      value: `${todayCount}`,
      detail:
        todayDiff === 0
          ? 'Igual que ayer'
          : `${todayDiff > 0 ? '+' : ''}${todayDiff} vs ayer`,
    },
    {
      label: 'Ocupación semanal',
      value: occupancyValue,
      detail: occupancyDetail,
    },
    {
      label: 'Clientes nuevos',
      value: `${uniqueClientsWeek}`,
      detail: 'Últimos 7 días',
    },
  ];

  const handlePrev = () => {
    if (calendarView === 'week') setWeekOffset((prev) => prev - 1);
    else setMonthOffset((prev) => prev - 1);
  };
  const handleNext = () => {
    if (calendarView === 'week') setWeekOffset((prev) => prev + 1);
    else setMonthOffset((prev) => prev + 1);
  };
  const handleToday = () => {
    setWeekOffset(0);
    setMonthOffset(0);
  };
  const handleSetView = (view: 'week' | 'month') => {
    setCalendarView(view);
    setWeekOffset(0);
    setMonthOffset(0);
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#FFFFFF_0%,#EEF2F6_45%,#D3D7DC_100%)] text-[#0E2A47]">
      <Navbar />
      <main className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-10 pb-24 pt-10">
        <section className="flex flex-row items-start gap-6">
          <ProfesionalSidebar profile={profile} active="Agenda" />
          <div className="min-w-0 flex-1 space-y-6">
            <div className="rounded-[28px] border border-white/70 bg-white/95 p-6 shadow-[0_28px_70px_rgba(15,23,42,0.18)]">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-[0.65rem] uppercase tracking-[0.35em] text-[#94A3B8]">
                    Panel profesional
                  </p>
                  <h1 className="mt-2 text-2xl font-semibold text-[#0E2A47]">
                    Agenda y reservas
                  </h1>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href="/profesional/reservas"
                    className="rounded-full border border-[#E2E7EC] bg-white px-4 py-2 text-sm font-semibold text-[#0E2A47] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    Ver lista de reservas
                  </Link>
                  <Link
                    href="/profesional/reservas#nueva-reserva"
                    className="rounded-full bg-[#0B1D2A] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    Crear reserva
                  </Link>
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                {stats.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-[18px] border border-[#E2E7EC] bg-[#F7F9FB] p-4"
                  >
                    <p className="text-xs uppercase tracking-[0.3em] text-[#94A3B8]">
                      {item.label}
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-[#0E2A47]">
                      {item.value}
                    </p>
                    <p className="mt-1 text-xs text-[#64748B]">{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[28px] border border-white/70 bg-white/95 p-6 shadow-[0_18px_40px_rgba(15,23,42,0.12)]">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-[0.65rem] uppercase tracking-[0.35em] text-[#94A3B8]">
                    Agenda
                  </p>
                  <h2 className="mt-2 text-xl font-semibold text-[#0E2A47]">
                    {calendarView === 'week' ? 'Calendario semanal' : 'Calendario mensual'}
                  </h2>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* View toggle */}
                  <div className="flex rounded-full border border-[#E2E7EC] bg-[#F7F9FB] p-0.5">
                    <button
                      type="button"
                      onClick={() => handleSetView('week')}
                      className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                        calendarView === 'week'
                          ? 'bg-white text-[#0E2A47] shadow-sm'
                          : 'text-[#94A3B8] hover:text-[#64748B]'
                      }`}
                    >
                      Semanal
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetView('month')}
                      className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                        calendarView === 'month'
                          ? 'bg-white text-[#0E2A47] shadow-sm'
                          : 'text-[#94A3B8] hover:text-[#64748B]'
                      }`}
                    >
                      Mensual
                    </button>
                  </div>

                  {/* Navigation */}
                  <div className="flex items-center gap-0.5 rounded-full border border-[#E2E7EC] bg-white px-1 py-1">
                    <button
                      type="button"
                      onClick={handlePrev}
                      className="rounded-full px-2 py-1 text-sm text-[#64748B] transition hover:bg-[#F7F9FB] hover:text-[#0E2A47]"
                    >
                      ‹
                    </button>
                    <span className="min-w-[120px] text-center text-xs font-medium text-[#64748B]">
                      {calendarView === 'week' ? calendarWeekLabel : monthLabel}
                    </span>
                    <button
                      type="button"
                      onClick={handleNext}
                      className="rounded-full px-2 py-1 text-sm text-[#64748B] transition hover:bg-[#F7F9FB] hover:text-[#0E2A47]"
                    >
                      ›
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleToday}
                    className="rounded-full border border-[#E2E7EC] bg-white px-3 py-1.5 text-xs font-semibold text-[#64748B] transition hover:-translate-y-0.5 hover:shadow-sm"
                  >
                    Hoy
                  </button>
                </div>
              </div>

              {calendarView === 'week' ? (
                <div className="mt-6 rounded-[24px] border border-[#E2E7EC] bg-[#F7F9FB] p-4">
                  <div className="grid grid-cols-7 gap-3 text-center text-xs font-semibold text-[#64748B]">
                    {weekDays.map((day) => (
                      <div
                        key={day.dateKey}
                        className={`rounded-[12px] py-2 shadow-sm ${
                          day.dateKey === todayKey
                            ? 'bg-[#0B1D2A] text-white'
                            : 'bg-white'
                        }`}
                      >
                        {day.label}
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 grid grid-cols-7 gap-3">
                    {weekDays.map((day) => {
                      const dayReservations = reservationsByDate.get(day.dateKey) ?? [];
                      return (
                        <div
                          key={day.dateKey}
                          className={`min-h-[220px] rounded-[18px] border p-3 ${
                            day.dateKey === todayKey
                              ? 'border-[#1FB6A6]/30 bg-[#EDFAF8]'
                              : 'border-[#E2E7EC] bg-white'
                          }`}
                        >
                          {dayReservations.length === 0 ? (
                            <div className="rounded-[12px] border border-dashed border-[#CBD5F5] bg-[#F8FAFC] px-3 py-3 text-xs text-[#94A3B8]">
                              Sin reservas
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {dayReservations.map((reservation) => (
                                <div
                                  key={reservation.id}
                                  className="rounded-[12px] border border-[#E2E7EC] bg-[#F7F9FB] px-3 py-2 text-xs text-[#0E2A47]"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="font-semibold">
                                      {reservation.time || '--:--'}
                                    </span>
                                    <span className="text-[0.7rem] font-semibold text-[#1FB6A6]">
                                      {reservation.serviceName || 'Servicio'}
                                    </span>
                                  </div>
                                  {reservation.clientName ? (
                                    <p className="mt-1 text-[0.7rem] text-[#64748B]">
                                      {reservation.clientName}
                                    </p>
                                  ) : null}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <p className="mt-4 text-center text-xs uppercase tracking-[0.4em] text-[#94A3B8]">
                    {calendarWeekLabel}
                  </p>
                </div>
              ) : (
                <div className="mt-6 rounded-[24px] border border-[#E2E7EC] bg-[#F7F9FB] p-4">
                  <div className="grid grid-cols-7 gap-1 text-center">
                    {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((d) => (
                      <div key={d} className="py-2 text-xs font-semibold text-[#94A3B8]">
                        {d}
                      </div>
                    ))}
                  </div>
                  <div className="mt-1 grid grid-cols-7 gap-1">
                    {monthGridDays.map((day) => {
                      const count = reservationsByDate.get(day.dateKey)?.length ?? 0;
                      return (
                        <div
                          key={day.dateKey}
                          className={`min-h-[60px] rounded-[12px] p-2 text-xs transition ${
                            day.isToday
                              ? 'bg-[#0B1D2A] text-white'
                              : day.isCurrentMonth
                                ? 'bg-white text-[#0E2A47]'
                                : 'bg-transparent text-[#CBD5E1]'
                          }`}
                        >
                          <p className={`font-semibold ${day.isToday ? 'text-white' : ''}`}>
                            {day.day}
                          </p>
                          {count > 0 ? (
                            <span
                              className={`mt-1 inline-block rounded-full px-1.5 py-0.5 text-[0.6rem] font-semibold ${
                                day.isToday
                                  ? 'bg-white/20 text-white'
                                  : 'bg-[#1FB6A6]/10 text-[#1FB6A6]'
                              }`}
                            >
                              {count} res.
                            </span>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                  <p className="mt-4 text-center text-xs uppercase tracking-[0.4em] text-[#94A3B8]">
                    {monthLabel}
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
