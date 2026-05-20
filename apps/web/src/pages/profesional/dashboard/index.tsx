'use client';

import { memo, useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { isAxiosError } from 'axios';
import Link from 'next/link';
import EmailVerificationPanel from '@/components/auth/EmailVerificationPanel';
import ProfessionalDashboardShell from '@/components/profesional/dashboard/ProfessionalDashboardShell';
import Button from '@/components/ui/Button';
import { resolveProfessionalFeatureAccess } from '@/lib/billing/featureGuards';
import { useProfessionalProfile } from '@/hooks/useProfessionalProfile';
import { useProfessionalDashboardUnsavedSection } from '@/context/ProfessionalDashboardUnsavedChangesContext';
import api from '@/services/api';
import {
  DashboardIcon,
  DashboardStatCard,
} from '@/components/profesional/dashboard/DashboardUI';
import {
  getProfessionalReservationsForDates,
  updateProfessionalReservationStatus,
} from '@/services/professionalBookings';
import { getProfessionalAnalyticsSummary, type ProfessionalAnalyticsSummary } from '@/services/professionalAnalytics';
import { getOperationalStatusLabel, getOperationalStatusTone } from '@/utils/bookings';
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

const getMonthDateKeys = (date: Date) => {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return Array.from({ length: lastDay.getDate() }, (_, index) => {
    const current = new Date(firstDay);
    current.setDate(firstDay.getDate() + index);
    return toLocalDateKey(current);
  });
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

const fullDayStartMinutes = 0;
const fullDayEndMinutes = 24 * 60;
const defaultCalendarStartMinutes = 8 * 60;
const defaultCalendarEndMinutes = 20 * 60;
const calendarStepMinutes = 30;
const calendarLabelStepMinutes = 60;
const calendarMarginMinutes = 30;
const minCalendarSpanMinutes = 3 * 60;
const hourRowHeight = 68;
const formatMinutesLabel = (minutes: number) => {
  const safeMinutes = Math.max(0, Math.round(minutes));
  const hours = Math.floor(safeMinutes / 60) % 24;
  const mins = safeMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
};
const formatDateShort = (dateKey: string) => {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(year, (month || 1) - 1, day || 1);
  return new Intl.DateTimeFormat('es-AR', {
    day: 'numeric',
    month: 'short',
  }).format(date);
};
const parseMoneyValue = (value?: string) => {
  if (!value) return 0;
  const normalized = value
    .replace(/\s/g, '')
    .replace(/[^0-9,.-]/g, '')
    .replace(/\.(?=\d{3}(?:\D|$))/g, '')
    .replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};
const formatMoneyValue = (value: number) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(value);
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const roundDownToStep = (value: number, step: number) => Math.floor(value / step) * step;
const roundUpToStep = (value: number, step: number) => Math.ceil(value / step) * step;

const resolveReservationDurationMinutes = (reservation: ProfessionalReservation) =>
  reservation.effectiveDurationMinutes
  ?? parseDurationToMinutes(reservation.duration)
  ?? 30;

const reservationStatusToOperationalStatus: Record<ReservationStatus, 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW'> = {
  pending: 'PENDING',
  confirmed: 'CONFIRMED',
  cancelled: 'CANCELLED',
  completed: 'COMPLETED',
  no_show: 'NO_SHOW',
};

const reservationStatusPalette: Record<ReservationStatus, {
  accent: string;
  card: string;
  dot: string;
  monthCard: string;
  monthCardToday: string;
}> = {
  confirmed: {
    accent: 'bg-[#1FB6A6]',
    card: 'bg-[#EBFBF8] border-[#BDEDE6] hover:bg-[#D9F7F1]',
    dot: 'bg-[#1FB6A6]',
    monthCard: 'border border-[#BDEDE6] bg-[#EBFBF8] text-[#0F766E]',
    monthCardToday: 'border border-[#8DE0D4] bg-[#E0F7F3] text-[#0F766E]',
  },
  pending: {
    accent: 'bg-[#F59E0B]',
    card: 'bg-[#FFFBEB] border-[#FDE68A] hover:bg-[#FEF3C7]',
    dot: 'bg-[#F59E0B]',
    monthCard: 'border border-[#FDE68A] bg-[#FFFBEB] text-[#92400E]',
    monthCardToday: 'border border-[#FCD34D] bg-[#FEF3C7] text-[#92400E]',
  },
  cancelled: {
    accent: 'bg-[#EF4444]',
    card: 'bg-[#FEF2F2] border-[#FECACA] hover:bg-[#FEE2E2]',
    dot: 'bg-[#EF4444]',
    monthCard: 'border border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C]',
    monthCardToday: 'border border-[#FCA5A5] bg-[#FEE2E2] text-[#991B1B]',
  },
  completed: {
    accent: 'bg-[#0B1D2A]',
    card: 'bg-[#F3F6F9] border-[#D7E0E8] hover:bg-[#E8EEF4]',
    dot: 'bg-[#0B1D2A]',
    monthCard: 'border border-[#D7E0E8] bg-[#F3F6F9] text-[#334155]',
    monthCardToday: 'border border-[#C5D2DE] bg-[#E7EDF4] text-[#0B1D2A]',
  },
  no_show: {
    accent: 'bg-[#7C3AED]',
    card: 'bg-[#F5F0FF] border-[#DCCDFE] hover:bg-[#EEE4FF]',
    dot: 'bg-[#7C3AED]',
    monthCard: 'border border-[#DCCDFE] bg-[#F5F0FF] text-[#6D28D9]',
    monthCardToday: 'border border-[#C4B5FD] bg-[#EFE6FF] text-[#5B21B6]',
  },
};

const getReservationStatusKey = (
  status?: ReservationStatus | null,
): ReservationStatus => status ?? 'pending';

const getReservationStatusPalette = (status?: ReservationStatus | null) =>
  reservationStatusPalette[getReservationStatusKey(status)];

const getReservationStatusBadge = (status?: ReservationStatus | null) => {
  const operationalStatus = reservationStatusToOperationalStatus[getReservationStatusKey(status)];
  return {
    className: getOperationalStatusTone(operationalStatus),
    label: getOperationalStatusLabel(operationalStatus),
  };
};

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

type WeekCalendarDay = {
  dayKey: WorkDayKey;
  dateKey: string;
  label: string;
  dayNumber: number;
  monthLabel: string;
};

type MonthCalendarDay = {
  dayKey: WorkDayKey;
  dateKey: string;
  day: number;
  isCurrentMonth: boolean;
  isToday: boolean;
};

type VisibleCalendarRange = {
  startMinutes: number;
  endMinutes: number;
  lineMarkers: number[];
  labelMarkers: number[];
  calendarHeight: number;
  calendarTotalMinutes: number;
};

type CurrentTimeIndicator = {
  dateKey: string;
  top: number;
  label: string;
};

type CalendarFocusWindow = {
  startMinutes: number;
  endMinutes: number;
  isFallback: boolean;
};

const buildWeekFocusWindow = (
  weekDays: WeekCalendarDay[],
  schedule: ProfessionalSchedule | null,
  reservationsByDate: Map<string, ProfessionalReservation[]>,
) => {
  const relevantMinutes: number[] = [];

  weekDays.forEach((day) => {
    const scheduleForDay = schedule?.days.find((item) => item.day === day.dayKey);
    if (scheduleForDay?.enabled && !scheduleForDay.paused) {
      scheduleForDay.ranges?.forEach((range) => {
        const startMinutes = parseTimeToMinutes(range.start);
        const endMinutes = parseTimeToMinutes(range.end);
        if (startMinutes !== null) relevantMinutes.push(startMinutes);
        if (endMinutes !== null) relevantMinutes.push(endMinutes);
      });
    }

    const reservationsForDay = reservationsByDate.get(day.dateKey) ?? [];
    reservationsForDay.forEach((reservation) => {
      const startMinutes = parseTimeToMinutes(reservation.time);
      if (startMinutes === null) return;
      relevantMinutes.push(startMinutes);
      relevantMinutes.push(startMinutes + resolveReservationDurationMinutes(reservation));
    });
  });

  let rawStartMinutes = defaultCalendarStartMinutes;
  let rawEndMinutes = defaultCalendarEndMinutes;

  if (relevantMinutes.length > 0) {
    const firstRelevantMinute = Math.min(...relevantMinutes);
    const lastRelevantMinute = Math.max(...relevantMinutes);
    if (firstRelevantMinute < defaultCalendarStartMinutes) {
      rawStartMinutes = Math.max(firstRelevantMinute - calendarMarginMinutes, fullDayStartMinutes);
    }
    if (lastRelevantMinute > defaultCalendarEndMinutes) {
      rawEndMinutes = Math.min(lastRelevantMinute + calendarMarginMinutes, fullDayEndMinutes);
    }
  }

  let startMinutes = roundDownToStep(rawStartMinutes, calendarStepMinutes);
  let endMinutes = roundUpToStep(rawEndMinutes, calendarStepMinutes);

  if (endMinutes - startMinutes < minCalendarSpanMinutes) {
    const missingMinutes = minCalendarSpanMinutes - (endMinutes - startMinutes);
    const extendBefore = Math.floor(missingMinutes / 2);
    const extendAfter = missingMinutes - extendBefore;
    startMinutes = roundDownToStep(
      Math.max(startMinutes - extendBefore, fullDayStartMinutes),
      calendarStepMinutes,
    );
    endMinutes = roundUpToStep(
      Math.min(endMinutes + extendAfter, fullDayEndMinutes),
      calendarStepMinutes,
    );
  }

  return {
    startMinutes,
    endMinutes,
    isFallback: relevantMinutes.length === 0,
  } satisfies CalendarFocusWindow;
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

const WeekCalendarBoard = memo(function WeekCalendarBoard({
  weekDays,
  todayKey,
  visibleCalendarRange,
  dayLayoutsByDate,
  currentTimeIndicator,
  scrollContainerRef,
  onReservationOpen,
}: {
  weekDays: WeekCalendarDay[];
  todayKey: string;
  visibleCalendarRange: VisibleCalendarRange;
  dayLayoutsByDate: Map<string, ReservationLayout[]>;
  currentTimeIndicator: CurrentTimeIndicator | null;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  onReservationOpen: (reservation: ProfessionalReservation) => void;
}) {
  const rowStartMinutes = roundDownToStep(visibleCalendarRange.startMinutes, calendarLabelStepMinutes);
  const rowEndMinutes = roundUpToStep(visibleCalendarRange.endMinutes, calendarLabelStepMinutes);
  const hourMarkers = Array.from(
    { length: Math.floor((rowEndMinutes - rowStartMinutes) / calendarLabelStepMinutes) + 1 },
    (_, index) => rowStartMinutes + (index * calendarLabelStepMinutes),
  );
  const currentIndicatorMinutes = currentTimeIndicator
    ? visibleCalendarRange.startMinutes
      + ((currentTimeIndicator.top / visibleCalendarRange.calendarHeight)
        * visibleCalendarRange.calendarTotalMinutes)
    : null;

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[860px] bg-white lg:min-w-0">
        <div className="grid grid-cols-[60px_repeat(7,minmax(0,1fr))] border-b border-[#E2E8F0] bg-[#F8FAFC]">
          <div className="p-2.5" aria-hidden="true" />
          {weekDays.map((day) => {
            const isToday = day.dateKey === todayKey;
            return (
              <div
                key={day.dateKey}
                className={`border-l border-[#EDF2F7] p-2.5 text-center ${isToday ? 'bg-[#ECFDF5]' : ''}`}
              >
                <p className={`text-sm font-medium ${isToday ? 'text-[#0F766E]' : 'text-[#0F172A]'}`}>
                  {dayLabelsShort[day.dayKey]} {day.dayNumber}
                </p>
              </div>
            );
          })}
        </div>

        <div
          ref={scrollContainerRef}
          className="relative min-h-[430px] max-h-[560px] overflow-y-auto overscroll-contain scroll-smooth lg:max-h-[calc(100vh-292px)]"
        >
          {hourMarkers.map((hourStartMinutes) => (
            <div
              key={hourStartMinutes}
              className="grid grid-cols-[60px_repeat(7,minmax(0,1fr))] border-b border-[#EDF2F7] last:border-b-0"
            >
              <div className="min-h-[68px] bg-[#F8FAFC]/70 p-2.5 pr-2 text-right text-xs text-[#94A3B8]">
                {formatMinutesLabel(hourStartMinutes)}
              </div>
              {weekDays.map((day, index) => {
                const isToday = day.dateKey === todayKey;
                const baseBackground = index % 2 === 0 ? 'bg-white' : 'bg-[#FCFDFE]';
                const dayLayouts = dayLayoutsByDate.get(day.dateKey) ?? [];
                const reservationsInHour = dayLayouts.filter(
                  (layout) =>
                    layout.startMinutes >= hourStartMinutes
                    && layout.startMinutes < hourStartMinutes + calendarLabelStepMinutes,
                );
                const showNowLine = currentTimeIndicator?.dateKey === day.dateKey
                  && currentIndicatorMinutes !== null
                  && currentIndicatorMinutes >= hourStartMinutes
                  && currentIndicatorMinutes < hourStartMinutes + calendarLabelStepMinutes;
                const nowLineTop = currentIndicatorMinutes === null
                  ? 0
                  : ((currentIndicatorMinutes - hourStartMinutes) / calendarLabelStepMinutes) * hourRowHeight;

                return (
                  <div
                    key={`${day.dateKey}-${hourStartMinutes}`}
                    className={`relative min-h-[68px] border-l border-[#EDF2F7] p-1 ${
                      isToday ? 'bg-[#F0FDFA]' : baseBackground
                    }`}
                  >
                    {showNowLine ? (
                      <div
                        className="pointer-events-none absolute left-0 right-0 z-[1] border-t border-[#0F766E]"
                        style={{ top: nowLineTop }}
                      />
                    ) : null}
                    <div className="relative z-[2] space-y-1">
                      {reservationsInHour.map((layout) => {
                        const palette = getReservationStatusPalette(layout.reservation.status);
                        const statusTextClassName = layout.reservation.status === 'pending'
                          ? 'text-[#92400E]'
                          : layout.reservation.status === 'cancelled'
                            ? 'text-[#B91C1C]'
                            : layout.reservation.status === 'completed'
                              ? 'text-[#475569]'
                              : layout.reservation.status === 'no_show'
                                ? 'text-[#6D28D9]'
                                : 'text-[#0F766E]';

                        return (
                          <button
                            type="button"
                            key={layout.reservation.id}
                            onClick={() => onReservationOpen(layout.reservation)}
                            className={`w-full rounded-md border p-2 text-left shadow-[0_1px_1px_rgba(15,23,42,0.04)] transition hover:shadow-sm ${palette.card}`}
                          >
                            <p className="text-xs font-semibold leading-none text-[#0F172A]">
                              {layout.reservation.time || '--:--'}
                            </p>
                            <p className={`mt-1 truncate text-xs font-semibold ${statusTextClassName}`}>
                              {layout.reservation.serviceName || 'Servicio'}
                            </p>
                            {layout.reservation.clientName ? (
                              <p className="mt-0.5 truncate text-xs text-[#64748B]">
                                {layout.reservation.clientName}
                              </p>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

const MonthCalendarBoard = memo(function MonthCalendarBoard({
  monthGridDays,
  reservationsByDate,
  monthLabel,
}: {
  monthGridDays: MonthCalendarDay[];
  reservationsByDate: Map<string, ProfessionalReservation[]>;
  monthLabel: string;
}) {
  return (
    <div className="overflow-hidden bg-white">
      <div className="grid grid-cols-7 gap-1 border-b border-[#E2E8F0] bg-[#F8FAFC] px-2 text-center">
        {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((dayLabel) => (
          <div key={dayLabel} className="py-2 text-xs font-semibold text-[#94A3B8]">
            {dayLabel}
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
              className={`min-h-[96px] rounded-xl p-2 text-xs transition ${
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
                  {dayReservations.slice(0, 2).map((reservation) => {
                    const palette = getReservationStatusPalette(reservation.status);
                    return (
                      <div
                        key={reservation.id}
                        className={`truncate rounded-md px-2 py-1 text-[0.62rem] font-medium ${
                          day.isToday ? palette.monthCardToday : palette.monthCard
                        }`}
                      >
                        {reservation.time} · {reservation.serviceName}
                      </div>
                    );
                  })}
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
      <p className="border-t border-[#E2E8F0] py-3 text-center text-xs font-semibold uppercase tracking-[0.24em] text-[#94A3B8]">
        {monthLabel}
      </p>
    </div>
  );
});

export default function ProfesionalDashboardPage() {
  const { profile, refreshProfile } = useProfessionalProfile();
  const featureAccess = resolveProfessionalFeatureAccess(profile);
  const [reservations, setReservations] = useState<ProfessionalReservation[]>([]);
  const [schedule, setSchedule] = useState<ProfessionalSchedule | null>(null);
  const [analyticsSummary, setAnalyticsSummary] = useState<ProfessionalAnalyticsSummary | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [calendarView, setCalendarView] = useState<'week' | 'month'>('week');
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);
  const [clockNow, setClockNow] = useState(() => new Date());
  const [selectedReservation, setSelectedReservation] =
    useState<ProfessionalReservation | null>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const closeTimeoutRef = useRef<number | null>(null);
  const weekCalendarScrollRef = useRef<HTMLDivElement | null>(null);

  const { requestNavigation } = useProfessionalDashboardUnsavedSection({
    sectionId: 'agenda-dashboard',
    isDirty: false,
    isSaving: isUpdatingStatus,
  });

  // Schedule is loaded once as part of the parallel initial fetch below.
  const scheduleLoadedRef = useRef(false);

  useEffect(() => {
    if (selectedReservation) {
      const frame = requestAnimationFrame(() => setDrawerVisible(true));
      return () => cancelAnimationFrame(frame);
    }
    setDrawerVisible(false);
    return undefined;
  }, [selectedReservation]);

  const { today, todayKey, yesterdayKey, currentWeekStart } = useMemo(() => {
    const t = new Date();
    const tKey = toLocalDateKey(t);
    const y = new Date(t);
    y.setDate(t.getDate() - 1);
    const wStart = startOfWeek(t);
    const wEnd = new Date(wStart);
    wEnd.setDate(wStart.getDate() + 6);
    return {
      today: t,
      todayKey: tKey,
      yesterdayKey: toLocalDateKey(y),
      currentWeekStart: wStart,
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const canUseMonthlyCalendar = featureAccess.monthlyCalendar;
  const canNavigateCalendar = featureAccess.weeklyCalendarNavigation;

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
    if (base.getMonth() === end.getMonth() && base.getFullYear() === end.getFullYear()) {
      return `${base.getDate()} - ${end.getDate()} ${monthNamesShort[end.getMonth()]} ${end.getFullYear()}`;
    }
    return `${fmt(base)} - ${fmt(end)} ${end.getFullYear()}`;
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

  const { todayCount, todayDiff } = useMemo(() => {
    let tc = 0;
    let yc = 0;
    for (const r of agendaReservations) {
      if (r.date === todayKey) tc++;
      if (r.date === yesterdayKey) yc++;
    }
    return { todayCount: tc, todayDiff: tc - yc };
  }, [agendaReservations, todayKey, yesterdayKey]);

  const monthlyRevenue = useMemo(() => {
    const monthPrefix = todayKey.slice(0, 7);
    return agendaReservations.reduce((total, reservation) => {
      if (!reservation.date?.startsWith(monthPrefix)) return total;
      if ((reservation.status ?? 'pending') === 'cancelled') return total;
      return total + parseMoneyValue(reservation.price);
    }, 0);
  }, [agendaReservations, todayKey]);

  const { scheduleDays, scheduleDaySet } = useMemo(() => {
    const days = schedule?.days.filter((day) => day.enabled && !day.paused) ?? [];
    const daySet = new Set(days.map((day) => day.day));
    return { scheduleDays: days, scheduleDaySet: daySet };
  }, [schedule?.days]);

  const currentWeekDays = useMemo(() => {
    return Array.from({ length: 7 }).map((_, index) => {
      const date = new Date(currentWeekStart);
      date.setDate(currentWeekStart.getDate() + index);
      const dayKey = dayKeyByIndex[date.getDay()];
      return { dayKey, dateKey: toLocalDateKey(date) };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const requiredReservationDatesRef = useRef<string[]>([]);
  const requiredReservationDates = useMemo(() => {
    const dateKeys = new Set<string>([todayKey, ...getMonthDateKeys(today)]);
    currentWeekDays.forEach((day) => dateKeys.add(day.dateKey));
    if (calendarView === 'month' && canUseMonthlyCalendar) {
      monthGridDays.forEach((day) => dateKeys.add(day.dateKey));
    } else {
      weekDays.forEach((day) => dateKeys.add(day.dateKey));
    }
    const next = Array.from(dateKeys).sort();
    const prev = requiredReservationDatesRef.current;
    if (prev.length === next.length && prev.every((d, i) => d === next[i])) return prev;
    requiredReservationDatesRef.current = next;
    return next;
  }, [today, todayKey, currentWeekDays, calendarView, canUseMonthlyCalendar, monthGridDays, weekDays]);

  const canViewAnalytics = featureAccess.basicAnalytics;

  // Parallel fetch: schedule (once) + reservations + analytics
  useEffect(() => {
    if (!profile?.id) return;

    let isCancelled = false;

    const loadSchedule = async () => {
      if (scheduleLoadedRef.current) return;
      try {
        const response = await api.get<ProfessionalSchedule>('/profesional/schedule');
        if (isCancelled) return;
        const data = response.data;
        if (!data || !Array.isArray(data.days)) {
          setSchedule(null);
        } else {
          setSchedule({
            days: data.days,
            pauses: Array.isArray(data.pauses) ? data.pauses : [],
          });
        }
        scheduleLoadedRef.current = true;
      } catch {
        if (!isCancelled) setSchedule(null);
      }
    };

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

    const loadAnalytics = async () => {
      if (!canViewAnalytics) {
        if (!isCancelled) setAnalyticsSummary(null);
        return;
      }
      try {
        const summary = await getProfessionalAnalyticsSummary(
          featureAccess.advancedAnalytics ? 'ADVANCED' : 'BASIC',
        );
        if (!isCancelled) setAnalyticsSummary(summary);
      } catch {
        if (!isCancelled) setAnalyticsSummary(null);
      }
    };

    void Promise.all([loadSchedule(), loadReservations(), loadAnalytics()]);

    return () => {
      isCancelled = true;
    };
  }, [profile?.id, requiredReservationDates, canViewAnalytics, featureAccess.advancedAnalytics]);

  useEffect(() => {
    if (!canUseMonthlyCalendar && calendarView === 'month') {
      setCalendarView('week');
      setMonthOffset(0);
    }
  }, [calendarView, canUseMonthlyCalendar]);

  const { occupancyValue, occupancyDetail } = useMemo(() => {
    const daysWithRes = currentWeekDays.filter((day) => {
      if (!scheduleDaySet.has(day.dayKey)) return false;
      return (reservationsByDate.get(day.dateKey)?.length ?? 0) > 0;
    }).length;

    return {
      occupancyValue: scheduleDays.length > 0
        ? `${Math.round((daysWithRes / scheduleDays.length) * 100)}%`
        : 'Sin horario',
      occupancyDetail: scheduleDays.length > 0
        ? `Días con reservas: ${daysWithRes}/${scheduleDays.length}`
        : 'Configurá horarios',
    };
  }, [currentWeekDays, scheduleDaySet, scheduleDays.length, reservationsByDate]);

  const weekFocusWindow = useMemo(
    () => buildWeekFocusWindow(weekDays, schedule, reservationsByDate),
    [reservationsByDate, schedule, weekDays],
  );

  const visibleCalendarRange = useMemo(() => {
    const buildCalendarRange = (startMinutes: number, endMinutes: number) => {
      const boundedStartMinutes = clamp(startMinutes, fullDayStartMinutes, fullDayEndMinutes - calendarStepMinutes);
      const boundedEndMinutes = clamp(
        endMinutes,
        boundedStartMinutes + calendarStepMinutes,
        fullDayEndMinutes,
      );

      const lineMarkers = Array.from(
        {
          length: Math.floor((boundedEndMinutes - boundedStartMinutes) / calendarStepMinutes) + 1,
        },
        (_, index) => boundedStartMinutes + (index * calendarStepMinutes),
      );

      const labelMarkers: number[] = [];
      if (boundedStartMinutes % calendarLabelStepMinutes !== 0) {
        labelMarkers.push(boundedStartMinutes);
      }
      const firstAlignedLabel = roundUpToStep(boundedStartMinutes, calendarLabelStepMinutes);
      for (let marker = firstAlignedLabel; marker < boundedEndMinutes; marker += calendarLabelStepMinutes) {
        labelMarkers.push(marker);
      }
      if (
        boundedEndMinutes !== fullDayEndMinutes
        && !labelMarkers.includes(boundedEndMinutes)
        && boundedEndMinutes - labelMarkers[labelMarkers.length - 1] >= calendarLabelStepMinutes / 2
      ) {
        labelMarkers.push(boundedEndMinutes);
      }

      return {
        startMinutes: boundedStartMinutes,
        endMinutes: boundedEndMinutes,
        lineMarkers,
        labelMarkers,
        calendarHeight: ((boundedEndMinutes - boundedStartMinutes) / 60) * hourRowHeight,
        calendarTotalMinutes: boundedEndMinutes - boundedStartMinutes,
      };
    };

    return buildCalendarRange(weekFocusWindow.startMinutes, weekFocusWindow.endMinutes);
  }, [weekFocusWindow.endMinutes, weekFocusWindow.startMinutes]);

  const dayLayoutsByDate = useMemo(() => {
    const map = new Map<string, ReservationLayout[]>();
    reservationsByDate.forEach((dayReservations, dateKey) => {
      map.set(dateKey, buildDayLayouts(dayReservations));
    });
    return map;
  }, [reservationsByDate]);

  useEffect(() => {
    const id = window.setInterval(() => setClockNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const currentTimeIndicator = useMemo(() => {
    if (calendarView !== 'week' || weekOffset !== 0) return null;
    const nowKey = toLocalDateKey(clockNow);
    const startMinutes = visibleCalendarRange.startMinutes;
    const endMinutes = visibleCalendarRange.endMinutes;
    const minutes = clockNow.getHours() * 60 + clockNow.getMinutes();
    if (minutes < startMinutes || minutes > endMinutes) return null;

    return {
      dateKey: nowKey,
      top: ((minutes - startMinutes) / visibleCalendarRange.calendarTotalMinutes) *
        visibleCalendarRange.calendarHeight,
      label: formatMinutesLabel(minutes),
    };
  }, [calendarView, clockNow, visibleCalendarRange, weekOffset]);

  const todayPendingCount = useMemo(
    () => agendaReservations.filter(
      (reservation) => reservation.date === todayKey && (reservation.status ?? 'pending') === 'pending',
    ).length,
    [agendaReservations, todayKey],
  );
  const agendaOverviewCards = useMemo(() => [
    {
      label: 'Reservas hoy',
      value: `${analyticsSummary?.todayBookings ?? todayCount}`,
      detail:
        (analyticsSummary?.todayDelta ?? todayDiff) === 0
          ? 'Mismo ritmo que ayer'
          : `${(analyticsSummary?.todayDelta ?? todayDiff) > 0 ? '+' : ''}${analyticsSummary?.todayDelta ?? todayDiff} vs ayer`,
      icon: 'reservas' as const,
      tone: 'accent' as const,
    },
    {
      label: 'Pendientes',
      value: `${todayPendingCount}`,
      detail: todayPendingCount > 0 ? 'Turnos por confirmar' : 'Nada por validar',
      icon: 'warning' as const,
      tone: 'warm' as const,
    },
    {
      label: 'Ingresos del mes',
      value: monthlyRevenue > 0 ? formatMoneyValue(monthlyRevenue) : '$0',
      detail: 'Según reservas cargadas',
      icon: 'analytics' as const,
      tone: 'default' as const,
    },
    {
      label: 'Ocupación semanal',
      value: analyticsSummary ? `${analyticsSummary.weeklyOccupancyRate}%` : occupancyValue,
      detail: analyticsSummary
        ? `Días con reservas: ${analyticsSummary.weeklyDaysWithReservations}/${analyticsSummary.weeklyScheduledDays}`
        : occupancyDetail,
      icon: 'agenda' as const,
      tone: 'default' as const,
    },
  ], [analyticsSummary, todayCount, todayDiff, todayPendingCount, monthlyRevenue, occupancyValue, occupancyDetail]);
  const todayReservations = useMemo(() => {
    return [...agendaReservations]
      .filter((reservation) => reservation.date === todayKey)
      .sort((a, b) => {
        const aMinutes = a.time ? parseTimeToMinutes(a.time) ?? 0 : 0;
        const bMinutes = b.time ? parseTimeToMinutes(b.time) ?? 0 : 0;
        return aMinutes - bMinutes;
      });
  }, [agendaReservations, todayKey]);

  const todayConfirmedRevenueReservations = useMemo(
    () => todayReservations.filter((reservation) => {
      const status = reservation.status ?? 'pending';
      return status === 'confirmed' || status === 'completed';
    }),
    [todayReservations],
  );
  const todayEstimatedRevenue = useMemo(
    () => todayConfirmedRevenueReservations.reduce(
      (total, reservation) => total + parseMoneyValue(reservation.price),
      0,
    ),
    [todayConfirmedRevenueReservations],
  );

  const todayLabel = useMemo(() => {
    const label = new Intl.DateTimeFormat('es-AR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(today);
    return label.charAt(0).toUpperCase() + label.slice(1);
  }, [today]);

  const upcomingTodayReservations = useMemo(() => {
    const currentMinutes = clockNow.getHours() * 60 + clockNow.getMinutes();
    return todayReservations
      .filter((reservation) => {
        const status = reservation.status ?? 'pending';
        if (status === 'completed' || status === 'cancelled') return false;
        const reservationMinutes = parseTimeToMinutes(reservation.time);
        return reservationMinutes === null || reservationMinutes >= currentMinutes;
      })
      .slice(0, 4);
  }, [clockNow, todayReservations]);

  const handlePrev = () => {
    if (!canNavigateCalendar) return;
    if (calendarView === 'week') setWeekOffset((prev) => prev - 1);
    else setMonthOffset((prev) => prev - 1);
  };
  const handleNext = () => {
    if (!canNavigateCalendar) return;
    if (calendarView === 'week') setWeekOffset((prev) => prev + 1);
    else setMonthOffset((prev) => prev + 1);
  };
  const handleToday = () => {
    setWeekOffset(0);
    setMonthOffset(0);
  };
  const handleSetView = (view: 'week' | 'month') => {
    if (view === 'month' && !canUseMonthlyCalendar) return;
    setCalendarView(view);
    setWeekOffset(0);
    setMonthOffset(0);
  };
  const handleOpenReservation = useCallback((reservation: ProfessionalReservation) => {
    setSelectedReservation(reservation);
  }, []);

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
    <ProfessionalDashboardShell profile={profile} active="Agenda">
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-[#64748B]">
              OPERACIÓN
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-[-0.02em] text-[#0F172A]">
              Agenda
            </h1>
            <p className="mt-1 text-sm text-[#64748B]">
              Visualizá tus reservas y tu calendario semanal.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 sm:justify-end">
            <Button
              type="button"
              size="sm"
              onClick={handleToday}
              className="h-9 rounded-xl border-[#E2E8F0] bg-white px-3 text-[#0F172A] shadow-none hover:bg-[#F8FAFC]"
            >
              <DashboardIcon name="agenda" className="mr-2 h-4 w-4" />
              Hoy
            </Button>
            <Button
              type="button"
              size="sm"
              variant="primary"
              onClick={() => {
                requestNavigation('/profesional/dashboard/reservas');
              }}
              className="h-9 rounded-xl px-3"
            >
              <span className="mr-2 text-base leading-none">+</span>
              Nueva reserva
            </Button>
          </div>
        </div>
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
            <p className="rounded-[14px] border border-[#E2E8F0] bg-white px-4 py-2 text-sm text-[#64748B] shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
              {statusMessage}
            </p>
          ) : null}

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {agendaOverviewCards.map((item) => (
              <DashboardStatCard
                key={item.label}
                label={item.label}
                value={item.value}
                detail={item.detail}
                icon={item.icon}
                tone={item.tone}
                variant="compact"
                className="min-h-[86px] p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
              />
            ))}
          </section>

          <section className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_280px] xl:grid-cols-[minmax(0,1fr)_300px]">
          <section className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <div className="flex flex-col gap-3 border-b border-[#E2E8F0] bg-white px-4 py-3 lg:flex-row lg:items-center lg:justify-between lg:px-5">
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-[#0F172A]">
                  {calendarView === 'week' ? 'Agenda semanal' : 'Calendario mensual'}
                </h2>
                <p className="mt-0.5 text-xs text-[#64748B]">
                  {calendarView === 'week' ? calendarWeekLabel : monthLabel}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                <div className="inline-flex rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-1">
                  <button
                    type="button"
                    onClick={() => handleSetView('week')}
                    className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                      calendarView === 'week'
                        ? 'bg-white text-[#0F766E] shadow-[0_1px_2px_rgba(15,23,42,0.08)]'
                        : 'text-[#64748B] hover:bg-[#ECFDF5] hover:text-[#0F172A]'
                    }`}
                  >
                    Semana
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetView('month')}
                    disabled={!canUseMonthlyCalendar}
                    className={`relative rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                      calendarView === 'month'
                        ? 'bg-white text-[#0F766E] shadow-[0_1px_2px_rgba(15,23,42,0.08)]'
                        : 'text-[#64748B] hover:bg-[#ECFDF5] hover:text-[#0F172A]'
                    } ${!canUseMonthlyCalendar ? 'cursor-not-allowed opacity-45' : ''}`}
                  >
                    Mes
                  </button>
                </div>

                <div className="flex items-center gap-1 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-2 py-1">
                  <span className="text-xs text-[#64748B]">Inicia:</span>
                  <span className="rounded-lg bg-[#0F766E] px-2 py-1 text-xs font-medium text-white">
                    Lun
                  </span>
                  <span className="rounded-lg px-2 py-1 text-xs font-medium text-[#64748B]">
                    Dom
                  </span>
                </div>

                <div className="flex items-center overflow-hidden rounded-xl border border-[#E2E8F0] bg-white">
                  <button
                    type="button"
                    onClick={handlePrev}
                    disabled={!canNavigateCalendar}
                    aria-label="Semana anterior"
                    className={`px-3 py-2 text-lg leading-none transition ${
                      canNavigateCalendar
                        ? 'text-[#0F172A] hover:bg-[#ECFDF5]'
                        : 'cursor-not-allowed text-[color:var(--ink-faint)] opacity-45'
                    }`}
                  >
                    ‹
                  </button>
                  <span className="min-w-[132px] border-x border-[#E2E8F0] px-3 text-center text-sm text-[#64748B]">
                    {calendarView === 'week' ? calendarWeekLabel : monthLabel}
                  </span>
                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={!canNavigateCalendar}
                    aria-label="Semana siguiente"
                    className={`px-3 py-2 text-lg leading-none transition ${
                      canNavigateCalendar
                        ? 'text-[#0F172A] hover:bg-[#ECFDF5]'
                        : 'cursor-not-allowed text-[color:var(--ink-faint)] opacity-45'
                    }`}
                  >
                    ›
                  </button>
                </div>
              </div>
            </div>

            {calendarView === 'week' ? (
              <WeekCalendarBoard
                weekDays={weekDays}
                todayKey={todayKey}
                visibleCalendarRange={visibleCalendarRange}
                dayLayoutsByDate={dayLayoutsByDate}
                currentTimeIndicator={currentTimeIndicator}
                scrollContainerRef={weekCalendarScrollRef}
                onReservationOpen={handleOpenReservation}
              />
            ) : (
              <div className="max-h-[600px] overflow-auto bg-white">
                <MonthCalendarBoard
                  monthGridDays={monthGridDays}
                  reservationsByDate={reservationsByDate}
                  monthLabel={monthLabel}
                />
              </div>
            )}
          </section>

          <aside className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] lg:sticky lg:top-5 lg:self-start">
            <div className="flex items-start gap-3">
              <DashboardIcon name="agenda" className="mt-0.5 h-5 w-5 text-[#0F766E]" />
              <div>
                <h2 className="text-base font-semibold text-[#0F172A]">
                  {todayLabel}
                </h2>
                <p className="mt-1 text-sm text-[#64748B]">Resumen del día</p>
              </div>
            </div>

            <div className="mt-5 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 font-medium text-[#0F172A]">
                  <DashboardIcon name="reservas" className="h-4 w-4 text-[#0F766E]" />
                  Reservas
                </span>
                <span className="font-semibold text-[#0F172A]">
                  {todayReservations.length}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 font-medium text-[#0F172A]">
                  <DashboardIcon name="warning" className="h-4 w-4 text-[#0F766E]" />
                  Pendientes
                </span>
                <span className="font-semibold text-[#0F172A]">
                  {todayPendingCount}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 font-medium text-[#0F172A]">
                  <DashboardIcon name="analytics" className="h-4 w-4 text-[#0F766E]" />
                  Ingresos
                </span>
                <span className="font-semibold text-[#0F172A]">
                  {todayEstimatedRevenue > 0 ? formatMoneyValue(todayEstimatedRevenue) : '$0'}
                </span>
              </div>
            </div>

            <div className="mt-5 border-t border-[#E2E8F0] pt-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-base font-semibold text-[#0F172A]">
                  Próximas reservas
                </h3>
                <span className="text-xs font-medium text-[#64748B]">
                  {todayConfirmedRevenueReservations.length} validadas
                </span>
              </div>
              <div className="mt-4 space-y-3">
                {upcomingTodayReservations.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-4 text-center text-sm text-[#64748B]">
                    <DashboardIcon
                      name="agenda"
                      className="mx-auto mb-2 h-5 w-5 text-[#64748B]"
                    />
                    No tenés reservas para este día.
                  </div>
                ) : (
                  upcomingTodayReservations.map((reservation) => {
                    const statusBadge = getReservationStatusBadge(reservation.status);
                    return (
                      <button
                        key={reservation.id}
                        type="button"
                        onClick={() => handleOpenReservation(reservation)}
                        className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3 text-left transition hover:border-[#0F766E]/40 hover:bg-[#ECFDF5]"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm font-semibold text-[#0F172A]">
                            {reservation.time || '--:--'}
                          </span>
                          <span className={`rounded-full px-2 py-0.5 text-[0.62rem] font-semibold ${statusBadge.className}`}>
                            {statusBadge.label}
                          </span>
                        </div>
                        <p className="mt-1 truncate text-sm font-medium text-[#0F172A]">
                          {reservation.serviceName || 'Servicio'}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-[#64748B]">
                          {reservation.clientName || 'Cliente'}
                        </p>
                      </button>
                    );
                  })
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  requestNavigation('/profesional/dashboard/reservas');
                }}
                className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[#0F766E] transition hover:text-[#047857]"
              >
                Ver todas las reservas →
              </button>
            </div>
          </aside>
          </section>
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
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getReservationStatusBadge(selectedReservation.status).className}`}>
                {getReservationStatusBadge(selectedReservation.status).label}
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
    </ProfessionalDashboardShell>
  );
}
