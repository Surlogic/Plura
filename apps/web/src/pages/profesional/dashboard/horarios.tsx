'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ProfesionalSidebar from '@/components/profesional/Sidebar';
import Button from '@/components/ui/Button';
import DayScheduleCard from '@/components/profesional/schedule/DayScheduleCard';
import SchedulePausesPanel from '@/components/profesional/schedule/SchedulePausesPanel';
import { useProfessionalProfile } from '@/hooks/useProfessionalProfile';
import { isAxiosError } from 'axios';
import api from '@/services/api';
import { useProfessionalDashboardUnsavedSection } from '@/context/ProfessionalDashboardUnsavedChangesContext';
import {
  DashboardHero,
  DashboardSectionHeading,
  DashboardStatCard,
} from '@/components/profesional/dashboard/DashboardUI';
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
  const [pauseDraft, setPauseDraft] = useState<SchedulePauseRange>(
    buildEmptyPause(),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [lastSavedSchedule, setLastSavedSchedule] = useState<ProfessionalSchedule | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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
    'h-11 w-full rounded-[14px] border border-[#E2E7EC] bg-white px-3 text-sm text-[#0E2A47] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#1FB6A6]/30';

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

  const handleToggleMenu = () => {
    setIsMenuOpen((prev) => !prev);
  };

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

  const selectAllConstructorTargets = () => {
    setConstructorTargets([...dayOptions]);
    setConstructorError(null);
  };

  const selectWeekdayConstructorTargets = () => {
    setConstructorTargets([...weekdayOptions]);
    setConstructorError(null);
  };

  const clearConstructorTargets = () => {
    setConstructorTargets([]);
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

  const parseTime = (value: string) => {
    const [hours, minutes] = value.split(':').map(Number);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
    return hours * 60 + minutes;
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

  const handleAddRange = () => {
    if (constructorTargets.length === 0) {
      setConstructorError('Seleccioná al menos un día.');
      return;
    }

    const start = parseTime(rangeDraft.start);
    const end = parseTime(rangeDraft.end);
    if (start === null || end === null) {
      setConstructorError('Completá el inicio y el fin.');
      return;
    }
    if (end <= start) {
      setConstructorError('El horario de fin debe ser mayor al inicio.');
      return;
    }

    if (constructorMode === 'append') {
      const overlappingDays = constructorTargets.filter((dayKey) =>
        Boolean(getRangeError(dayKey, rangeDraft.start, rangeDraft.end)),
      );
      if (overlappingDays.length > 0) {
        const labels = overlappingDays.map((day) => dayLabels[day]).join(', ');
        setConstructorError(`Ya existe una franja superpuesta en: ${labels}.`);
        return;
      }
    }

    const nextDays = days.map((day) =>
      constructorTargets.includes(day.day)
        ? (() => {
            const newRange = createRange(day.day, rangeDraft.start, rangeDraft.end);
            if (constructorMode === 'replace') {
              return {
                ...day,
                enabled: true,
                paused: false,
                ranges: [newRange],
              };
            }
            return {
              ...day,
              enabled: true,
              paused: false,
              ranges: [...day.ranges, newRange],
            };
          })()
        : day,
    );

    setDays(nextDays);
    const firstTarget = constructorTargets[0];
    if (firstTarget) {
      const targetDay = nextDays.find((day) => day.day === firstTarget);
      const targetRange = targetDay?.ranges[targetDay.ranges.length - 1];
      if (targetRange) {
        setScrollTarget(`range-${firstTarget}-${targetRange.id}`);
      }
    }
    const dayCount = constructorTargets.length;
    const actionLabel = constructorMode === 'replace' ? 'reemplazados' : 'creados';
    markPendingSave(
      `Horarios ${actionLabel} en ${dayCount} día${dayCount === 1 ? '' : 's'}. Guardá cambios para confirmar.`,
    );
    resetRangeDraft(constructorTargets[0]);
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
    return {
      activeCount: activeDays.length,
      pausedCount: days.filter((day) => day.paused).length,
      closedCount: days.filter((day) => !day.enabled).length,
    };
  }, [days]);

  const slotDurationChanged = useMemo(() => {
    if (!lastSavedSchedule) return false;
    return (
      normalizeSlotDuration(slotDurationMinutes) !==
      normalizeSlotDuration(lastSavedSchedule.slotDurationMinutes)
    );
  }, [lastSavedSchedule, slotDurationMinutes]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#FFFFFF_0%,#EEF2F6_45%,#D3D7DC_100%)] text-[#0E2A47]">
      <div className="flex min-h-screen">
          <aside className="hidden w-[260px] shrink-0 border-r border-[#0E2A47]/10 bg-[#0B1D2A] lg:block">
            <div className="sticky top-0 h-screen overflow-y-auto">
              <ProfesionalSidebar profile={profile} active="Horarios de trabajo" />
            </div>
          </aside>
          <div className="flex-1">
            <div className="px-4 pt-4 sm:px-6 lg:hidden">
              <Button type="button" size="sm" onClick={handleToggleMenu}>
                {isMenuOpen ? 'Cerrar menu' : 'Abrir menu'}
              </Button>
            </div>
            {isMenuOpen ? (
              <div className="border-b border-[#0E2A47]/10 bg-[#0B1D2A] lg:hidden">
                <ProfesionalSidebar profile={profile} active="Horarios de trabajo" />
              </div>
            ) : null}
            <main className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
              <div className="space-y-6">
            <DashboardHero
              eyebrow="Disponibilidad"
              icon="horarios"
              accent="ink"
              title="Horarios diseñados para operar sin fricción"
              description="Definí la base semanal, aplicá franjas en lote y detectá rápido qué días están activos, pausados o cerrados."
              meta={
                <>
                  <span className="rounded-full border border-white/12 bg-white/8 px-3 py-1 text-xs font-semibold text-white/80">
                    {summary.activeCount} activos
                  </span>
                  <span className="rounded-full border border-white/12 bg-white/8 px-3 py-1 text-xs font-semibold text-white/80">
                    {pauses.length} pausas
                  </span>
                </>
              }
              actions={(
                <Button
                  type="button"
                  variant="contrast"
                  onClick={() => void handleSave(undefined, 'Horarios guardados correctamente.')}
                  disabled={isSaving}
                >
                  {isSaving ? 'Guardando...' : 'Guardar cambios'}
                </Button>
              )}
            />

            {saveMessage ? (
              <p className={`rounded-full border px-4 py-2 text-sm font-medium shadow-[var(--shadow-card)] ${
                saveError
                  ? 'border-red-200 bg-red-50 text-red-500'
                  : 'border-[#cdeee9] bg-[#f0fffc] text-[#1FB6A6]'
              }`}>
                {saveMessage}
              </p>
            ) : null}

            <div className="grid gap-4 md:grid-cols-3">
              <DashboardStatCard
                label="Activos"
                value={`${summary.activeCount}`}
                detail="Días abiertos con franjas configuradas"
                icon="check"
                tone="accent"
              />
              <DashboardStatCard
                label="Pausados"
                value={`${summary.pausedCount}`}
                detail="Bloqueados temporalmente"
                icon="warning"
                tone="warm"
              />
              <DashboardStatCard
                label="Cerrados"
                value={`${summary.closedCount}`}
                detail="Días sin atención configurada"
                icon="horarios"
              />
            </div>

            {showSkeleton ? (
              <div className="rounded-[28px] border border-white/70 bg-white/95 p-6 shadow-[0_18px_40px_rgba(15,23,42,0.12)]">
                <div className="h-5 w-52 rounded-full bg-[#E2E7EC]" />
                <div className="mt-4 space-y-3">
                  <div className="h-10 w-full rounded-[14px] bg-[#F1F5F9]" />
                  <div className="h-10 w-full rounded-[14px] bg-[#F1F5F9]" />
                  <div className="h-10 w-full rounded-[14px] bg-[#F1F5F9]" />
                </div>
              </div>
            ) : (
              <div className="grid gap-6 lg:grid-cols-[1.2fr,0.8fr]">
                <div className="space-y-6">
                  <div
                    ref={constructorRef}
                    className="rounded-[24px] border border-white/70 bg-white/95 p-6 shadow-[0_16px_36px_rgba(15,23,42,0.12)]"
                  >
                    <div>
                      <DashboardSectionHeading
                        eyebrow="Constructor"
                        title="Crear horarios en lote"
                        description="Seleccioná días, definí la franja y aplicá cambios de una sola vez."
                      />

                      <div className="mt-4">
                        <p className="text-sm font-medium text-[#0E2A47]">Días</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {dayOptions.map((day) => {
                            const selected = constructorTargets.includes(day);
                            return (
                              <button
                                key={day}
                                type="button"
                                disabled={Boolean(editingRange)}
                                onClick={() => toggleConstructorTarget(day)}
                                className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                                  selected
                                    ? 'border-[#1FB6A6] bg-[#1FB6A6]/10 text-[#0E2A47]'
                                    : 'border-[#E2E7EC] bg-white text-[#64748B]'
                                } ${
                                  editingRange
                                    ? 'cursor-not-allowed opacity-60'
                                    : 'hover:-translate-y-0.5 hover:shadow-sm'
                                }`}
                              >
                                {dayLabels[day]}
                              </button>
                            );
                          })}
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={Boolean(editingRange)}
                            onClick={selectAllConstructorTargets}
                            className="rounded-full border border-[#E2E7EC] bg-white px-3 py-1 text-xs font-semibold text-[#0E2A47] transition enabled:hover:-translate-y-0.5 enabled:hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Todos
                          </button>
                          <button
                            type="button"
                            disabled={Boolean(editingRange)}
                            onClick={selectWeekdayConstructorTargets}
                            className="rounded-full border border-[#E2E7EC] bg-white px-3 py-1 text-xs font-semibold text-[#0E2A47] transition enabled:hover:-translate-y-0.5 enabled:hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Laborables
                          </button>
                          <button
                            type="button"
                            disabled={Boolean(editingRange)}
                            onClick={clearConstructorTargets}
                            className="rounded-full border border-[#E2E7EC] bg-white px-3 py-1 text-xs font-semibold text-[#0E2A47] transition enabled:hover:-translate-y-0.5 enabled:hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Limpiar
                          </button>
                        </div>
                        <p className="mt-2 text-xs text-[#64748B]">
                          Seleccionados: {constructorTargets.length}
                        </p>
                      </div>

                      <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        <div>
                          <label className="text-sm font-medium text-[#0E2A47]">
                            Inicio
                          </label>
                          <input
                            type="time"
                            className={inputClassName}
                            value={rangeDraft.start}
                            onChange={(event) =>
                              handleRangeDraftChange('start', event.target.value)
                            }
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-[#0E2A47]">
                            Fin
                          </label>
                          <input
                            type="time"
                            className={inputClassName}
                            value={rangeDraft.end}
                            onChange={(event) =>
                              handleRangeDraftChange('end', event.target.value)
                            }
                          />
                        </div>
                      </div>

                      <div className="mt-4">
                        <p className="text-sm font-medium text-[#0E2A47]">
                          Modo de aplicación
                        </p>
                        <div className="mt-2 inline-flex rounded-full border border-[#E2E7EC] bg-white p-1">
                          <button
                            type="button"
                            disabled={Boolean(editingRange)}
                            onClick={() => setConstructorMode('append')}
                            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                              constructorMode === 'append'
                                ? 'bg-[#1FB6A6] text-white'
                                : 'text-[#0E2A47]'
                            }`}
                          >
                            Agregar franja
                          </button>
                          <button
                            type="button"
                            disabled={Boolean(editingRange)}
                            onClick={() => setConstructorMode('replace')}
                            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                              constructorMode === 'replace'
                                ? 'bg-[#1FB6A6] text-white'
                                : 'text-[#0E2A47]'
                            }`}
                          >
                            Reemplazar existentes
                          </button>
                        </div>
                        <p className="mt-2 text-xs text-[#64748B]">
                          {constructorMode === 'replace'
                            ? 'Reemplaza todas las franjas del día seleccionado por esta nueva.'
                            : 'Agrega una nueva franja y conserva las existentes.'}
                        </p>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-3">
                        {editingRange ? (
                          <>
                            <button
                              type="button"
                              onClick={handleSaveRange}
                              className="rounded-full bg-[#1FB6A6] px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-md"
                            >
                              Guardar cambios
                            </button>
                            <button
                              type="button"
                              onClick={() => resetRangeDraft(constructorTargets[0] ?? constructorDay)}
                              className="rounded-full border border-[#E2E7EC] bg-white px-4 py-2 text-sm font-semibold text-[#0E2A47]"
                            >
                              Cancelar edición
                            </button>
                            <p className="text-xs text-[#94A3B8]">
                              Editando franja de {dayLabels[constructorDay]}.
                            </p>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={handleAddRange}
                              disabled={constructorTargets.length === 0}
                              className="rounded-full bg-[#1FB6A6] px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Crear horarios
                            </button>
                            <button
                              type="button"
                              onClick={() => resetRangeDraft(constructorTargets[0] ?? constructorDay)}
                              className="rounded-full border border-[#E2E7EC] bg-white px-4 py-2 text-sm font-semibold text-[#0E2A47]"
                            >
                              Limpiar
                            </button>
                          </>
                        )}
                      </div>
                      {constructorError ? (
                        <p className="mt-2 text-xs font-semibold text-[#C24141]">
                          {constructorError}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="space-y-4">
                    {days.map((day) => (
                      <DayScheduleCard
                        key={day.day}
                        day={day}
                        onToggleAvailable={handleToggleAvailable}
                        onTogglePaused={handleTogglePaused}
                        onEditRange={startEditingRange}
                        onRemoveRange={handleRemoveRange}
                        onCreateFromDay={handleCreateFromDay}
                      />
                    ))}
                  </div>

                  <SchedulePausesPanel
                    inputClassName={inputClassName}
                    pauseDraft={pauseDraft}
                    pauses={pauses}
                    onPauseDraftChange={handlePauseDraftChange}
                    onAddPause={handleAddPause}
                    onRemovePause={handleRemovePause}
                  />
                </div>

                <div className="space-y-6">
                  <div className="rounded-[24px] border border-white/70 bg-white/95 p-5 shadow-[0_16px_36px_rgba(15,23,42,0.12)]">
                    <p className="text-[0.65rem] uppercase tracking-[0.35em] text-[#94A3B8]">
                      Agenda
                    </p>
                    <h2 className="mt-2 text-lg font-semibold text-[#0E2A47]">
                      Duración de turnos
                    </h2>
                    <p className="mt-1 text-sm text-[#64748B]">
                      Elegí cada cuánto tiempo se generan los turnos disponibles en tu agenda.
                    </p>
                    <div className="mt-4">
                      <label htmlFor="slot-duration-minutes" className="text-sm font-medium text-[#0E2A47]">
                        Duración de turnos
                      </label>
                      <select
                        id="slot-duration-minutes"
                        value={slotDurationMinutes}
                        onChange={(event) => handleSlotDurationChange(event.target.value)}
                        className={inputClassName}
                      >
                        {SLOT_DURATION_OPTIONS.map((minutes) => (
                          <option key={minutes} value={minutes}>
                            {minutes} minutos
                          </option>
                        ))}
                      </select>
                    </div>
                    {slotDurationChanged ? (
                      <p className="mt-3 text-xs font-semibold text-[#B45309]">
                        Cambiar la duración de turnos puede modificar la disponibilidad de tu agenda.
                      </p>
                    ) : null}
                  </div>

                  <div className="rounded-[24px] border border-white/70 bg-white/95 p-5 shadow-[0_16px_36px_rgba(15,23,42,0.12)]">
                    <p className="text-[0.65rem] uppercase tracking-[0.35em] text-[#94A3B8]">
                      Pausas programadas
                    </p>
                    <h2 className="mt-2 text-lg font-semibold text-[#0E2A47]">
                      Próximas pausas
                    </h2>
                    <div className="mt-4 space-y-3 text-sm text-[#64748B]">
                      {pauses.length === 0 ? (
                        <p>No hay pausas activas.</p>
                      ) : (
                        pauses.map((pause) => (
                          <div key={pause.id} className="rounded-[14px] bg-[#F7F9FB] px-3 py-2">
                            <p className="font-semibold text-[#0E2A47]">
                              {pause.startDate} → {pause.endDate}
                            </p>
                            {pause.note ? <p className="text-xs">{pause.note}</p> : null}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
              </div>
            </main>
          </div>
        </div>
    </div>
  );
}
