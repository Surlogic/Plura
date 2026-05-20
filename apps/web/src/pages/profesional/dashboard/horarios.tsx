'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ProfessionalDashboardShell from '@/components/profesional/dashboard/ProfessionalDashboardShell';
import Button from '@/components/ui/Button';
import DayScheduleCard from '@/components/profesional/schedule/DayScheduleCard';
import { useProfessionalProfile } from '@/hooks/useProfessionalProfile';
import { isAxiosError } from 'axios';
import api from '@/services/api';
import { useProfessionalDashboardUnsavedSection } from '@/context/ProfessionalDashboardUnsavedChangesContext';
import { DashboardIcon } from '@/components/profesional/dashboard/DashboardUI';
import {
  buildEmptyPause,
  createDefaultSchedule,
  createRange,
  createScheduleSignature,
  dayLabels,
  dayOptions,
  DEFAULT_SLOT_DURATION_MINUTES,
  type ConstructorApplyMode,
  normalizeSchedule,
  normalizeSlotDuration,
  SLOT_DURATION_OPTIONS,
  weekdayOptions,
} from '@/lib/professionalScheduleBuilder';
import type {
  ProfessionalSchedule,
  SchedulePauseRange,
  WorkDayKey,
  WorkDaySchedule,
  WorkShift,
} from '@/types/professional';

const extractApiErrorMessage = (error: unknown, fallback: string) => {
  if (isAxiosError<{ message?: string }>(error)) {
    const backendMessage = error.response?.data?.message;
    if (backendMessage && backendMessage.trim()) {
      return backendMessage.trim();
    }
  }
  return fallback;
};

const shortDayLabels: Record<WorkDayKey, string> = {
  mon: 'Lun',
  tue: 'Mar',
  wed: 'Mie',
  thu: 'Jue',
  fri: 'Vie',
  sat: 'Sab',
  sun: 'Dom',
};

const toTimeValue = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
};

const parseTime = (value: string) => {
  const [hours, minutes] = value.split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
};

