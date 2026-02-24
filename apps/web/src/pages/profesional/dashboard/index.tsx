'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/shared/Navbar';
import ProfesionalSidebar from '@/components/profesional/Sidebar';
import { useProfessionalProfile } from '@/hooks/useProfessionalProfile';
import {
  loadProfessionalReservations,
  saveProfessionalReservations,
} from '@/lib/professionalReservations';
import { loadProfessionalSchedule } from '@/lib/professionalSchedule';
import type {
  ProfessionalReservation,
  ProfessionalSchedule,
  WorkDayKey,
  WorkDaySchedule,
  WorkShift,
  ReservationStatus,
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

const parseDurationToMinutes = (value?: string) => {
  if (!value) return null;
  const normalized = value.toLowerCase();
  const hourMatch = normalized.match(/(\d+)\s*(h|hr|hora)/);
  const minMatch = normalized.match(/(\d+)\s*(m|min)/);
  let minutes = 0;
  if (hourMatch) minutes += Number(hourMatch[1]) * 60;
  if (minMatch) minutes += Number(minMatch[1]);
  if (!hourMatch && !minMatch) {
    const numeric = Number(normalized.replace(/[^0-9]/g, ''));
    if (Number.isFinite(numeric)) minutes = numeric;
  }
  return minutes > 0 ? minutes : null;
};

const calendarStartHour = 8;
const calendarEndHour = 20;
const hourRowHeight = 80;
const calendarTotalMinutes = (calendarEndHour - calendarStartHour) * 60;
const calendarHeight = (calendarEndHour - calendarStartHour) * hourRowHeight;
const hourSlots = Array.from(
  { length: calendarEndHour - calendarStartHour + 1 },
  (_, index) => calendarStartHour + index,
);
const formatHourLabel = (hour: number) =>
  `${String(hour).padStart(2, '0')}:00`;
const formatMinutesLabel = (minutes: number) => {
  const safeMinutes = Math.max(0, Math.round(minutes));
  const hours = Math.floor(safeMinutes / 60) % 24;
  const mins = safeMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
};

const reservationStatusPalette = {
  confirmed: {
    line: 'bg-[#1FB6A6]',
    badge: 'bg-[#1FB6A6]/10 text-[#1FB6A6]',
  },
  pending: {
    line: 'bg-[#F59E0B]',
    badge: 'bg-[#F59E0B]/10 text-[#F59E0B]',
  },
  cancelled: {
    line: 'bg-[#EF4444]',
    badge: 'bg-[#EF4444]/10 text-[#EF4444]',
  },
  completed: {
    line: 'bg-[#0B1D2A]',
    badge: 'bg-[#0B1D2A]/10 text-[#0B1D2A]',
  },
};

const reservationStatusLabel = {
  confirmed: 'Confirmada',
  pending: 'Pendiente',
  cancelled: 'Cancelada',
  completed: 'Completada',
};

type ReservationLayout = {
  reservation: ProfessionalReservation;
  startMinutes: number;
  endMinutes: number;
  column: number;
  columns: number;
};

const buildDayLayouts = (items: ProfessionalReservation[]) => {
  const reservations = items
    .map((reservation) => {
      if (!reservation.time) return null;
      const startMinutes = parseTimeToMinutes(reservation.time);
      if (startMinutes === null) return null;
      const durationMinutes = parseDurationToMinutes(reservation.duration) ?? 30;
      return {
        reservation,
        startMinutes,
        endMinutes: startMinutes + durationMinutes,
      };
    })
    .filter(Boolean) as Array<{
    reservation: ProfessionalReservation;
    startMinutes: number;
    endMinutes: number;
  }>;

  reservations.sort((a, b) => a.startMinutes - b.startMinutes);

  const layouts: ReservationLayout[] = [];
  let active: Array<{ endMinutes: number; column: number }> = [];
  let groupIndexes: number[] = [];
  let groupColumns = 0;

  reservations.forEach((event) => {
    active = active.filter((item) => item.endMinutes > event.startMinutes);
    if (active.length === 0 && groupIndexes.length > 0) {
      groupIndexes.forEach((idx) => {
        layouts[idx].columns = groupColumns;
      });
      groupIndexes = [];
      groupColumns = 0;
    }

    const usedColumns = new Set(active.map((item) => item.column));
    let column = 0;
    while (usedColumns.has(column)) column += 1;

    const layout: ReservationLayout = {
      reservation: event.reservation,
      startMinutes: event.startMinutes,
      endMinutes: event.endMinutes,
      column,
      columns: 1,
    };

    layouts.push(layout);
    groupIndexes.push(layouts.length - 1);
    groupColumns = Math.max(groupColumns, active.length + 1, column + 1);
    active.push({ endMinutes: event.endMinutes, column });
  });

  if (groupIndexes.length > 0) {
    groupIndexes.forEach((idx) => {
      layouts[idx].columns = groupColumns;
    });
  }

  return layouts;
};

export default function ProfesionalDashboardPage() {
  const { profile } = useProfessionalProfile();
  const [reservations, setReservations] = useState<ProfessionalReservation[]>([]);
  const [schedule, setSchedule] = useState<ProfessionalSchedule | null>(null);
  const [calendarView, setCalendarView] = useState<'week' | 'month'>('week');
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] =
    useState<ProfessionalReservation | null>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);

  useEffect(() => {
    if (!profile?.id) return;
    setReservations(loadProfessionalReservations(profile.id));
    setSchedule(loadProfessionalSchedule(profile.id, { allowFallback: false }));
  }, [profile?.id]);

  useEffect(() => {
    if (selectedReservation) {
      const frame = requestAnimationFrame(() => setDrawerVisible(true));
      return () => cancelAnimationFrame(frame);
    }
    setDrawerVisible(false);
    return undefined;
  }, [selectedReservation]);

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
        dayNumber: date.getDate(),
        monthLabel: monthNamesShort[date.getMonth()],
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
  const handleToggleMenu = () => {
    setIsMenuOpen((prev) => !prev);
  };

  const handleOpenReservation = (reservation: ProfessionalReservation) => {
    setSelectedReservation(reservation);
  };

  const handleCloseReservation = () => {
    setDrawerVisible(false);
    window.setTimeout(() => {
      setSelectedReservation(null);
    }, 200);
  };

  const handleUpdateReservationStatus = (status: ReservationStatus) => {
    if (!selectedReservation || !profile?.id) return;
    const nextReservations = reservations.map((item) =>
      item.id === selectedReservation.id ? { ...item, status } : item,
    );
    setReservations(nextReservations);
    saveProfessionalReservations(profile.id, nextReservations);
    setSelectedReservation((prev) => (prev ? { ...prev, status } : prev));
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#FFFFFF_0%,#EEF2F6_45%,#D3D7DC_100%)] text-[#0E2A47]">
      <div className="flex min-h-screen flex-col">
        <Navbar
          variant="dashboard"
          showMenuButton
          onMenuClick={handleToggleMenu}
        />
        <div className="flex flex-1">
          <aside className="hidden w-[260px] shrink-0 border-r border-[#0E2A47]/10 bg-[#0B1D2A] lg:block">
            <div className="sticky top-0 h-screen overflow-y-auto">
              <ProfesionalSidebar profile={profile} active="Agenda" />
            </div>
          </aside>
          <div className="flex-1">
            {isMenuOpen ? (
              <div className="border-b border-[#0E2A47]/10 bg-[#0B1D2A] lg:hidden">
                <ProfesionalSidebar profile={profile} active="Agenda" />
              </div>
            ) : null}
            <main className="mx-auto w-full max-w-[1400px] px-4 py-8 sm:px-6 lg:px-10">
              <div className="space-y-10">
                <section className="border-b border-[#E2E7EC] bg-white/90 px-4 py-6 sm:px-6 lg:px-10">
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
                        href="/profesional/dashboard/reservas"
                        className="rounded-full border border-[#E2E7EC] bg-white px-4 py-2 text-sm font-semibold text-[#0E2A47] transition hover:-translate-y-0.5 hover:shadow-md"
                      >
                        Ver lista de reservas
                      </Link>
                      <Link
                        href="/profesional/dashboard/reservas#nueva-reserva"
                        className="rounded-full bg-[#0B1D2A] px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-md"
                      >
                        Crear reserva
                      </Link>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-6 sm:grid-cols-3">
                    {stats.map((item, index) => (
                      <div
                        key={item.label}
                        className={`flex flex-col gap-1 ${
                          index > 0 ? 'sm:border-l sm:border-[#E2E7EC] sm:pl-6' : ''
                        }`}
                      >
                        <p className="text-xs uppercase tracking-[0.3em] text-[#94A3B8]">
                          {item.label}
                        </p>
                        <p className="text-2xl font-semibold text-[#0E2A47]">
                          {item.value}
                        </p>
                        <p className="text-xs text-[#64748B]">{item.detail}</p>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-[28px] border border-white/70 bg-white/95 p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-[0.65rem] uppercase tracking-[0.35em] text-[#94A3B8]">
                        Agenda
                      </p>
                      <h2 className="mt-2 text-xl font-semibold text-[#0E2A47]">
                        {calendarView === 'week' ? 'Semana actual' : 'Calendario mensual'}
                      </h2>
                      <p className="mt-1 text-sm text-[#64748B]">
                        {calendarView === 'week' ? calendarWeekLabel : monthLabel}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex rounded-full border border-[#E2E7EC] bg-white p-0.5 shadow-sm">
                        <button
                          type="button"
                          onClick={() => handleSetView('week')}
                          className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                            calendarView === 'week'
                              ? 'bg-[#0B1D2A] text-white'
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
                              ? 'bg-[#0B1D2A] text-white'
                              : 'text-[#94A3B8] hover:text-[#64748B]'
                          }`}
                        >
                          Mensual
                        </button>
                      </div>

                      <div className="flex items-center gap-0.5 rounded-full border border-[#E2E7EC] bg-white px-1 py-1 shadow-sm">
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
                    <div className="mt-6 overflow-x-auto">
                      <div className="min-w-[980px] rounded-[24px] border border-[#E2E7EC] bg-white shadow-[0_20px_45px_rgba(15,23,42,0.08)]">
                        <div className="flex border-b border-[#E2E7EC] bg-[#F9FBFD]">
                          <div className="sticky left-0 z-20 w-20 shrink-0 bg-[#F9FBFD] px-4 py-3 text-[0.6rem] uppercase tracking-[0.3em] text-[#94A3B8]">
                            Hora
                          </div>
                          <div className="grid flex-1 grid-cols-7">
                            {weekDays.map((day, index) => {
                              const isToday = day.dateKey === todayKey;
                              return (
                                <div
                                  key={day.dateKey}
                                  className={`flex items-center justify-between px-4 py-3 text-xs ${
                                    index < weekDays.length - 1 ? 'border-r border-[#E2E7EC]' : ''
                                  } ${isToday ? 'bg-[#F2FFFB]' : ''}`}
                                >
                                  <span className="text-[0.6rem] uppercase tracking-[0.3em] text-[#94A3B8]">
                                    {dayLabelsShort[day.dayKey]}
                                  </span>
                                  <span className="text-sm font-semibold text-[#0E2A47]">
                                    {day.dayNumber}
                                    <span className="ml-1 text-[0.6rem] uppercase text-[#94A3B8]">
                                      {day.monthLabel}
                                    </span>
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        <div className="flex">
                          <div className="sticky left-0 z-10 w-20 shrink-0 border-r border-[#E2E7EC] bg-white shadow-[4px_0_12px_rgba(15,23,42,0.06)]">
                            <div className="relative" style={{ height: calendarHeight }}>
                              {hourSlots.map((hour, index) => {
                                const top = Math.min(
                                  index * hourRowHeight,
                                  calendarHeight - 14,
                                );
                                return (
                                  <div
                                    key={`hour-${hour}`}
                                    className="absolute right-3 text-[0.65rem] font-medium text-[#94A3B8]"
                                    style={{ top }}
                                  >
                                    {formatHourLabel(hour)}
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          <div className="grid flex-1 grid-cols-7">
                            {weekDays.map((day, index) => {
                              const dayReservations = reservationsByDate.get(day.dateKey) ?? [];
                              const dayLayouts = buildDayLayouts(dayReservations);
                              const isToday = day.dateKey === todayKey;
                              const baseBackground = index % 2 === 0 ? 'bg-white' : 'bg-[#FBFCFD]';
                              return (
                                <div
                                  key={day.dateKey}
                                  className={`relative ${
                                    index < weekDays.length - 1 ? 'border-r border-[#E2E7EC]' : ''
                                  } ${isToday ? 'bg-[#F2FFFB]' : baseBackground}`}
                                  style={{ height: calendarHeight }}
                                >
                                  <div className="pointer-events-none absolute inset-0">
                                    {hourSlots.slice(0, -1).map((hour, lineIndex) => (
                                      <div
                                        key={`${day.dateKey}-${hour}`}
                                        className="absolute left-0 right-0 border-b border-[#EEF2F6]"
                                        style={{
                                          top: lineIndex * hourRowHeight,
                                        }}
                                      />
                                    ))}
                                  </div>

                                  {dayLayouts.length === 0 ? (
                                    <div className="absolute left-3 top-3 rounded-full border border-dashed border-[#E2E7EC] bg-white px-3 py-1 text-[0.65rem] text-[#94A3B8]">
                                      Sin reservas
                                    </div>
                                  ) : null}

                                  {dayLayouts.map((layout) => {
                                    const dayStartMinutes = calendarStartHour * 60;
                                    const dayEndMinutes = calendarEndHour * 60;
                                    const clampedStart = Math.max(layout.startMinutes, dayStartMinutes);
                                    const clampedEnd = Math.min(layout.endMinutes, dayEndMinutes);
                                    if (clampedEnd <= dayStartMinutes || clampedStart >= dayEndMinutes) {
                                      return null;
                                    }

                                    const offsetMinutes = clampedStart - dayStartMinutes;
                                    const clampedMinutes = clampedEnd - clampedStart;
                                    const timeRangeLabel = `${formatMinutesLabel(layout.startMinutes)} – ${formatMinutesLabel(layout.endMinutes)}`;
                                    const top = (offsetMinutes / 60) * hourRowHeight;
                                    const height = Math.max(
                                      (clampedMinutes / 60) * hourRowHeight,
                                      28,
                                    );
                                    const showClient = height > 60;
                                    const isCompact = height < 50;
                                    const gap = 8;
                                    const columns = Math.max(layout.columns, 1);
                                    const width = `calc((100% - ${(columns - 1) * gap}px) / ${columns})`;
                                    const left = `calc(${layout.column} * ((100% - ${(columns - 1) * gap}px) / ${columns} + ${gap}px))`;
                                    const statusKey = layout.reservation.status ?? 'confirmed';
                                    const palette =
                                      reservationStatusPalette[
                                        statusKey as keyof typeof reservationStatusPalette
                                      ] ?? reservationStatusPalette.confirmed;
                                    const statusText =
                                      reservationStatusLabel[
                                        statusKey as keyof typeof reservationStatusLabel
                                      ] ?? reservationStatusLabel.confirmed;

                                    return (
                                      <button
                                        type="button"
                                        key={layout.reservation.id}
                                        className="absolute text-left"
                                        style={{ top, height, width, left }}
                                        onClick={() => handleOpenReservation(layout.reservation)}
                                      >
                                        <div className="group relative flex h-full flex-col justify-between overflow-hidden rounded-[10px] border border-[#E2E7EC] bg-white px-2 py-1.5 text-xs text-[#0E2A47] shadow-[0_2px_6px_rgba(15,23,42,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_6px_12px_rgba(15,23,42,0.12)]">
                                          <span
                                            className={`absolute left-0 top-0 h-full w-1 rounded-l-[10px] ${palette.line}`}
                                          />
                                          <span
                                            className={`absolute right-2 top-2 h-2 w-2 rounded-full ${palette.line}`}
                                            aria-hidden="true"
                                          />
                                          <div className="flex items-center justify-between gap-2">
                                            <span className="text-[0.65rem] font-medium text-[#64748B]">
                                              {timeRangeLabel}
                                            </span>
                                          </div>
                                          <p className={`mt-0.5 font-semibold text-[#0E2A47] ${isCompact ? 'text-xs' : 'text-sm'}`}>
                                            {layout.reservation.serviceName || 'Servicio'}
                                          </p>
                                          {showClient && layout.reservation.clientName ? (
                                            <p className="text-[0.7rem] text-[#94A3B8]">
                                              {layout.reservation.clientName}
                                            </p>
                                          ) : null}
                                        </div>
                                      </button>
                                    );
                                  })}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-6 border border-[#E2E7EC] bg-white">
                      <div className="grid grid-cols-7 gap-1 text-center">
                        {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((d) => (
                          <div key={d} className="py-2 text-xs font-semibold text-[#94A3B8]">
                            {d}
                          </div>
                        ))}
                      </div>
                      <div className="mt-1 grid grid-cols-7 gap-1 px-2 pb-2">
                        {monthGridDays.map((day) => {
                          const count = reservationsByDate.get(day.dateKey)?.length ?? 0;
                          return (
                            <div
                              key={day.dateKey}
                              className={`min-h-[60px] p-2 text-xs transition ${
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
                      <p className="border-t border-[#E2E7EC] py-3 text-center text-xs uppercase tracking-[0.4em] text-[#94A3B8]">
                        {monthLabel}
                      </p>
                    </div>
                  )}
                </section>
              </div>
            </main>
          </div>
        </div>
      </div>
      {selectedReservation ? (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button
            type="button"
            className={`absolute inset-0 bg-[#0B1D2A]/40 backdrop-blur-sm transition-opacity duration-200 ${
              drawerVisible ? 'opacity-100' : 'pointer-events-none opacity-0'
            }`}
            onClick={handleCloseReservation}
            aria-label="Cerrar detalle de reserva"
          />
          <aside
            className={`relative flex h-full w-full max-w-[420px] flex-col overflow-y-auto bg-white p-6 shadow-[-12px_0_40px_rgba(15,23,42,0.18)] transition-transform duration-300 ${
              drawerVisible ? 'translate-x-0' : 'translate-x-full'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-[#94A3B8]">
                  Reserva
                </p>
                <h3 className="mt-2 text-2xl font-semibold text-[#0E2A47]">
                  {selectedReservation.serviceName || 'Servicio'}
                </h3>
              </div>
              <button
                type="button"
                onClick={handleCloseReservation}
                className="rounded-full border border-[#E2E7EC] px-3 py-1 text-xs font-semibold text-[#64748B] transition hover:bg-[#F8FAFC]"
              >
                Cerrar
              </button>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  reservationStatusPalette[
                    (selectedReservation.status ?? 'confirmed') as keyof typeof reservationStatusPalette
                  ]?.badge ?? reservationStatusPalette.confirmed.badge
                }`}
              >
                {reservationStatusLabel[
                  (selectedReservation.status ?? 'confirmed') as keyof typeof reservationStatusLabel
                ] ?? reservationStatusLabel.confirmed}
              </span>
              <span className="text-xs text-[#64748B]">
                {selectedReservation.time
                  ? `${selectedReservation.time} – ${formatMinutesLabel(
                      parseTimeToMinutes(selectedReservation.time) ?? 0 +
                        (parseDurationToMinutes(selectedReservation.duration) ?? 30),
                    )}`
                  : 'Horario pendiente'}
              </span>
            </div>

            <div className="mt-6 space-y-4 text-sm text-[#64748B]">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-[#94A3B8]">
                  Cliente
                </p>
                <p className="mt-1 text-base font-semibold text-[#0E2A47]">
                  {selectedReservation.clientName || 'Cliente sin nombre'}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-[#94A3B8]">
                  Precio
                </p>
                <p className="mt-1 text-base font-semibold text-[#0E2A47]">
                  {selectedReservation.price
                    ? selectedReservation.price.includes('$')
                      ? selectedReservation.price
                      : `$${selectedReservation.price}`
                    : 'A definir'}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-[#94A3B8]">
                  Notas
                </p>
                <p className="mt-1 text-sm text-[#64748B]">
                  {selectedReservation.notes || 'Sin notas adicionales.'}
                </p>
              </div>
            </div>

            <div className="mt-8 grid gap-3">
              <button
                type="button"
                onClick={() => handleUpdateReservationStatus('confirmed')}
                className="rounded-full bg-[#1FB6A6] px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-md"
              >
                Confirmar
              </button>
              <button
                type="button"
                onClick={() => handleUpdateReservationStatus('cancelled')}
                className="rounded-full border border-[#FCA5A5] bg-[#FEF2F2] px-4 py-2 text-sm font-semibold text-[#DC2626] transition hover:-translate-y-0.5 hover:shadow-md"
              >
                Cancelar
              </button>
              <button
                type="button"
                className="rounded-full border border-[#E2E7EC] bg-white px-4 py-2 text-sm font-semibold text-[#0E2A47] transition hover:-translate-y-0.5 hover:shadow-md"
              >
                Editar
              </button>
              <Link
                href="/profesional/dashboard/reservas"
                className="rounded-full border border-[#E2E7EC] bg-[#F8FAFC] px-4 py-2 text-center text-sm font-semibold text-[#0E2A47] transition hover:-translate-y-0.5 hover:shadow-md"
              >
                Ver en reservas
              </Link>
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
