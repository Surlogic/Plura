'use client';

import { memo, useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { isAxiosError } from 'axios';
import Link from 'next/link';
import EmailVerificationPanel from '@/components/auth/EmailVerificationPanel';
import ProfessionalDashboardShell from '@/components/profesional/dashboard/ProfessionalDashboardShell';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { cn } from '@/components/ui/cn';
import { resolveProfessionalFeatureAccess } from '@/lib/billing/featureGuards';
import { useProfessionalProfile } from '@/hooks/useProfessionalProfile';
import { useProfessionalDashboardUnsavedSection } from '@/context/ProfessionalDashboardUnsavedChangesContext';
import api from '@/services/api';
import {
  DashboardHeaderBadge,
  DashboardHero,
  DashboardSectionHeading,
  DashboardStatCard,
} from '@/components/profesional/dashboard/DashboardUI';
import LockedFeature from '@/components/ui/LockedFeature';
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
const defaultCalendarStartMinutes = 9 * 60;
const defaultCalendarEndMinutes = 18 * 60;
const calendarStepMinutes = 30;
const calendarLabelStepMinutes = 60;
const calendarMarginMinutes = 30;
const minCalendarSpanMinutes = 3 * 60;
const hourRowHeight = 56;
const formatMinutesLabel = (minutes: number) => {
  const safeMinutes = Math.max(0, Math.round(minutes));
  const hours = Math.floor(safeMinutes / 60) % 24;
  const mins = safeMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
};
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
    card: 'bg-[#FFF7E8] border-[#F6D6A8] hover:bg-[#FDECC8]',
    dot: 'bg-[#F59E0B]',
    monthCard: 'border border-[#F6D6A8] bg-[#FFF7E8] text-[#B45309]',
    monthCardToday: 'border border-[#F7D27A] bg-[#FFF1CC] text-[#92400E]',
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

  if (relevantMinutes.length === 0) {
    return {
      startMinutes: defaultCalendarStartMinutes,
      endMinutes: defaultCalendarEndMinutes,
      isFallback: true,
    } satisfies CalendarFocusWindow;
  }

  let startMinutes = roundDownToStep(
    Math.max(Math.min(...relevantMinutes) - calendarMarginMinutes, fullDayStartMinutes),
    calendarStepMinutes,
  );
  let endMinutes = roundUpToStep(
    Math.min(Math.max(...relevantMinutes) + calendarMarginMinutes, fullDayEndMinutes),
    calendarStepMinutes,
  );

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
    isFallback: false,
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
  reservationsByDate,
  visibleCalendarRange,
  dayLayoutsByDate,
  currentTimeIndicator,
  scrollContainerRef,
  onReservationOpen,
}: {
  weekDays: WeekCalendarDay[];
  todayKey: string;
  reservationsByDate: Map<string, ProfessionalReservation[]>;
  visibleCalendarRange: VisibleCalendarRange;
  dayLayoutsByDate: Map<string, ReservationLayout[]>;
  currentTimeIndicator: CurrentTimeIndicator | null;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  onReservationOpen: (reservation: ProfessionalReservation) => void;
}) {
  return (
    <div className="mt-3 min-h-[540px] overflow-x-auto lg:mt-2 lg:h-full">
      <div className="min-h-[540px] min-w-[980px] overflow-hidden rounded-[24px] border border-[#E2E7EC] bg-white shadow-[0_20px_45px_rgba(15,23,42,0.08)] lg:flex lg:h-full lg:flex-col">
        <div className="flex border-b border-[#E2E7EC] bg-[linear-gradient(180deg,#FAFCFE_0%,#F4F8FB_100%)]">
          <div className="sticky left-0 z-20 w-20 shrink-0 bg-[linear-gradient(180deg,#FAFCFE_0%,#F4F8FB_100%)] px-4 py-3 text-[0.6rem] uppercase tracking-[0.3em] text-[#94A3B8]">
            Hora
          </div>
          <div className="grid flex-1 grid-cols-7">
            {weekDays.map((day, index) => {
              const isToday = day.dateKey === todayKey;
              const reservationCount = reservationsByDate.get(day.dateKey)?.length ?? 0;
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
                    <span
                      className={`rounded-full px-2 py-1 text-[0.62rem] font-semibold ${
                        reservationCount > 0
                          ? 'bg-[#1FB6A6]/10 text-[#1FB6A6]'
                          : 'bg-[#F3F6F9] text-[#94A3B8]'
                      }`}
                    >
                      {reservationCount > 0 ? `${reservationCount} res.` : 'Libre'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div
          ref={scrollContainerRef}
          className="flex overflow-y-auto overscroll-contain scroll-smooth lg:min-h-0 lg:flex-1"
          style={{ height: '100%' }}
        >
          <div className="sticky left-0 z-10 w-20 shrink-0 border-r border-[#E2E7EC] bg-white shadow-[4px_0_12px_rgba(15,23,42,0.06)]">
            <div className="relative" style={{ height: visibleCalendarRange.calendarHeight }}>
              {visibleCalendarRange.labelMarkers.map((markerMinutes) => {
                const top = Math.min(
                  ((markerMinutes - visibleCalendarRange.startMinutes)
                    / visibleCalendarRange.calendarTotalMinutes)
                    * visibleCalendarRange.calendarHeight,
                  visibleCalendarRange.calendarHeight - 14,
                );
                return (
                  <div
                    key={`hour-${markerMinutes}`}
                    className="absolute right-3 text-[0.65rem] font-medium text-[#94A3B8]"
                    style={{ top }}
                  >
                    {formatMinutesLabel(markerMinutes)}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid flex-1 grid-cols-7">
            {weekDays.map((day, index) => {
              const dayLayouts = dayLayoutsByDate.get(day.dateKey) ?? [];
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
                    {visibleCalendarRange.lineMarkers.slice(0, -1).map((markerMinutes) => (
                      <div
                        key={`${day.dateKey}-${markerMinutes}`}
                        className={`absolute left-0 right-0 border-b ${
                          markerMinutes % calendarLabelStepMinutes === 0
                            ? 'border-[#D7E3EE]'
                            : 'border-dashed border-[#EEF2F6]'
                        }`}
                        style={{
                          top: ((markerMinutes - visibleCalendarRange.startMinutes)
                            / visibleCalendarRange.calendarTotalMinutes)
                            * visibleCalendarRange.calendarHeight,
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
                    const dayStartMinutes = visibleCalendarRange.startMinutes;
                    const dayEndMinutes = visibleCalendarRange.endMinutes;
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
                    const palette = getReservationStatusPalette(layout.reservation.status);
                    const statusBadge = getReservationStatusBadge(layout.reservation.status);

                    return (
                      <button
                        type="button"
                        key={layout.reservation.id}
                        className="absolute z-[2] cursor-pointer text-left"
                        style={{ top, height, width, left }}
                        onClick={() => onReservationOpen(layout.reservation)}
                      >
                        <div
                          className={`group relative flex h-full min-h-[44px] flex-col overflow-hidden rounded-[10px] border px-2.5 py-2 text-left shadow-[0_6px_18px_rgba(15,23,42,0.10)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_24px_rgba(15,23,42,0.14)] ${palette.card} ${
                            isToday ? 'ring-1 ring-[#FFD9B0]' : ''
                          }`}
                        >
                          <span
                            className={`absolute left-0 top-0 h-full w-1 rounded-l-[10px] ${palette.accent}`}
                          />
                          <div className="flex items-start justify-between gap-2 pl-1.5">
                            <span className="text-[12px] font-medium leading-none text-[#475569]">
                              {timeRangeLabel}
                            </span>
                            {showStatus ? (
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusBadge.className}`}>
                                {statusBadge.label}
                              </span>
                            ) : (
                              <span
                                className={`mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ${palette.dot}`}
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
    <div className="mt-6 overflow-hidden rounded-[24px] border border-[#E2E7EC] bg-white shadow-[0_16px_36px_rgba(15,23,42,0.06)]">
      <div className="grid grid-cols-7 gap-1 border-b border-[#E2E7EC] bg-[#F8FAFC] px-2 text-center">
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
      <p className="border-t border-[color:var(--border-soft)] py-3 text-center text-xs uppercase tracking-[0.4em] text-[color:var(--ink-faint)]">
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
  const lastAutoFocusKeyRef = useRef<string | null>(null);

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

  const { today, todayKey, currentMinutes, yesterdayKey, currentWeekStart, weekStartKey, weekEndKey } = useMemo(() => {
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
      currentMinutes: t.getHours() * 60 + t.getMinutes(),
      yesterdayKey: toLocalDateKey(y),
      currentWeekStart: wStart,
      weekStartKey: toLocalDateKey(wStart),
      weekEndKey: toLocalDateKey(wEnd),
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
    return weekOffset === 0 ? 'Semana actual' : `${fmt(base)} – ${fmt(end)}`;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekOffset]);

  const monthLabel = useMemo(() => {
    const firstOfMonth = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
    return `${monthNames[firstOfMonth.getMonth()]} ${firstOfMonth.getFullYear()}`;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthOffset]);
  const todayHeadlineLabel = useMemo(
    () =>
      new Intl.DateTimeFormat('es-AR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      }).format(clockNow),
    [clockNow],
  );

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

  const { todayCount, todayDiff, uniqueClientsWeek } = useMemo(() => {
    let tc = 0;
    let yc = 0;
    const weekClients = new Set<string>();
    for (const r of agendaReservations) {
      if (r.date === todayKey) tc++;
      if (r.date === yesterdayKey) yc++;
      if (r.date >= weekStartKey && r.date <= weekEndKey && r.clientName) {
        weekClients.add(r.clientName);
      }
    }
    return { todayCount: tc, todayDiff: tc - yc, uniqueClientsWeek: weekClients.size };
  }, [agendaReservations, todayKey, yesterdayKey, weekStartKey, weekEndKey]);

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
    const dateKeys = new Set<string>([todayKey]);
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
  }, [todayKey, currentWeekDays, calendarView, canUseMonthlyCalendar, monthGridDays, weekDays]);

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

  const { daysWithReservations, occupancyValue, occupancyDetail } = useMemo(() => {
    const daysWithRes = currentWeekDays.filter((day) => {
      if (!scheduleDaySet.has(day.dayKey)) return false;
      return (reservationsByDate.get(day.dateKey)?.length ?? 0) > 0;
    }).length;

    return {
      daysWithReservations: daysWithRes,
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

    return buildCalendarRange(fullDayStartMinutes, fullDayEndMinutes);
  }, []);

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

  const scrollWeekCalendarToMinute = useCallback((
    targetMinutes: number,
    options?: { behavior?: ScrollBehavior; align?: 'start' | 'center' },
  ) => {
    const container = weekCalendarScrollRef.current;
    if (!container) return;

    const align = options?.align ?? 'start';
    const boundedMinutes = clamp(targetMinutes, visibleCalendarRange.startMinutes, visibleCalendarRange.endMinutes);
    const minuteOffset = boundedMinutes - visibleCalendarRange.startMinutes;
    const top = (minuteOffset / visibleCalendarRange.calendarTotalMinutes) * visibleCalendarRange.calendarHeight;
    const nextScrollTop = align === 'center'
      ? top - (container.clientHeight / 2)
      : top;

    const maxScrollTop = Math.max(visibleCalendarRange.calendarHeight - container.clientHeight, 0);
    container.scrollTo({
      top: clamp(nextScrollTop, 0, maxScrollTop),
      behavior: options?.behavior ?? 'smooth',
    });
  }, [visibleCalendarRange]);

  useEffect(() => {
    if (calendarView !== 'week') return;

    const focusKey = `${weekOffset}:${weekDays.map((day) => day.dateKey).join('|')}:${weekFocusWindow.startMinutes}:${weekFocusWindow.endMinutes}`;
    if (lastAutoFocusKeyRef.current === focusKey) return;

    const container = weekCalendarScrollRef.current;
    if (!container) return;

    lastAutoFocusKeyRef.current = focusKey;
    const frame = requestAnimationFrame(() => {
      const visibleMinutes = (container.clientHeight / visibleCalendarRange.calendarHeight)
        * visibleCalendarRange.calendarTotalMinutes;
      const focusCenter = (weekFocusWindow.startMinutes + weekFocusWindow.endMinutes) / 2;
      const targetMinute = clamp(
        focusCenter - (visibleMinutes / 2),
        visibleCalendarRange.startMinutes,
        Math.max(visibleCalendarRange.endMinutes - visibleMinutes, visibleCalendarRange.startMinutes),
      );
      scrollWeekCalendarToMinute(targetMinute, {
        behavior: 'auto',
        align: 'start',
      });
    });

    return () => cancelAnimationFrame(frame);
  }, [calendarView, scrollWeekCalendarToMinute, visibleCalendarRange, weekDays, weekFocusWindow, weekOffset]);

  const stats = useMemo(() => [
    {
      label: 'Reservas hoy',
      value: `${analyticsSummary?.todayBookings ?? todayCount}`,
      detail:
        (analyticsSummary?.todayDelta ?? todayDiff) === 0
          ? 'Igual que ayer'
          : `${(analyticsSummary?.todayDelta ?? todayDiff) > 0 ? '+' : ''}${analyticsSummary?.todayDelta ?? todayDiff} vs ayer`,
    },
    {
      label: 'Ocupación semanal',
      value: analyticsSummary ? `${analyticsSummary.weeklyOccupancyRate}%` : occupancyValue,
      detail: analyticsSummary
        ? `Días con reservas: ${analyticsSummary.weeklyDaysWithReservations}/${analyticsSummary.weeklyScheduledDays}`
        : occupancyDetail,
    },
    {
      label: 'Clientes nuevos',
      value: `${analyticsSummary?.weeklyUniqueClients ?? uniqueClientsWeek}`,
      detail: 'Últimos 7 días',
    },
  ], [analyticsSummary, todayCount, todayDiff, occupancyValue, occupancyDetail, uniqueClientsWeek]);
  const nextReservation = useMemo(() => {
    let best: (typeof agendaReservations)[number] | null = null;
    let bestKey = '';
    for (const reservation of agendaReservations) {
      if (!reservation.date) continue;
      if (reservation.date < todayKey) continue;
      if (reservation.date === todayKey) {
        const minutes = parseTimeToMinutes(reservation.time);
        if (minutes === null || minutes < currentMinutes) continue;
      }
      const sortKey = `${reservation.date}T${reservation.time || '00:00'}`;
      if (!best || sortKey < bestKey) {
        best = reservation;
        bestKey = sortKey;
      }
    }
    return best;
  }, [agendaReservations, currentMinutes, todayKey]);
  const todayPendingCount = useMemo(
    () => agendaReservations.filter(
      (reservation) => reservation.date === todayKey && (reservation.status ?? 'pending') === 'pending',
    ).length,
    [agendaReservations, todayKey],
  );
  const daysWithOpenCapacity = analyticsSummary
    ? Math.max(analyticsSummary.weeklyScheduledDays - analyticsSummary.weeklyDaysWithReservations, 0)
    : Math.max(scheduleDays.length - daysWithReservations, 0);
  const agendaOverviewCards = useMemo(() => [
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
  ], [todayPendingCount, nextReservation, daysWithOpenCapacity, scheduleDays.length]);

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
  const handleJumpToDaySegment = useCallback((segment: 'lateNight' | 'morning' | 'afternoon' | 'evening' | 'now') => {
    if (calendarView !== 'week') return;

    const targetMinutes = segment === 'lateNight'
      ? 0
      : segment === 'morning'
        ? 6 * 60
        : segment === 'afternoon'
          ? 12 * 60
          : segment === 'evening'
            ? 18 * 60
            : new Date().getHours() * 60 + new Date().getMinutes();

    scrollWeekCalendarToMinute(targetMinutes, {
      behavior: 'smooth',
      align: segment === 'now' ? 'center' : 'start',
    });
  }, [calendarView, scrollWeekCalendarToMinute]);

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
    <ProfessionalDashboardShell profile={profile} active="Agenda" contentClassName="py-4 sm:py-6">
      <div className="flex flex-col gap-4">
                <section className="space-y-3 lg:shrink-0">
                  <DashboardHero
                    eyebrow="Centro operativo"
                    icon="agenda"
                    accent="ink"
                    size="compact"
                    title={profile?.fullName ? `${profile.fullName}, este es tu tablero de hoy` : 'Tu tablero operativo de hoy'}
                    description="La agenda queda al frente con el contexto justo para resolver pendientes, próximos turnos y disponibilidad semanal."
                    meta={
                      <>
                        <DashboardHeaderBadge tone="accent">
                          {todayHeadlineLabel}
                        </DashboardHeaderBadge>
                        <DashboardHeaderBadge tone="success">
                          {todayCount} reservas hoy
                        </DashboardHeaderBadge>
                        <DashboardHeaderBadge tone={todayPendingCount > 0 ? 'warning' : 'default'}>
                          {todayPendingCount} pendientes
                        </DashboardHeaderBadge>
                        {nextReservation ? (
                          <DashboardHeaderBadge>
                            Próxima: {nextReservation.time}
                          </DashboardHeaderBadge>
                        ) : null}
                      </>
                    }
                    actions={
                      <>
                        <Button
                          type="button"
                          variant="primary"
                          onClick={() => {
                            requestNavigation('/profesional/dashboard/reservas');
                          }}
                        >
                          Ver reservas
                        </Button>
                        <Button
                          type="button"
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

                  <div className="grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
                    <div className="grid gap-2.5 sm:grid-cols-3">
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

                    <LockedFeature requiredPlan="PROFESIONAL" currentPlan={profile?.professionalPlan}>
                      <Card className="border-white/70 bg-white/95 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="text-[0.62rem] uppercase tracking-[0.3em] text-[#94A3B8]">
                              Tendencia
                            </p>
                            <h3 className="mt-1 text-base font-semibold tracking-[-0.02em] text-[#0E2A47]">
                              Pulso semanal
                            </h3>
                          </div>
                          {canViewAnalytics && !featureAccess.advancedAnalytics ? (
                            <span className="rounded-full border border-[color:var(--premium-soft)] bg-[color:var(--premium-soft)] px-2.5 py-1 text-[0.65rem] font-semibold text-[color:var(--premium-strong)]">
                              Analytics básicos
                            </span>
                          ) : null}
                        </div>

                        {canViewAnalytics ? (
                          <div className="mt-3 grid gap-2 sm:grid-cols-3">
                            {stats.map((item, index) => (
                              <div
                                key={item.label}
                                className={cn(
                                  'rounded-[18px] border px-3 py-2.5',
                                  index === 0
                                    ? 'border-[#f4dcc7] bg-[#fff5e8]'
                                    : index === 1
                                      ? 'border-[#cdeee9] bg-[#f0fffc]'
                                      : 'border-[#E2E8F0] bg-[#F8FAFC]',
                                )}
                              >
                                <p className="text-[0.58rem] uppercase tracking-[0.24em] text-[#94A3B8]">
                                  {item.label}
                                </p>
                                <p className="mt-1.5 text-lg font-semibold leading-none text-[#0E2A47] sm:text-xl">
                                  {item.value}
                                </p>
                                <p className="mt-1 text-[0.72rem] leading-snug text-[#64748B]">
                                  {item.detail}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="mt-3 rounded-[16px] border border-dashed border-[#D9E2EC] bg-[#F8FAFC] px-3 py-2.5 text-xs text-[#64748B]">
                            Analytics todavía no activos para este plan. La agenda sigue mostrando los turnos reales del rango visible.
                          </div>
                        )}
                      </Card>
                    </LockedFeature>
                  </div>
                </section>

                <section className="flex flex-col rounded-[24px] border border-white/70 bg-white/95 p-4 shadow-[0_18px_40px_rgba(15,23,42,0.08)] sm:p-5">
                  <DashboardSectionHeading
                    eyebrow="Agenda"
                    title={calendarView === 'week' ? 'Semana actual' : 'Calendario mensual'}
                    description={calendarView === 'week' ? calendarWeekLabel : monthLabel}
                  />

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
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
                          disabled={!canUseMonthlyCalendar}
                          className={`relative rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                            calendarView === 'month'
                              ? 'bg-[color:var(--primary)] text-white'
                              : 'text-[color:var(--ink-faint)] hover:text-[color:var(--ink-muted)]'
                          } ${!canUseMonthlyCalendar ? 'cursor-not-allowed opacity-45' : ''}`}
                        >
                          Mensual
                          {!canUseMonthlyCalendar && (
                            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[color:var(--premium-soft)] text-[color:var(--premium-strong)]">
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                              </svg>
                            </span>
                          )}
                        </button>
                      </div>

                      {!canUseMonthlyCalendar ? (
                        <p className="text-xs text-[color:var(--ink-muted)]">
                          La vista mensual queda disponible en Premium.
                        </p>
                      ) : null}

                      <div className="relative flex items-center gap-0.5 rounded-full border border-[color:var(--border-soft)] bg-white px-1 py-1 shadow-[var(--shadow-card)]">
                        <button
                          type="button"
                          onClick={handlePrev}
                          disabled={!canNavigateCalendar}
                          className={`rounded-full px-2 py-1 text-sm transition ${
                            canNavigateCalendar
                              ? 'text-[color:var(--ink-muted)] hover:bg-[color:var(--surface-soft)] hover:text-[color:var(--ink)]'
                              : 'cursor-not-allowed text-[color:var(--ink-faint)] opacity-45'
                          }`}
                        >
                          ‹
                        </button>
                        <span className="min-w-[120px] text-center text-xs font-medium text-[color:var(--ink-muted)]">
                          {calendarView === 'week' ? calendarWeekLabel : monthLabel}
                        </span>
                        <button
                          type="button"
                          onClick={handleNext}
                          disabled={!canNavigateCalendar}
                          className={`rounded-full px-2 py-1 text-sm transition ${
                            canNavigateCalendar
                              ? 'text-[color:var(--ink-muted)] hover:bg-[color:var(--surface-soft)] hover:text-[color:var(--ink)]'
                              : 'cursor-not-allowed text-[color:var(--ink-faint)] opacity-45'
                          }`}
                        >
                          ›
                        </button>
                        {!canNavigateCalendar && (
                          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[color:var(--premium-soft)] text-[color:var(--premium-strong)]">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                            </svg>
                          </span>
                        )}
                      </div>

                      {!canNavigateCalendar ? (
                        <p className="text-xs text-[color:var(--ink-muted)]">
                          La navegación por semanas se habilita desde Pro.
                        </p>
                      ) : null}

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
                    <div className="mt-2.5 flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2.5">
                      <div className="flex flex-wrap gap-2">
                        {[
                          { label: 'Madrugada', value: 'lateNight' as const },
                          { label: 'Mañana', value: 'morning' as const },
                          { label: 'Tarde', value: 'afternoon' as const },
                          { label: 'Noche', value: 'evening' as const },
                          { label: 'Ahora', value: 'now' as const },
                        ].map((segment) => (
                          <button
                            key={segment.value}
                            type="button"
                            onClick={() => handleJumpToDaySegment(segment.value)}
                            className="rounded-full border border-[#D9E2EC] bg-white px-3 py-1.5 text-[0.72rem] font-semibold text-[#475569] transition hover:border-[#BFD3E4] hover:bg-[#FDFEFF]"
                          >
                            {segment.label}
                          </button>
                        ))}
                      </div>
                      <p className="text-[0.72rem] text-[#64748B]">
                        Base 24h con foco inicial
                        {weekFocusWindow.isFallback ? ' por fallback' : ' según horarios y reservas'}
                      </p>
                    </div>
                  ) : null}

                  {calendarView === 'week' ? (
                    <div className="min-h-[540px] lg:h-[min(72vh,860px)]">
                      <WeekCalendarBoard
                        weekDays={weekDays}
                        todayKey={todayKey}
                        reservationsByDate={reservationsByDate}
                        visibleCalendarRange={visibleCalendarRange}
                        dayLayoutsByDate={dayLayoutsByDate}
                        currentTimeIndicator={currentTimeIndicator}
                        scrollContainerRef={weekCalendarScrollRef}
                        onReservationOpen={handleOpenReservation}
                      />
                    </div>
                  ) : (
                    <div className="min-h-[540px] lg:max-h-[min(72vh,860px)] lg:overflow-auto">
                      <MonthCalendarBoard
                        monthGridDays={monthGridDays}
                        reservationsByDate={reservationsByDate}
                        monthLabel={monthLabel}
                      />
                    </div>
                  )}
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