const formatDateLabel = (value: string) => {
  if (!value) return 'Sin fecha';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('es-AR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
};

export default function ProfesionalScheduleBuilderPage() {
  const { profile, isLoading, hasLoaded } = useProfessionalProfile();
  const constructorRef = useRef<HTMLDivElement | null>(null);
  const [days, setDays] = useState<WorkDaySchedule[]>([]);
  const [pauses, setPauses] = useState<SchedulePauseRange[]>([]);
  const [slotDurationMinutes, setSlotDurationMinutes] = useState<number>(
    DEFAULT_SLOT_DURATION_MINUTES,
  );
  const [constructorDay, setConstructorDay] = useState<WorkDayKey>('mon');
  const [constructorTargets, setConstructorTargets] = useState<WorkDayKey[]>(['mon']);
  const [constructorMode, setConstructorMode] = useState<ConstructorApplyMode>('append');
  const [constructorError, setConstructorError] = useState<string | null>(null);
  const [scrollTarget, setScrollTarget] = useState<string | null>(null);
  const [editingRange, setEditingRange] = useState<{
    day: WorkDayKey;
    rangeId: string;
  } | null>(null);
  const [rangeDraft, setRangeDraft] = useState({ start: '09:00', end: '18:00' });
  const [quickPauseEnabled, setQuickPauseEnabled] = useState(true);
  const [quickPauses, setQuickPauses] = useState([
    { id: 'quick-pause-1', start: '13:00', end: '14:00' },
  ]);
  const [pauseDraft, setPauseDraft] = useState<SchedulePauseRange>(
    buildEmptyPause(),
  );
  const [isAddingAbsence, setIsAddingAbsence] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [lastSavedSchedule, setLastSavedSchedule] = useState<ProfessionalSchedule | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    Object.keys(window.localStorage)
      .filter((key) => key.startsWith('plura:schedule:'))
      .forEach((key) => window.localStorage.removeItem(key));
  }, []);

  useEffect(() => {
    if (!profile?.id || hasInitialized) return;
    api
      .get<ProfessionalSchedule>('/profesional/schedule')
      .then((response) => {
        const schedule = normalizeSchedule(response.data);
        setDays(schedule.days);
        setPauses(schedule.pauses);
        setSlotDurationMinutes(normalizeSlotDuration(schedule.slotDurationMinutes));
        setLastSavedSchedule(schedule);
        setIsDirty(false);
        if (schedule.days.length > 0) {
          setConstructorDay(schedule.days[0].day);
          setConstructorTargets([schedule.days[0].day]);
        }
      })
      .catch((error) => {
        const fallback = createDefaultSchedule();
        setDays(fallback.days);
        setPauses(fallback.pauses);
        setSlotDurationMinutes(normalizeSlotDuration(fallback.slotDurationMinutes));
        setLastSavedSchedule(fallback);
        setIsDirty(false);
        setSaveMessage(
          extractApiErrorMessage(
            error,
            'No se pudieron cargar los horarios. Mostramos una base inicial.',
          ),
        );
        setSaveError(true);
      })
      .finally(() => {
        setHasInitialized(true);
      });
  }, [profile?.id, hasInitialized]);

  useEffect(() => {
    if (!scrollTarget) return;
    const target = document.getElementById(scrollTarget);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setScrollTarget(null);
    }
  }, [scrollTarget, days]);

  const currentSchedule = useMemo<ProfessionalSchedule>(
    () => ({ days, pauses, slotDurationMinutes }),
    [days, pauses, slotDurationMinutes],
  );
  const currentSignature = useMemo(
    () => createScheduleSignature(currentSchedule),
    [currentSchedule],
  );
  const savedSignature = useMemo(
    () => (lastSavedSchedule ? createScheduleSignature(lastSavedSchedule) : null),
    [lastSavedSchedule],
  );

  useEffect(() => {
    if (!lastSavedSchedule) {
      setIsDirty(false);
      return;
    }
    setIsDirty(currentSignature !== savedSignature);
  }, [currentSignature, lastSavedSchedule, savedSignature]);

  const showSkeleton = !hasLoaded || (isLoading && !profile) || !hasInitialized;

  const inputClassName =
    'h-11 w-full rounded-[16px] border border-[color:var(--border-soft)] bg-white/92 px-3 text-sm text-[color:var(--ink)] placeholder:text-[color:var(--ink-faint)] focus:border-[color:var(--accent)] focus:outline-none focus:ring-4 focus:ring-[color:var(--focus-ring)]';

  const handleSave = useCallback(async (nextSchedule?: ProfessionalSchedule, message?: string) => {
    if (isSaving) return false;
    if (!profile?.id) return false;
    setIsSaving(true);
    setSaveMessage(null);
    setSaveError(false);

    try {
      const schedule = nextSchedule ?? { days, pauses, slotDurationMinutes };
      const response = await api.put<ProfessionalSchedule>('/profesional/schedule', schedule);
      const persisted = normalizeSchedule(response.data);
      setSaveMessage(message ?? 'Horarios guardados correctamente.');
      setSaveError(false);
      setDays(persisted.days);
      setPauses(persisted.pauses);
      setSlotDurationMinutes(normalizeSlotDuration(persisted.slotDurationMinutes));
      setLastSavedSchedule(persisted);
      return true;
    } catch (error) {
      setSaveMessage(
        extractApiErrorMessage(error, 'No se pudieron guardar. Intentá de nuevo.'),
      );
      setSaveError(true);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [days, isSaving, pauses, profile?.id, slotDurationMinutes]);

  const handleResetUnsaved = useCallback(() => {
    if (!lastSavedSchedule) return;
    setDays(lastSavedSchedule.days);
    setPauses(lastSavedSchedule.pauses);
    setSlotDurationMinutes(normalizeSlotDuration(lastSavedSchedule.slotDurationMinutes));
    setEditingRange(null);
    setConstructorError(null);
    setPauseDraft(buildEmptyPause());
    setSaveMessage(null);
    setSaveError(false);
  }, [lastSavedSchedule]);

  useProfessionalDashboardUnsavedSection({
    sectionId: 'schedule-builder',
    isDirty,
    isSaving,
    onSave: () => handleSave(undefined, 'Horarios guardados correctamente.'),
    onReset: handleResetUnsaved,
  });

  const markPendingSave = (message: string) => {
    setSaveMessage(message);
    setSaveError(false);
  };

  const handleSlotDurationChange = (value: string) => {
    const nextValue = normalizeSlotDuration(Number(value));
    setSlotDurationMinutes(nextValue);
    markPendingSave('Duración de turnos actualizada. Guardá cambios para confirmar.');
  };

  const handleToggleAvailable = (dayKey: WorkDayKey, checked: boolean) => {
    setDays((prev) =>
      prev.map((day) =>
        day.day === dayKey
          ? { ...day, enabled: checked, paused: false }
          : day,
      ),
    );
  };

  const handleTogglePaused = (dayKey: WorkDayKey, checked: boolean) => {
    setDays((prev) =>
      prev.map((day) =>
        day.day === dayKey
          ? { ...day, paused: checked, enabled: checked ? false : day.enabled }
          : day,
      ),
    );
  };

  const sortDaysByWeek = (selectedDays: WorkDayKey[]) =>
    dayOptions.filter((day) => selectedDays.includes(day));

  const toggleConstructorTarget = (dayKey: WorkDayKey) => {
    setConstructorTargets((prev) => {
      const next = prev.includes(dayKey)
        ? prev.filter((day) => day !== dayKey)
        : [...prev, dayKey];
      return sortDaysByWeek(next);
    });
    setConstructorError(null);
  };

  const scrollToConstructor = () => {
    constructorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const startEditingRange = (dayKey: WorkDayKey, range: WorkShift) => {
    setEditingRange({ day: dayKey, rangeId: range.id });
    setRangeDraft({ start: range.start, end: range.end });
    setConstructorDay(dayKey);
    setConstructorTargets([dayKey]);
    setConstructorError(null);
    scrollToConstructor();
  };

  const handleRangeDraftChange = (field: 'start' | 'end', value: string) => {
    setRangeDraft((prev) => ({ ...prev, [field]: value }));
    setConstructorError(null);
  };

  const resetRangeDraft = (dayKey?: WorkDayKey) => {
    if (dayKey) setConstructorDay(dayKey);
    setEditingRange(null);
    setRangeDraft({ start: '09:00', end: '18:00' });
    setConstructorError(null);
  };

  const getRangeError = (
    dayKey: WorkDayKey,
    startValue: string,
    endValue: string,
    excludeId?: string,
  ) => {
    const start = parseTime(startValue);
    const end = parseTime(endValue);
    if (start === null || end === null) {
      return 'Completá el inicio y el fin.';
    }
    if (end <= start) {
      return 'El horario de fin debe ser mayor al inicio.';
    }
    const day = days.find((item) => item.day === dayKey);
    if (!day) return 'Día inválido.';
    const overlaps = day.ranges.some((range) => {
      if (range.id === excludeId) return false;
      const rangeStart = parseTime(range.start);
      const rangeEnd = parseTime(range.end);
      if (rangeStart === null || rangeEnd === null) return false;
      return start < rangeEnd && end > rangeStart;
    });
    if (overlaps) {
      return 'Ya existe un horario en ese rango.';
    }
    return null;
  };

  const getDayPauseRanges = useCallback((day: WorkDaySchedule) => {
    if (!day.enabled || day.paused || day.ranges.length < 2) return [];
    const sortedRanges = [...day.ranges].sort((a, b) => a.start.localeCompare(b.start));
    return sortedRanges.reduce<Array<{ id: string; start: string; end: string }>>(
      (acc, range, index) => {
        const nextRange = sortedRanges[index + 1];
        if (!nextRange) return acc;
        const rangeEnd = parseTime(range.end);
        const nextStart = parseTime(nextRange.start);
        if (rangeEnd !== null && nextStart !== null && nextStart > rangeEnd) {
          acc.push({
            id: `${day.day}-${range.id}-${nextRange.id}`,
            start: range.end,
            end: nextRange.start,
          });
        }
        return acc;
      },
      [],
    );
  }, []);

  const buildDraftSegments = () => {
    const start = parseTime(rangeDraft.start);
    const end = parseTime(rangeDraft.end);
    if (start === null || end === null) {
      return { error: 'Completá el inicio y el fin.', segments: [] };
    }
    if (end <= start) {
      return { error: 'El horario de fin debe ser mayor al inicio.', segments: [] };
    }

    const pauseWindows = quickPauseEnabled
      ? quickPauses
          .map((pause) => ({
            start: parseTime(pause.start),
            end: parseTime(pause.end),
          }))
          .filter(
            (pause): pause is { start: number; end: number } =>
              pause.start !== null && pause.end !== null,
          )
      : [];

    const validPauseWindows = pauseWindows.sort((a, b) => a.start - b.start);
    for (const pause of validPauseWindows) {
      if (pause.end <= pause.start) {
        return { error: 'El fin de la pausa debe ser mayor al inicio.', segments: [] };
      }
      if (pause.start <= start || pause.end >= end) {
        return {
          error: 'La pausa tiene que estar dentro de la franja principal.',
          segments: [],
        };
      }
    }

    const hasOverlappingPause = validPauseWindows.some((pause, index) => {
      const nextPause = validPauseWindows[index + 1];
      return Boolean(nextPause && pause.end > nextPause.start);
    });
    if (hasOverlappingPause) {
      return { error: 'Hay pausas superpuestas en el editor rápido.', segments: [] };
    }

    const segments: Array<{ start: string; end: string }> = [];
    let cursor = start;
    validPauseWindows.forEach((pause) => {
      if (pause.start > cursor) {
        segments.push({ start: toTimeValue(cursor), end: toTimeValue(pause.start) });
      }
      cursor = pause.end;
    });
    if (cursor < end) {
      segments.push({ start: toTimeValue(cursor), end: toTimeValue(end) });
    }

    return { error: null, segments };
  };

  const handleSaveRange = () => {
    if (!editingRange) return;
    const error = getRangeError(
      editingRange.day,
      rangeDraft.start,
      rangeDraft.end,
      editingRange.rangeId,
    );
    if (error) {
      setConstructorError(error);
      return;
    }
    const nextDays = days.map((day) => {
      if (day.day !== editingRange.day) return day;
      return {
        ...day,
        ranges: day.ranges.map((range) =>
          range.id === editingRange.rangeId
            ? { ...range, start: rangeDraft.start, end: rangeDraft.end }
            : range,
        ),
      };
    });
    setDays(nextDays);
    setEditingRange(null);
    setConstructorError(null);
    markPendingSave('Horario actualizado. Guardá cambios para confirmar.');
  };

  const applyRangeToTargets = (targets: WorkDayKey[]) => {
    const sortedTargets = sortDaysByWeek(targets);
    if (sortedTargets.length === 0) {
      setConstructorError('Seleccioná al menos un día.');
      return;
    }

    const { error, segments } = buildDraftSegments();
    if (error) {
      setConstructorError(error);
      return;
    }

    if (constructorMode === 'append') {
      const overlappingDays = sortedTargets.filter((dayKey) =>
        segments.some((segment) => Boolean(getRangeError(dayKey, segment.start, segment.end))),
      );
      if (overlappingDays.length > 0) {
        const labels = overlappingDays.map((day) => dayLabels[day]).join(', ');
        setConstructorError(`Ya existe una franja superpuesta en: ${labels}.`);
        return;
      }
    }

    const nextDays = days.map((day) =>
      sortedTargets.includes(day.day)
        ? (() => {
            const newRanges = segments.map((segment, index) =>
              createRange(day.day, segment.start, segment.end, index + 1),
            );
            if (constructorMode === 'replace') {
              return {
                ...day,
                enabled: true,
                paused: false,
                ranges: newRanges,
              };
            }
            return {
              ...day,
              enabled: true,
              paused: false,
              ranges: [...day.ranges, ...newRanges],
            };
          })()
        : day,
    );

    setDays(nextDays);
    const firstTarget = sortedTargets[0];
    if (firstTarget) {
      const targetDay = nextDays.find((day) => day.day === firstTarget);
      const targetRange = targetDay?.ranges[targetDay.ranges.length - 1];
      if (targetRange) {
        setScrollTarget(`range-${firstTarget}-${targetRange.id}`);
      }
    }
    const dayCount = sortedTargets.length;
    const actionLabel = constructorMode === 'replace' ? 'reemplazados' : 'creados';
    markPendingSave(
      `Horarios ${actionLabel} en ${dayCount} día${dayCount === 1 ? '' : 's'}. Guardá cambios para confirmar.`,
    );
    resetRangeDraft(sortedTargets[0]);
  };

  const handleAddRange = () => {
    applyRangeToTargets(constructorTargets);
  };

  const handleRemoveRange = (dayKey: WorkDayKey, rangeId: string) => {
    const nextDays = days.map((day) =>
      day.day === dayKey
        ? { ...day, ranges: day.ranges.filter((range) => range.id !== rangeId) }
        : day,
    );
    setDays(nextDays);
    if (editingRange?.rangeId === rangeId && editingRange.day === dayKey) {
      setEditingRange(null);
    }
    markPendingSave('Horario eliminado. Guardá cambios para confirmar.');
  };

  const handleCreateFromDay = (dayKey: WorkDayKey) => {
    setConstructorTargets([dayKey]);
    resetRangeDraft(dayKey);
    scrollToConstructor();
  };

  const handleApplyToWeekdays = () => {
    setConstructorTargets([...weekdayOptions]);
    applyRangeToTargets([...weekdayOptions]);
  };

  const handleClearSelectedDay = () => {
    const targetDay = constructorTargets[0] ?? constructorDay;
    setDays((prev) =>
      prev.map((day) =>
        day.day === targetDay
          ? { ...day, enabled: false, paused: false, ranges: [] }
          : day,
      ),
    );
    setConstructorDay(targetDay);
    setConstructorTargets([targetDay]);
    setEditingRange(null);
    setConstructorError(null);
    markPendingSave(`${dayLabels[targetDay]} quedó cerrado. Guardá cambios para confirmar.`);
  };

  const handleQuickPauseChange = (
    pauseId: string,
    field: 'start' | 'end',
    value: string,
  ) => {
    setQuickPauses((prev) =>
      prev.map((pause) =>
        pause.id === pauseId ? { ...pause, [field]: value } : pause,
      ),
    );
    setConstructorError(null);
  };

  const handleAddQuickPause = () => {
    setQuickPauseEnabled(true);
    setQuickPauses((prev) => [
      ...prev,
      { id: `quick-pause-${Date.now()}`, start: '13:00', end: '14:00' },
    ]);
  };

  const handleRemoveQuickPause = (pauseId: string) => {
    setQuickPauses((prev) =>
      prev.length > 1 ? prev.filter((pause) => pause.id !== pauseId) : prev,
    );
  };

  const handlePauseDraftChange = (
    field: keyof SchedulePauseRange,
    value: string,
  ) => {
    setPauseDraft((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddPause = () => {
    if (!pauseDraft.startDate) return;
    const start = pauseDraft.startDate;
    const end = pauseDraft.endDate || pauseDraft.startDate;
    const normalized =
      end < start ? { startDate: end, endDate: start } : { startDate: start, endDate: end };

    const nextPauses = [
      ...pauses,
      {
        ...pauseDraft,
        ...normalized,
        id: `pause-${Date.now()}`,
      },
    ];
    setPauses(nextPauses);
    setPauseDraft(buildEmptyPause());
    setIsAddingAbsence(false);
    markPendingSave('Pausa agregada. Guardá cambios para confirmar.');
  };

  const handleRemovePause = (pauseId: string) => {
    const nextPauses = pauses.filter((pause) => pause.id !== pauseId);
    setPauses(nextPauses);
    markPendingSave('Pausa eliminada. Guardá cambios para confirmar.');
  };

  const summary = useMemo(() => {
    const activeDays = days.filter(
      (day) => day.enabled && !day.paused && day.ranges.length > 0,
    );
    const weeklyPauseCount = days.reduce(
      (count, day) => count + getDayPauseRanges(day).length,
      0,
    );
    return {
      activeCount: activeDays.length,
      activeLabels: activeDays.map((day) => shortDayLabels[day.day]).join(', '),
      pauseCount: weeklyPauseCount + pauses.length,
    };
  }, [days, getDayPauseRanges, pauses.length]);

  const slotDurationChanged = useMemo(() => {
    if (!lastSavedSchedule) return false;
    return (
      normalizeSlotDuration(slotDurationMinutes) !==
      normalizeSlotDuration(lastSavedSchedule.slotDurationMinutes)
    );
  }, [lastSavedSchedule, slotDurationMinutes]);

  return (
    <ProfessionalDashboardShell profile={profile} active="Horarios de trabajo">
      <div className="space-y-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[#64748B]">
              DISPONIBILIDAD
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.02em] text-[#0F172A]">
              Horarios de trabajo
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-[#64748B]">
              Configurá la base semanal, las pausas y la duración de slots desde un layout más operativo.
            </p>
          </div>
          <Button
            type="button"
            variant="primary"
            onClick={() => void handleSave(undefined, 'Horarios guardados correctamente.')}
            disabled={isSaving}
          >
            {isSaving ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </div>

        {saveMessage ? (
          <p className={`rounded-[14px] border px-4 py-3 text-sm font-medium shadow-[var(--shadow-card)] ${
            saveError
              ? 'border-red-200 bg-red-50 text-red-500'
              : 'border-[#cdeee9] bg-[#f0fffc] text-[#0F766E]'
          }`}>
            {saveMessage}
          </p>
        ) : null}

        {showSkeleton ? (
          <div className="rounded-[18px] border border-white/70 bg-white/95 p-5 shadow-[0_4px_14px_rgba(15,23,42,0.04)]">
            <div className="h-5 w-52 rounded-full bg-[#E2E7EC]" />
            <div className="mt-4 space-y-3">
              <div className="h-10 w-full rounded-[14px] bg-[#F1F5F9]" />
              <div className="h-10 w-full rounded-[14px] bg-[#F1F5F9]" />
              <div className="h-10 w-full rounded-[14px] bg-[#F1F5F9]" />
            </div>
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-[16px] border border-[#E2E8F0] bg-white p-5 shadow-[0_4px_14px_rgba(15,23,42,0.04)]">
                <div className="flex items-center gap-4">
                  <span className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-emerald-50 text-emerald-700">
                    <DashboardIcon name="agenda" />
                  </span>
                  <div>
                    <p className="text-lg font-semibold text-[#0F172A]">
                      {summary.activeCount} días activos
                    </p>
                    <p className="mt-1 text-sm text-[#64748B]">
                      {summary.activeLabels || 'Sin días activos'}
                    </p>
                  </div>
                </div>
              </div>
              <div className="rounded-[16px] border border-[#E2E8F0] bg-white p-5 shadow-[0_4px_14px_rgba(15,23,42,0.04)]">
                <div className="flex items-center gap-4">
                  <span className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-amber-50 text-amber-700">
                    <DashboardIcon name="warning" />
                  </span>
                  <div>
                    <p className="text-lg font-semibold text-[#0F172A]">
                      {summary.pauseCount} pausas
                    </p>
                    <p className="mt-1 text-sm text-[#64748B]">
                      Configuradas en horarios y ausencias
                    </p>
                  </div>
                </div>
              </div>
              <div className="rounded-[16px] border border-[#E2E8F0] bg-white p-5 shadow-[0_4px_14px_rgba(15,23,42,0.04)]">
                <div className="flex items-center gap-4">
                  <span className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-sky-50 text-sky-700">
                    <DashboardIcon name="horarios" />
                  </span>
                  <div>
                    <p className="text-lg font-semibold text-[#0F172A]">
                      {slotDurationMinutes} min por slot
                    </p>
                    <p className="mt-1 text-sm text-[#64748B]">
                      Duración de cada turno
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
              <div className="space-y-5">
                <section className="rounded-[18px] border border-[#E2E8F0] bg-white p-4 shadow-[0_4px_14px_rgba(15,23,42,0.04)] sm:p-5">
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-[#0F172A]">Horario semanal</h2>
                      <p className="mt-1 text-sm text-[#64748B]">
                        Seleccioná un día para editar su horario.
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {days.map((day) => (
                      <DayScheduleCard
                        key={day.day}
                        day={day}
                        pauseRanges={getDayPauseRanges(day)}
                        onToggleAvailable={handleToggleAvailable}
                        onTogglePaused={handleTogglePaused}
                        onEditRange={startEditingRange}
                        onRemoveRange={handleRemoveRange}
                        onCreateFromDay={handleCreateFromDay}
                      />
                    ))}
                  </div>
                </section>

                <section className="rounded-[18px] border border-[#E2E8F0] bg-white p-4 shadow-[0_4px_14px_rgba(15,23,42,0.04)] sm:p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-[#0F172A]">Vacaciones y ausencias</h2>
                      <p className="mt-1 text-sm text-[#64748B]">
                        Bloqueá períodos completos en los que no vas a trabajar.
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="accent"
                      onClick={() => setIsAddingAbsence((current) => !current)}
                    >
                      Agregar período
                    </Button>
                  </div>

                  {isAddingAbsence ? (
                    <div className="mt-4 grid gap-3 rounded-[14px] border border-[#E2E8F0] bg-[#F8FAFC] p-3 md:grid-cols-[1fr,1fr,1.2fr,auto] md:items-end">
                      <div>
                        <label className="text-xs font-semibold text-[#0F172A]">Inicio</label>
                        <input
                          type="date"
                          className={inputClassName}
                          value={pauseDraft.startDate}
                          onChange={(event) => handlePauseDraftChange('startDate', event.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-[#0F172A]">Fin</label>
                        <input
                          type="date"
                          className={inputClassName}
                          value={pauseDraft.endDate}
                          onChange={(event) => handlePauseDraftChange('endDate', event.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-[#0F172A]">Nota</label>
                        <input
                          type="text"
                          className={inputClassName}
                          value={pauseDraft.note ?? ''}
                          onChange={(event) => handlePauseDraftChange('note', event.target.value)}
                          placeholder="Opcional"
                        />
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="primary"
                        onClick={handleAddPause}
                        disabled={!pauseDraft.startDate}
                      >
                        Guardar
                      </Button>
                    </div>
                  ) : null}

                  <div className="mt-4 space-y-2">
                    {pauses.length === 0 ? (
                      <div className="rounded-[14px] border border-dashed border-[#CBD5E1] px-4 py-3 text-sm text-[#64748B]">
                        No hay períodos cargados.
                      </div>
                    ) : (
                      pauses.map((pause) => {
                        const today = new Date().toISOString().slice(0, 10);
                        const status = pause.startDate > today ? 'Próximo' : 'Programado';
                        return (
                          <div
                            key={pause.id}
                            className="flex flex-col gap-3 rounded-[14px] border border-[#E2E8F0] px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div className="flex flex-wrap items-center gap-3">
                              <span className="font-semibold text-[#0F172A]">
                                {formatDateLabel(pause.startDate)}
                              </span>
                              <span className="text-[#64748B]">-</span>
                              <span className="font-semibold text-[#0F172A]">
                                {formatDateLabel(pause.endDate || pause.startDate)}
                              </span>
                              <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                                {status}
                              </span>
                              {pause.note ? (
                                <span className="text-xs text-[#64748B]">{pause.note}</span>
                              ) : null}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemovePause(pause.id)}
                              className="self-start rounded-lg border border-red-100 bg-white px-3 py-1.5 text-xs font-semibold text-red-500 transition hover:bg-red-50 sm:self-auto"
                            >
                              Eliminar
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </section>

                <div className="rounded-[16px] border border-[#D9E2EC] bg-[#F8FAFC] px-4 py-3 text-sm text-[#334155]">
                  <p>Tus clientes solo verán horarios disponibles dentro de las franjas activas.</p>
                  <p className="mt-1">
                    Las pausas no son reservables y los días cerrados no se muestran como disponibles.
                  </p>
                </div>
              </div>

              <aside className="space-y-5">
                <section
                  ref={constructorRef}
                  className="rounded-[18px] border border-[#E2E8F0] bg-white p-4 shadow-[0_4px_14px_rgba(15,23,42,0.04)] sm:p-5"
                >
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 text-[#0F766E]">
                      <DashboardIcon name="spark" />
                    </span>
                    <div>
                      <h2 className="text-lg font-semibold text-[#0F172A]">Editor rápido</h2>
                      <p className="mt-1 text-sm text-[#64748B]">
                        Editá rápidamente el horario del día seleccionado.
                      </p>
                    </div>
                  </div>

                  <div className="mt-5">
                    <p className="text-sm font-semibold text-[#0F172A]">Días</p>
                    <div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-7 xl:grid-cols-4">
                      {dayOptions.map((day) => {
                        const selected = constructorTargets.includes(day);
                        return (
                          <button
                            key={day}
                            type="button"
                            disabled={Boolean(editingRange)}
                            onClick={() => {
                              toggleConstructorTarget(day);
                              setConstructorDay(day);
                            }}
                            className={`h-10 rounded-lg border text-sm font-semibold transition ${
                              selected
                                ? 'border-[#1FB6A6] bg-[#ECFDF5] text-[#0F766E]'
                                : 'border-[#E2E8F0] bg-white text-[#475569]'
                            } disabled:cursor-not-allowed disabled:opacity-60`}
                          >
                            {shortDayLabels[day]}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="text-sm font-semibold text-[#0F172A]">Inicio</label>
                      <input
                        type="time"
                        className={inputClassName}
                        value={rangeDraft.start}
                        onChange={(event) => handleRangeDraftChange('start', event.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-[#0F172A]">Fin</label>
                      <input
                        type="time"
                        className={inputClassName}
                        value={rangeDraft.end}
                        onChange={(event) => handleRangeDraftChange('end', event.target.value)}
                      />
                    </div>
                  </div>

                  {!editingRange ? (
                    <div className="mt-4 space-y-3">
                      <label className="flex items-center gap-2 text-sm font-semibold text-[#0F172A]">
                        <input
                          type="checkbox"
                          checked={quickPauseEnabled}
                          onChange={(event) => setQuickPauseEnabled(event.target.checked)}
                          className="h-4 w-4 accent-[#1FB6A6]"
                        />
                        Agregar pausa <span className="font-normal text-[#64748B]">(opcional)</span>
                      </label>
                      {quickPauseEnabled ? (
                        <div className="space-y-3">
                          {quickPauses.map((pause) => (
                            <div key={pause.id} className="grid gap-3 sm:grid-cols-[1fr,1fr,auto] sm:items-end">
                              <div>
                                <label className="text-xs font-semibold text-[#0F172A]">Inicio pausa</label>
                                <input
                                  type="time"
                                  className={inputClassName}
                                  value={pause.start}
                                  onChange={(event) =>
                                    handleQuickPauseChange(pause.id, 'start', event.target.value)
                                  }
                                />
                              </div>
                              <div>
                                <label className="text-xs font-semibold text-[#0F172A]">Fin pausa</label>
                                <input
                                  type="time"
                                  className={inputClassName}
                                  value={pause.end}
                                  onChange={(event) =>
                                    handleQuickPauseChange(pause.id, 'end', event.target.value)
                                  }
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveQuickPause(pause.id)}
                                disabled={quickPauses.length === 1}
                                className="h-11 rounded-lg border border-[#E2E8F0] px-3 text-xs font-semibold text-[#64748B] transition hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                Quitar
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={handleAddQuickPause}
                            className="h-10 w-full rounded-lg border border-[#D9E7E2] bg-white text-sm font-semibold text-[#0F766E] transition hover:bg-[#ECFDF5]"
                          >
                            + Agregar otra pausa
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="mt-5">
                    <p className="text-sm font-semibold text-[#0F172A]">Modo de aplicación</p>
                    <div className="mt-2 grid grid-cols-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-1">
                      <button
                        type="button"
                        disabled={Boolean(editingRange)}
                        onClick={() => setConstructorMode('append')}
                        className={`h-9 rounded-md text-sm font-semibold transition ${
                          constructorMode === 'append'
                            ? 'bg-[#0F9F6E] text-white shadow-sm'
                            : 'text-[#334155]'
                        } disabled:cursor-not-allowed disabled:opacity-60`}
                      >
                        Agregar franja
                      </button>
                      <button
                        type="button"
                        disabled={Boolean(editingRange)}
                        onClick={() => setConstructorMode('replace')}
                        className={`h-9 rounded-md text-sm font-semibold transition ${
                          constructorMode === 'replace'
                            ? 'bg-[#0F9F6E] text-white shadow-sm'
                            : 'text-[#334155]'
                        } disabled:cursor-not-allowed disabled:opacity-60`}
                      >
                        Reemplazar
                      </button>
                    </div>
                    <p className="mt-2 text-xs text-[#64748B]">
                      {constructorMode === 'replace'
                        ? 'Reemplaza las franjas del día por la nueva configuración.'
                        : 'Añade la franja al horario existente sin eliminar otras.'}
                    </p>
                  </div>

                  <div className="mt-5 space-y-2">
                    {editingRange ? (
                      <>
                        <Button
                          type="button"
                          variant="primary"
                          className="w-full"
                          onClick={handleSaveRange}
                        >
                          Guardar franja
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          className="w-full"
                          onClick={() => resetRangeDraft(constructorTargets[0] ?? constructorDay)}
                        >
                          Cancelar edición
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          type="button"
                          variant="primary"
                          className="w-full"
                          onClick={handleAddRange}
                          disabled={constructorTargets.length === 0}
                        >
                          Aplicar a días seleccionados
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          className="w-full"
                          onClick={handleApplyToWeekdays}
                        >
                          Aplicar a laborables (Lun - Vie)
                        </Button>
                        <Button
                          type="button"
                          variant="danger"
                          className="w-full"
                          onClick={handleClearSelectedDay}
                        >
                          Limpiar día seleccionado
                        </Button>
                      </>
                    )}
                  </div>

                  {constructorError ? (
                    <p className="mt-3 text-xs font-semibold text-[#C24141]">
                      {constructorError}
                    </p>
                  ) : null}
                </section>

                <section className="rounded-[18px] border border-[#E2E8F0] bg-white p-4 shadow-[0_4px_14px_rgba(15,23,42,0.04)] sm:p-5">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 text-sky-700">
                      <DashboardIcon name="horarios" />
                    </span>
                    <div>
                      <h2 className="text-lg font-semibold text-[#0F172A]">Duración de slots</h2>
                      <p className="mt-1 text-sm text-[#64748B]">
                        Define cada cuánto se generan los turnos disponibles.
                      </p>
                    </div>
                  </div>
                  <select
                    id="slot-duration-minutes"
                    value={slotDurationMinutes}
                    onChange={(event) => handleSlotDurationChange(event.target.value)}
                    className={`${inputClassName} mt-4`}
                  >
                    {SLOT_DURATION_OPTIONS.map((minutes) => (
                      <option key={minutes} value={minutes}>
                        {minutes} minutos
                      </option>
                    ))}
                  </select>
                  {slotDurationChanged ? (
                    <p className="mt-3 text-xs font-semibold text-[#B45309]">
                      Cambiar la duración de slots puede modificar la disponibilidad visible.
                    </p>
                  ) : null}
                </section>
              </aside>
            </div>
          </>
        )}
      </div>
    </ProfessionalDashboardShell>
  );
}
