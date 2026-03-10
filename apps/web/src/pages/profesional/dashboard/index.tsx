'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { isAxiosError } from 'axios';
import Link from 'next/link';
import EmailVerificationPanel from '@/components/auth/EmailVerificationPanel';
import ProfesionalSidebar from '@/components/profesional/Sidebar';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { cn } from '@/components/ui/cn';
import { useProfessionalProfile } from '@/hooks/useProfessionalProfile';
import { useProfessionalDashboardUnsavedSection } from '@/context/ProfessionalDashboardUnsavedChangesContext';
import api from '@/services/api';
import {
  DashboardHero,
  DashboardSectionHeading,
  DashboardStatCard,
} from '@/components/profesional/dashboard/DashboardUI';
import {
  getProfessionalReservationsForDates,
  updateProfessionalReservationStatus,
} from '@/services/professionalBookings';
import type {
  ProfessionalReservation,
  ProfessionalSchedule,
  WorkDayKey,
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

const toLocalDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

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

const defaultCalendarStartHour = 8;
const defaultCalendarEndHour = 20;
const minCalendarHour = 6;
const maxCalendarHour = 23;
const minCalendarSpanHours = 8;
const hourRowHeight = 76;
const formatHourLabel = (hour: number) => `${String(hour).padStart(2, '0')}:00`;
const formatMinutesLabel = (minutes: number) => {
  const safeMinutes = Math.max(0, Math.round(minutes));
  const hours = Math.floor(safeMinutes / 60) % 24;
  const mins = safeMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
};
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const resolveReservationDurationMinutes = (reservation: ProfessionalReservation) =>
  reservation.effectiveDurationMinutes
  ?? parseDurationToMinutes(reservation.duration)
  ?? 30;

const reservationStatusPalette = {
  confirmed: {
    badge: 'bg-[#FFF0DD] text-[#B45309]',
  },
  pending: {
    badge: 'bg-[#FEF3C7] text-[#B45309]',
  },
  cancelled: {
    badge: 'bg-[#FEE2E2] text-[#B91C1C]',
  },
  completed: {
    badge: 'bg-[#E2E8F0] text-[#334155]',
  },
};

const reservationStatusLabel = {
  confirmed: 'Confirmada',
  pending: 'Pendiente',
  cancelled: 'Cancelada',
  completed: 'Completada',
};

const reservationCardAccentClassName = 'bg-[#FF7A00]';
const reservationCardClassName =
  'bg-[#FFF3E6] border-[#F4D4B0] hover:bg-[#FFE7CC]';

const resolveBackendMessage = (error: unknown, fallback: string) => {
  if (isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message || fallback;
  }
  return fallback;
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
      const durationMinutes = resolveReservationDurationMinutes(reservation);
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
  const { profile, refreshProfile } = useProfessionalProfile();
  const [reservations, setReservations] = useState<ProfessionalReservation[]>([]);
  const [schedule, setSchedule] = useState<ProfessionalSchedule | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [calendarView, setCalendarView] = useState<'week' | 'month'>('week');
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] =
    useState<ProfessionalReservation | null>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const closeTimeoutRef = useRef<number | null>(null);

  const { requestNavigation } = useProfessionalDashboardUnsavedSection({
    sectionId: 'agenda-dashboard',
    isDirty: false,
    isSaving: isUpdatingStatus,
  });

  useEffect(() => {
    if (!profile?.id) return;
    api
      .get<ProfessionalSchedule>('/profesional/schedule')
      .then((response) => {
        const data = response.data;
        if (!data || !Array.isArray(data.days)) {
          setSchedule(null);
          return;
        }
        setSchedule({
          days: data.days,
          pauses: Array.isArray(data.pauses) ? data.pauses : [],
        });
      })
      .catch(() => {
        setSchedule(null);
      });
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
  const currentMinutes = today.getHours() * 60 + today.getMinutes();
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

  const agendaReservations = useMemo(
    () => reservations.filter((reservation) => (reservation.status ?? 'pending') !== 'cancelled'),
    [reservations],
  );

  const reservationsByDate = useMemo(() => {
    const map = new Map<string, ProfessionalReservation[]>();
    agendaReservations.forEach((reservation) => {
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
  }, [agendaReservations]);

  const todayCount = agendaReservations.filter((r) => r.date === todayKey).length;
  const yesterdayCount = agendaReservations.filter((r) => r.date === yesterdayKey).length;
  const todayDiff = todayCount - yesterdayCount;

  const weekReservations = agendaReservations.filter(
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

  const requiredReservationDates = useMemo(() => {
    const dateKeys = new Set<string>([todayKey, yesterdayKey]);
    currentWeekDays.forEach((day) => dateKeys.add(day.dateKey));
    weekDays.forEach((day) => dateKeys.add(day.dateKey));
    monthGridDays.forEach((day) => dateKeys.add(day.dateKey));
    return Array.from(dateKeys).sort();
  }, [todayKey, yesterdayKey, currentWeekDays, weekDays, monthGridDays]);

  useEffect(() => {
    if (!profile?.id) return;

    let isCancelled = false;
    const loadReservations = async () => {
      try {
        const allReservations = await getProfessionalReservationsForDates(requiredReservationDates);
        if (isCancelled) return;
        setReservations(allReservations);
        setStatusMessage(null);
      } catch (error) {
        if (!isCancelled) {
          setReservations([]);
          setStatusMessage(
            resolveBackendMessage(error, 'No se pudieron cargar las reservas del panel.'),
          );
        }
      }
    };

    loadReservations();
    return () => {
      isCancelled = true;
    };
  }, [profile?.id, requiredReservationDates]);

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

  const visibleCalendarRange = useMemo(() => {
    const relevantMinutes: number[] = [];

    weekDays.forEach((day) => {
      const scheduleForDay = schedule?.days.find((item) => item.day === day.dayKey);
      scheduleForDay?.ranges?.forEach((range) => {
        const startMinutes = parseTimeToMinutes(range.start);
        const endMinutes = parseTimeToMinutes(range.end);
        if (startMinutes !== null) relevantMinutes.push(startMinutes);
        if (endMinutes !== null) relevantMinutes.push(endMinutes);
      });

      const reservationsForDay = reservationsByDate.get(day.dateKey) ?? [];
      reservationsForDay.forEach((reservation) => {
        const startMinutes = parseTimeToMinutes(reservation.time);
        if (startMinutes === null) return;
        relevantMinutes.push(startMinutes);
        relevantMinutes.push(startMinutes + resolveReservationDurationMinutes(reservation));
      });
    });

    if (relevantMinutes.length === 0) {
      const hourSlots = Array.from(
        { length: defaultCalendarEndHour - defaultCalendarStartHour + 1 },
        (_, index) => defaultCalendarStartHour + index,
      );
      return {
        startHour: defaultCalendarStartHour,
        endHour: defaultCalendarEndHour,
        hourSlots,
        calendarHeight: (defaultCalendarEndHour - defaultCalendarStartHour) * hourRowHeight,
        calendarTotalMinutes:
          (defaultCalendarEndHour - defaultCalendarStartHour) * 60,
      };
    }

    const earliestMinutes = Math.min(...relevantMinutes);
    const latestMinutes = Math.max(...relevantMinutes);
    let startHour = clamp(
      Math.floor(earliestMinutes / 60),
      minCalendarHour,
      maxCalendarHour - 1,
    );
    let endHour = clamp(
      Math.ceil(latestMinutes / 60),
      startHour + 1,
      maxCalendarHour + 1,
    );

    if (endHour - startHour < minCalendarSpanHours) {
      const desiredEnd = startHour + minCalendarSpanHours;
      if (desiredEnd <= maxCalendarHour + 1) {
        endHour = desiredEnd;
      } else {
        startHour = clamp(
          endHour - minCalendarSpanHours,
          minCalendarHour,
          maxCalendarHour + 1 - minCalendarSpanHours,
        );
      }
    }

    const hourSlots = Array.from(
      { length: endHour - startHour + 1 },
      (_, index) => startHour + index,
    );

    return {
      startHour,
      endHour,
      hourSlots,
      calendarHeight: (endHour - startHour) * hourRowHeight,
      calendarTotalMinutes: (endHour - startHour) * 60,
    };
  }, [reservationsByDate, schedule?.days, weekDays]);

  const currentTimeIndicator = useMemo(() => {
    if (calendarView !== 'week' || weekOffset !== 0) return null;
    const now = new Date();
    const nowKey = toLocalDateKey(now);
    const startMinutes = visibleCalendarRange.startHour * 60;
    const endMinutes = visibleCalendarRange.endHour * 60;
    const minutes = now.getHours() * 60 + now.getMinutes();
    if (minutes < startMinutes || minutes > endMinutes) return null;

    return {
      dateKey: nowKey,
      top: ((minutes - startMinutes) / visibleCalendarRange.calendarTotalMinutes) *
        visibleCalendarRange.calendarHeight,
      label: formatMinutesLabel(minutes),
    };
  }, [calendarView, visibleCalendarRange, weekOffset]);

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
  const canViewAnalytics = profile?.planCapabilities?.allowAnalytics === true;
  const nextReservation = useMemo(() => {
    return agendaReservations
      .filter((reservation) => {
        if (!reservation.date) return false;
        if (reservation.date > todayKey) return true;
        if (reservation.date < todayKey) return false;
        const minutes = parseTimeToMinutes(reservation.time);
        return minutes !== null && minutes >= currentMinutes;
      })
      .sort((a, b) => {
        const dateA = new Date(`${a.date}T${a.time || '00:00'}`).getTime();
        const dateB = new Date(`${b.date}T${b.time || '00:00'}`).getTime();
        return dateA - dateB;
      })[0] ?? null;
  }, [agendaReservations, currentMinutes, todayKey]);
  const todayPendingCount = agendaReservations.filter(
    (reservation) => reservation.date === todayKey && (reservation.status ?? 'pending') === 'pending',
  ).length;
  const daysWithOpenCapacity = Math.max(scheduleDays.length - daysWithReservations, 0);
  const agendaOverviewCards = [
    {
      label: 'Pendientes hoy',
      value: `${todayPendingCount}`,
      detail: todayPendingCount > 0 ? 'Turnos por confirmar' : 'Nada por validar',
      icon: 'warning' as const,
      tone: 'warm' as const,
    },
    {
      label: 'Próxima atención',
      value: nextReservation?.time || '--:--',
      detail: nextReservation
        ? `${nextReservation.clientName || 'Cliente'} · ${nextReservation.serviceName || 'Servicio'}`
        : 'Sin reservas próximas',
      icon: 'agenda' as const,
      tone: 'accent' as const,
    },
    {
      label: 'Días con espacio',
      value: `${daysWithOpenCapacity}`,
      detail: scheduleDays.length > 0 ? 'Jornadas con margen esta semana' : 'Sin jornada configurada',
      icon: 'spark' as const,
      tone: 'default' as const,
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
    if (closeTimeoutRef.current !== null) {
      window.clearTimeout(closeTimeoutRef.current);
    }
    closeTimeoutRef.current = window.setTimeout(() => {
      closeTimeoutRef.current = null;
      setSelectedReservation(null);
    }, 200);
  };

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current !== null) {
        window.clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  const handleUpdateReservationStatus = async (status: ReservationStatus) => {
    if (!selectedReservation) return;

    setIsUpdatingStatus(true);
    setStatusMessage(null);
    try {
      const updated = await updateProfessionalReservationStatus(selectedReservation.id, status);
      setReservations((prev) =>
        prev.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)),
      );
      setSelectedReservation((prev) =>
        prev && prev.id === updated.id ? { ...prev, ...updated } : prev,
      );
      setStatusMessage('Estado de reserva actualizado.');
    } catch (error) {
      setStatusMessage(
        resolveBackendMessage(error, 'No se pudo actualizar el estado de la reserva.'),
      );
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  return (
    <div className="app-shell min-h-screen bg-[color:var(--background)] text-[color:var(--ink)]">
      <div className="flex min-h-screen">
          <aside className="hidden w-[260px] shrink-0 border-r border-[color:var(--border-soft)] bg-[color:var(--sidebar-surface)] lg:block">
            <div className="sticky top-0 h-screen overflow-y-auto">
              <ProfesionalSidebar profile={profile} active="Agenda" />
            </div>
          </aside>
          <div className="flex-1">
            <div className="px-4 pt-4 sm:px-6 lg:hidden">
              <Button type="button" size="sm" onClick={handleToggleMenu}>
                {isMenuOpen ? 'Cerrar menu' : 'Abrir menu'}
              </Button>
            </div>
            {isMenuOpen ? (
              <div className="border-b border-[color:var(--border-soft)] bg-[color:var(--surface)]/92 backdrop-blur-xl lg:hidden">
                <ProfesionalSidebar profile={profile} active="Agenda" />
              </div>
            ) : null}
            <main className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
              <div className="space-y-10">
                <section className="space-y-5">
                  <DashboardHero
                    eyebrow="Centro operativo"
                    icon="agenda"
                    accent="ink"
                    title="Agenda y reservas con foco en lo urgente"
                    description="Controlá el día, anticipá huecos disponibles y resolvé rápido pendientes, confirmaciones y cambios de agenda."
                    meta={
                      <>
                        <span className="rounded-full border border-white/18 bg-white/10 px-3 py-1 text-xs font-semibold text-[color:var(--text-on-dark-secondary)] backdrop-blur-sm">
                          {todayCount} reservas hoy
                        </span>
                        <span className="rounded-full border border-white/18 bg-white/10 px-3 py-1 text-xs font-semibold text-[color:var(--text-on-dark-secondary)] backdrop-blur-sm">
                          {todayPendingCount} pendientes
                        </span>
                        {nextReservation ? (
                          <span className="rounded-full border border-white/18 bg-white/10 px-3 py-1 text-xs font-semibold text-[color:var(--text-on-dark-secondary)] backdrop-blur-sm">
                            Próxima: {nextReservation.time}
                          </span>
                        ) : null}
                      </>
                    }
                    actions={
                      <>
                        <Button
                          type="button"
                          variant="contrast"
                          onClick={() => {
                            requestNavigation('/profesional/dashboard/reservas');
                          }}
                        >
                          Ver reservas
                        </Button>
                        <Button
                          type="button"
                          variant="contrast"
                          onClick={() => {
                            requestNavigation('/profesional/dashboard/horarios');
                          }}
                        >
                          Ajustar horarios
                        </Button>
                      </>
                    }
                  />

                  {profile && !profile.emailVerified ? (
                    <EmailVerificationPanel
                      email={profile.email}
                      emailVerified={profile.emailVerified}
                      onStatusChanged={refreshProfile}
                      tone="professional"
                      variant="banner"
                      title="Tu email profesional todavía está pendiente"
                      description="Verificalo desde el dashboard para reforzar la identidad de la cuenta y asegurarte de recibir recuperaciones y comunicaciones críticas sin tener que recargar la página."
                    />
                  ) : null}

                  {statusMessage ? (
                    <p className="rounded-full border border-[#E2E8F0] bg-white/90 px-4 py-2 text-sm text-[#64748B] shadow-[var(--shadow-card)]">
                      {statusMessage}
                    </p>
                  ) : null}

                  <div className="grid gap-4 lg:grid-cols-[1.2fr,0.8fr]">
                    <div className="grid gap-4 sm:grid-cols-3">
                      {agendaOverviewCards.map((item) => (
                        <DashboardStatCard
                          key={item.label}
                          label={item.label}
                          value={item.value}
                          detail={item.detail}
                          icon={item.icon}
                          tone={item.tone}
                        />
                      ))}
                    </div>

                    {canViewAnalytics ? (
                      <Card className="border-white/70 bg-white/95 p-5">
                        <DashboardSectionHeading
                          eyebrow="Tendencia"
                          title="Pulso semanal"
                          description="Una lectura rápida del ritmo de tu agenda."
                        />
                        <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                          {stats.map((item, index) => (
                            <div
                              key={item.label}
                              className={cn(
                                'rounded-[20px] border p-4',
                                index === 0
                                  ? 'border-[#f4dcc7] bg-[#fff5e8]'
                                  : index === 1
                                    ? 'border-[#cdeee9] bg-[#f0fffc]'
                                    : 'border-[#E2E8F0] bg-[#F8FAFC]',
                              )}
                            >
                              <p className="text-[0.64rem] uppercase tracking-[0.26em] text-[#94A3B8]">
                                {item.label}
                              </p>
                              <p className="mt-2 text-2xl font-semibold text-[#0E2A47]">
                                {item.value}
                              </p>
                              <p className="mt-1 text-xs text-[#64748B]">{item.detail}</p>
                            </div>
                          ))}
                        </div>
                      </Card>
                    ) : null}
                  </div>
                </section>

                <section className="rounded-[28px] border border-white/70 bg-white/95 p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                  <DashboardSectionHeading
                    eyebrow="Agenda"
                    title={calendarView === 'week' ? 'Semana actual' : 'Calendario mensual'}
                    description={calendarView === 'week' ? calendarWeekLabel : monthLabel}
                  />

                  <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex rounded-full border border-[color:var(--border-soft)] bg-white p-0.5 shadow-[var(--shadow-card)]">
                        <button
                          type="button"
                            onClick={() => handleSetView('week')}
                            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                              calendarView === 'week'
                              ? 'bg-[color:var(--primary)] text-white'
                              : 'text-[color:var(--ink-faint)] hover:text-[color:var(--ink-muted)]'
                            }`}
                        >
                          Semanal
                        </button>
                        <button
                          type="button"
                            onClick={() => handleSetView('month')}
                            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                              calendarView === 'month'
                              ? 'bg-[color:var(--primary)] text-white'
                              : 'text-[color:var(--ink-faint)] hover:text-[color:var(--ink-muted)]'
                            }`}
                        >
                          Mensual
                        </button>
                      </div>

                      <div className="flex items-center gap-0.5 rounded-full border border-[color:var(--border-soft)] bg-white px-1 py-1 shadow-[var(--shadow-card)]">
                        <button
                          type="button"
                          onClick={handlePrev}
                          className="rounded-full px-2 py-1 text-sm text-[color:var(--ink-muted)] transition hover:bg-[color:var(--surface-soft)] hover:text-[color:var(--ink)]"
                        >
                          ‹
                        </button>
                        <span className="min-w-[120px] text-center text-xs font-medium text-[color:var(--ink-muted)]">
                          {calendarView === 'week' ? calendarWeekLabel : monthLabel}
                        </span>
                        <button
                          type="button"
                          onClick={handleNext}
                          className="rounded-full px-2 py-1 text-sm text-[color:var(--ink-muted)] transition hover:bg-[color:var(--surface-soft)] hover:text-[color:var(--ink)]"
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
                      <div className="min-w-[980px] overflow-hidden rounded-[24px] border border-[#E2E7EC] bg-white shadow-[0_20px_45px_rgba(15,23,42,0.08)]">
                        <div className="flex border-b border-[#E2E7EC] bg-[linear-gradient(180deg,#FAFCFE_0%,#F4F8FB_100%)]">
                          <div className="sticky left-0 z-20 w-20 shrink-0 bg-[linear-gradient(180deg,#FAFCFE_0%,#F4F8FB_100%)] px-4 py-3 text-[0.6rem] uppercase tracking-[0.3em] text-[#94A3B8]">
                            Hora
                          </div>
                          <div className="grid flex-1 grid-cols-7">
                            {weekDays.map((day, index) => {
                              const isToday = day.dateKey === todayKey;
                              const reservationCount =
                                reservationsByDate.get(day.dateKey)?.length ?? 0;
                              return (
                                <div
                                  key={day.dateKey}
                                  className={`px-4 py-3 text-xs ${
                                    index < weekDays.length - 1 ? 'border-r border-[#E2E7EC]' : ''
                                  } ${isToday ? 'bg-[#F2FFFB]' : ''}`}
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div>
                                      <p className="text-[0.6rem] uppercase tracking-[0.3em] text-[#94A3B8]">
                                        {dayLabelsShort[day.dayKey]}
                                      </p>
                                      <p className="mt-1 text-sm font-semibold text-[#0E2A47]">
                                        {day.dayNumber}
                                        <span className="ml-1 text-[0.6rem] uppercase text-[#94A3B8]">
                                          {day.monthLabel}
                                        </span>
                                      </p>
                                    </div>
                                    <span className={`rounded-full px-2 py-1 text-[0.62rem] font-semibold ${
                                      reservationCount > 0
                                        ? 'bg-[#1FB6A6]/10 text-[#1FB6A6]'
                                        : 'bg-[#F3F6F9] text-[#94A3B8]'
                                    }`}>
                                      {reservationCount > 0 ? `${reservationCount} res.` : 'Libre'}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        <div className="flex">
                          <div className="sticky left-0 z-10 w-20 shrink-0 border-r border-[#E2E7EC] bg-white shadow-[4px_0_12px_rgba(15,23,42,0.06)]">
                            <div className="relative" style={{ height: visibleCalendarRange.calendarHeight }}>
                              {visibleCalendarRange.hourSlots.map((hour, index) => {
                                const top = Math.min(
                                  index * hourRowHeight,
                                  visibleCalendarRange.calendarHeight - 14,
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
                                  style={{ height: visibleCalendarRange.calendarHeight }}
                                >
                                  <div className="pointer-events-none absolute inset-0">
                                    {visibleCalendarRange.hourSlots.slice(0, -1).map((hour, lineIndex) => (
                                      <div
                                        key={`${day.dateKey}-${hour}`}
                                        className="absolute left-0 right-0 border-b border-dashed border-[#E9EEF4]"
                                        style={{
                                          top: lineIndex * hourRowHeight,
                                        }}
                                      />
                                    ))}
                                    {currentTimeIndicator && currentTimeIndicator.dateKey === day.dateKey ? (
                                      <div
                                        className="absolute left-0 right-0 z-[1] border-t border-[#F97316]"
                                        style={{ top: currentTimeIndicator.top }}
                                      >
                                        <span className="absolute -left-1.5 -top-1.5 h-3 w-3 rounded-full border-2 border-white bg-[#F97316] shadow-sm" />
                                      </div>
                                    ) : null}
                                  </div>

                                  {dayLayouts.length === 0 ? (
                                    isToday ? (
                                      <div className="absolute left-3 top-3 rounded-full border border-dashed border-[#D7E6DF] bg-white/92 px-3 py-1 text-[0.65rem] text-[#94A3B8]">
                                        Sin reservas
                                      </div>
                                    ) : null
                                  ) : null}

                                  {dayLayouts.map((layout) => {
                                    const dayStartMinutes = visibleCalendarRange.startHour * 60;
                                    const dayEndMinutes = visibleCalendarRange.endHour * 60;
                                    const clampedStart = Math.max(layout.startMinutes, dayStartMinutes);
                                    const clampedEnd = Math.min(layout.endMinutes, dayEndMinutes);
                                    if (clampedEnd <= dayStartMinutes || clampedStart >= dayEndMinutes) {
                                      return null;
                                    }

                                    const offsetMinutes = clampedStart - dayStartMinutes;
                                    const clampedMinutes = clampedEnd - clampedStart;
                                    const timeRangeLabel = `${formatMinutesLabel(layout.startMinutes)} – ${formatMinutesLabel(layout.endMinutes)}`;
                                    const top = (offsetMinutes / visibleCalendarRange.calendarTotalMinutes) *
                                      visibleCalendarRange.calendarHeight;
                                    const height = Math.max(
                                      (clampedMinutes / visibleCalendarRange.calendarTotalMinutes) *
                                        visibleCalendarRange.calendarHeight,
                                      44,
                                    );
                                    const showClient = height >= 56;
                                    const showStatus = height >= 90;
                                    const isCompact = height < 56;
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
                                        className="absolute z-[2] cursor-pointer text-left"
                                        style={{ top, height, width, left }}
                                        onClick={() => handleOpenReservation(layout.reservation)}
                                      >
                                        <div className={`group relative flex h-full min-h-[44px] flex-col overflow-hidden rounded-[10px] border px-2.5 py-2 text-left shadow-[0_6px_18px_rgba(15,23,42,0.10)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_24px_rgba(15,23,42,0.14)] ${reservationCardClassName} ${
                                          isToday ? 'ring-1 ring-[#FFD9B0]' : ''
                                        }`}>
                                          <span
                                            className={`absolute left-0 top-0 h-full w-1 rounded-l-[10px] ${reservationCardAccentClassName}`}
                                          />
                                          <div className="flex items-start justify-between gap-2 pl-1.5">
                                            <span className="text-[12px] font-medium leading-none text-[#475569]">
                                              {timeRangeLabel}
                                            </span>
                                            {showStatus ? (
                                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${palette.badge}`}>
                                                {statusText}
                                              </span>
                                            ) : (
                                              <span
                                                className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full bg-[#FF7A00]"
                                                aria-hidden="true"
                                              />
                                            )}
                                          </div>
                                          <p className={`mt-1 pl-1.5 font-semibold text-[#0F172A] ${isCompact ? 'text-[13px] leading-tight' : 'text-[14px] leading-snug'}`}>
                                            {layout.reservation.serviceName || 'Servicio'}
                                          </p>
                                          {showClient && layout.reservation.clientName ? (
                                            <p className="mt-1 line-clamp-2 pl-1.5 text-[12px] leading-snug text-[#334155]">
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
                    <div className="mt-6 overflow-hidden rounded-[24px] border border-[#E2E7EC] bg-white shadow-[0_16px_36px_rgba(15,23,42,0.06)]">
                      <div className="grid grid-cols-7 gap-1 border-b border-[#E2E7EC] bg-[#F8FAFC] px-2 text-center">
                        {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((d) => (
                          <div key={d} className="py-2 text-xs font-semibold text-[#94A3B8]">
                            {d}
                          </div>
                        ))}
                      </div>
                      <div className="grid grid-cols-7 gap-1 p-2">
                        {monthGridDays.map((day) => {
                          const dayReservations = reservationsByDate.get(day.dateKey) ?? [];
                          const count = dayReservations.length;
                          return (
                            <div
                              key={day.dateKey}
                              className={`min-h-[96px] rounded-[16px] p-2 text-xs transition ${
                                day.isToday
                                  ? 'bg-[color:var(--primary)] text-white shadow-[var(--shadow-card)]'
                                  : day.isCurrentMonth
                                    ? 'bg-[color:var(--surface-muted)] text-[color:var(--ink)]'
                                    : 'bg-transparent text-[color:var(--border-strong)]'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <p className={`font-semibold ${day.isToday ? 'text-white' : ''}`}>
                                  {day.day}
                                </p>
                                {count > 0 ? (
                                  <span
                                    className={`rounded-full px-1.5 py-0.5 text-[0.58rem] font-semibold ${
                                      day.isToday
                                        ? 'bg-white/20 text-white'
                                        : 'bg-[color:var(--primary-soft)] text-[color:var(--primary)]'
                                    }`}
                                  >
                                    {count}
                                  </span>
                                ) : null}
                              </div>
                              {count > 0 ? (
                                <div className="mt-2 space-y-1">
                                  {dayReservations.slice(0, 2).map((reservation) => (
                                    <div
                                      key={reservation.id}
                                      className={`truncate rounded-md px-2 py-1 text-[0.62rem] font-medium ${
                                        day.isToday
                                          ? 'bg-white/12 text-white'
                                          : 'bg-white text-[color:var(--ink-muted)]'
                                      }`}
                                    >
                                      {reservation.time} · {reservation.serviceName}
                                    </div>
                                  ))}
                                  {count > 2 ? (
                                    <p className={`text-[0.58rem] ${day.isToday ? 'text-white/70' : 'text-[color:var(--ink-faint)]'}`}>
                                      +{count - 2} más
                                    </p>
                                  ) : null}
                                </div>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                      <p className="border-t border-[color:var(--border-soft)] py-3 text-center text-xs uppercase tracking-[0.4em] text-[color:var(--ink-faint)]">
                        {monthLabel}
                      </p>
                    </div>
                  )}
                </section>
              </div>
            </main>
          </div>
        </div>
      {selectedReservation ? (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button
            type="button"
            className={`absolute inset-0 bg-[rgba(18,49,38,0.32)] backdrop-blur-sm transition-opacity duration-200 ${
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
                <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--ink-faint)]">
                  Reserva
                </p>
                <h3 className="mt-2 text-2xl font-semibold text-[color:var(--ink)]">
                  {selectedReservation.serviceName || 'Servicio'}
                </h3>
              </div>
              <button
                type="button"
                onClick={handleCloseReservation}
                className="rounded-full border border-[color:var(--border-soft)] px-3 py-1 text-xs font-semibold text-[color:var(--ink-muted)] transition hover:bg-[color:var(--surface-soft)]"
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
              <span className="text-xs text-[color:var(--ink-muted)]">
                {selectedReservation.time
                  ? `${selectedReservation.time} – ${formatMinutesLabel(
                      parseTimeToMinutes(selectedReservation.time) ?? 0 +
                        (selectedReservation.effectiveDurationMinutes
                          ?? parseDurationToMinutes(selectedReservation.duration)
                          ?? 30),
                    )}`
                  : 'Horario pendiente'}
              </span>
            </div>

            <div className="mt-6 space-y-4 text-sm text-[color:var(--ink-muted)]">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--ink-faint)]">
                  Cliente
                </p>
                <p className="mt-1 text-base font-semibold text-[color:var(--ink)]">
                  {selectedReservation.clientName || 'Cliente sin nombre'}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--ink-faint)]">
                  Precio
                </p>
                <p className="mt-1 text-base font-semibold text-[color:var(--ink)]">
                  {selectedReservation.price
                    ? selectedReservation.price.includes('$')
                      ? selectedReservation.price
                      : `$${selectedReservation.price}`
                    : 'A definir'}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--ink-faint)]">
                  Notas
                </p>
                <p className="mt-1 text-sm text-[color:var(--ink-muted)]">
                  {selectedReservation.notes || 'Sin notas adicionales.'}
                </p>
              </div>
            </div>

            <div className="mt-8 grid gap-3">
              <button
                type="button"
                onClick={() => handleUpdateReservationStatus('confirmed')}
                disabled={isUpdatingStatus}
                className="rounded-full bg-[color:var(--primary)] px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[color:var(--primary-strong)] hover:shadow-[var(--shadow-card)]"
              >
                Confirmar
              </button>
              <button
                type="button"
                onClick={() => handleUpdateReservationStatus('completed')}
                disabled={isUpdatingStatus}
                className="rounded-full border border-[color:var(--primary-soft)] bg-[color:var(--primary-soft)] px-4 py-2 text-sm font-semibold text-[color:var(--primary-strong)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-card)]"
              >
                Completar
              </button>
              <button
                type="button"
                onClick={() => handleUpdateReservationStatus('cancelled')}
                disabled={isUpdatingStatus}
                className="rounded-full border border-[#FCA5A5] bg-[#FEF2F2] px-4 py-2 text-sm font-semibold text-[#DC2626] transition hover:-translate-y-0.5 hover:shadow-md"
              >
                Cancelar
              </button>
              <Link
                href="/profesional/dashboard/reservas"
                className="rounded-full border border-[color:var(--border-soft)] bg-[color:var(--surface-soft)] px-4 py-2 text-center text-sm font-semibold text-[color:var(--ink)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-card)]"
                onClick={(event) => {
                  event.preventDefault();
                  requestNavigation('/profesional/dashboard/reservas');
                }}
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
