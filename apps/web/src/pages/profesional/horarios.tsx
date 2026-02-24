'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';
import ProfesionalSidebar from '@/components/profesional/Sidebar';
import { useProfessionalProfile } from '@/hooks/useProfessionalProfile';
import {
  loadProfessionalSchedule,
  saveProfessionalSchedule,
} from '@/lib/professionalSchedule';
import type {
  ProfessionalSchedule,
  SchedulePauseRange,
  WorkDayKey,
  WorkDaySchedule,
  WorkShift,
} from '@/types/professional';

const dayLabels: Record<WorkDayKey, string> = {
  mon: 'Lunes',
  tue: 'Martes',
  wed: 'Miércoles',
  thu: 'Jueves',
  fri: 'Viernes',
  sat: 'Sábado',
  sun: 'Domingo',
};

const dayOptions: WorkDayKey[] = [
  'mon',
  'tue',
  'wed',
  'thu',
  'fri',
  'sat',
  'sun',
];

const buildEmptyPause = (): SchedulePauseRange => ({
  id: `pause-${Date.now()}`,
  startDate: '',
  endDate: '',
  note: '',
});

const createRange = (start = '09:00', end = '18:00'): WorkShift => ({
  id: `range-${Date.now()}`,
  start,
  end,
});

export default function ProfesionalScheduleBuilderPage() {
  const { profile, isLoading, hasLoaded } = useProfessionalProfile();
  const constructorRef = useRef<HTMLDivElement | null>(null);
  const [days, setDays] = useState<WorkDaySchedule[]>([]);
  const [pauses, setPauses] = useState<SchedulePauseRange[]>([]);
  const [repeatSource, setRepeatSource] = useState<WorkDayKey>('mon');
  const [repeatTargets, setRepeatTargets] = useState<WorkDayKey[]>([]);
  const [constructorDay, setConstructorDay] = useState<WorkDayKey>('mon');
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

  useEffect(() => {
    if (!profile?.id || hasInitialized) return;
    const schedule = loadProfessionalSchedule(profile.id);
    setDays(schedule.days);
    setPauses(schedule.pauses);
    if (schedule.days.length > 0) {
      setConstructorDay(schedule.days[0].day);
      setRepeatSource(schedule.days[0].day);
    }
    setHasInitialized(true);
  }, [profile?.id, hasInitialized]);

  useEffect(() => {
    if (!scrollTarget) return;
    const target = document.getElementById(scrollTarget);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setScrollTarget(null);
    }
  }, [scrollTarget, days]);

  const showSkeleton = !hasLoaded || (isLoading && !profile);

  const inputClassName =
    'h-11 w-full rounded-[14px] border border-[#E2E7EC] bg-white px-3 text-sm text-[#0E2A47] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#1FB6A6]/30';

  const handleSave = (nextSchedule?: ProfessionalSchedule, message?: string) => {
    if (!profile?.id) return;
    setIsSaving(true);
    setSaveMessage(null);
    setSaveError(false);

    try {
      const schedule = nextSchedule ?? { days, pauses };
      saveProfessionalSchedule(profile.id, schedule);
      setSaveMessage(message ?? 'Horarios guardados correctamente.');
      setSaveError(false);
      setDays(schedule.days);
      setPauses(schedule.pauses);
    } catch {
      setSaveMessage('No se pudieron guardar. Intentá de nuevo.');
      setSaveError(true);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDayChange = (dayKey: WorkDayKey, updates: Partial<WorkDaySchedule>) => {
    setDays((prev) =>
      prev.map((day) => (day.day === dayKey ? { ...day, ...updates } : day)),
    );
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

  const toggleRepeatTarget = (dayKey: WorkDayKey) => {
    setRepeatTargets((prev) =>
      prev.includes(dayKey) ? prev.filter((day) => day !== dayKey) : [...prev, dayKey],
    );
  };

  const handleApplyRepeat = () => {
    if (repeatTargets.length === 0) return;
    const source = days.find((day) => day.day === repeatSource);
    if (!source) return;
    const targets = repeatTargets.filter((day) => day !== repeatSource);
    setDays((prev) =>
      prev.map((day) =>
        targets.includes(day.day)
          ? {
              ...day,
              enabled: source.enabled,
              ranges: source.ranges.map((range, index) => ({
                id: `range-${day.day}-${Date.now()}-${index}`,
                start: range.start,
                end: range.end,
              })),
            }
          : day,
      ),
    );
    setRepeatTargets([]);
    setSaveMessage('Horario copiado a los días seleccionados.');
  };

  const scrollToConstructor = () => {
    constructorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const startEditingRange = (dayKey: WorkDayKey, range: WorkShift) => {
    setEditingRange({ day: dayKey, rangeId: range.id });
    setRangeDraft({ start: range.start, end: range.end });
    setConstructorDay(dayKey);
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
    handleSave({ days: nextDays, pauses }, 'Horario actualizado correctamente.');
  };

  const handleAddRange = () => {
    if (!constructorDay) return;
    const error = getRangeError(
      constructorDay,
      rangeDraft.start,
      rangeDraft.end,
    );
    if (error) {
      setConstructorError(error);
      return;
    }
    const newRange = createRange(rangeDraft.start, rangeDraft.end);
    const nextDays = days.map((day) =>
      day.day === constructorDay
        ? { ...day, enabled: true, ranges: [...day.ranges, newRange] }
        : day,
    );
    setDays(nextDays);
    setScrollTarget(`range-${constructorDay}-${newRange.id}`);
    handleSave({ days: nextDays, pauses }, 'Horario creado correctamente.');
    resetRangeDraft(constructorDay);
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
    handleSave({ days: nextDays, pauses }, 'Horario eliminado.');
  };

  const handleCreateFromDay = (dayKey: WorkDayKey) => {
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
    handleSave({ days, pauses: nextPauses }, 'Pausa agregada correctamente.');
  };

  const handleRemovePause = (pauseId: string) => {
    const nextPauses = pauses.filter((pause) => pause.id !== pauseId);
    setPauses(nextPauses);
    handleSave({ days, pauses: nextPauses }, 'Pausa eliminada.');
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

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#FFFFFF_0%,#EEF2F6_45%,#D3D7DC_100%)] text-[#0E2A47]">
      <Navbar />
      <main className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-10 pb-24 pt-10">
        <section className="flex flex-row items-start gap-6">
          <ProfesionalSidebar profile={profile} active="Horarios de trabajo" />

          <div className="min-w-0 flex-1 space-y-6">
            <div className="rounded-[28px] border border-white/70 bg-white/95 p-6 shadow-[0_28px_70px_rgba(15,23,42,0.18)]">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-[0.65rem] uppercase tracking-[0.35em] text-[#94A3B8]">
                    Horarios
                  </p>
                  <h1 className="mt-2 text-2xl font-semibold text-[#0E2A47]">
                    Constructor de horarios de trabajo
                  </h1>
                  <p className="mt-1 text-sm text-[#64748B]">
                    Configurá tus días, repetí horarios y pausá disponibilidad.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleSave(undefined, 'Horarios guardados correctamente.')}
                  className="rounded-full bg-[#0B1D2A] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  disabled={isSaving}
                >
                  {isSaving ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
              {saveMessage ? (
                <p className={`mt-3 text-sm font-medium ${saveError ? 'text-red-500' : 'text-[#1FB6A6]'}`}>
                  {saveMessage}
                </p>
              ) : null}
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
                    <div className="grid gap-6 lg:grid-cols-[1.15fr,0.85fr]">
                      <div>
                        <p className="text-[0.65rem] uppercase tracking-[0.35em] text-[#94A3B8]">
                          Constructor
                        </p>
                        <h2 className="mt-2 text-lg font-semibold text-[#0E2A47]">
                          Crear horario
                        </h2>
                        <p className="mt-1 text-sm text-[#64748B]">
                          Definí la franja y asignala a un día.
                        </p>
                        <div className="mt-4 grid gap-4 sm:grid-cols-3">
                          <div className="sm:col-span-1">
                            <label className="text-sm font-medium text-[#0E2A47]">
                              Día
                            </label>
                            <select
                              className={inputClassName}
                              value={constructorDay}
                              onChange={(event) => {
                                setConstructorDay(event.target.value as WorkDayKey);
                                setConstructorError(null);
                              }}
                              disabled={Boolean(editingRange)}
                            >
                              {dayOptions.map((day) => (
                                <option key={day} value={day}>
                                  {dayLabels[day]}
                                </option>
                              ))}
                            </select>
                          </div>
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
                                onClick={() => resetRangeDraft()}
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
                                className="rounded-full bg-[#1FB6A6] px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-md"
                              >
                                Crear horario
                              </button>
                              <button
                                type="button"
                                onClick={() => resetRangeDraft()}
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

                      <div className="lg:border-l lg:border-[#E2E8F0] lg:pl-6">
                        <p className="text-[0.65rem] uppercase tracking-[0.35em] text-[#94A3B8]">
                          Repetir horario
                        </p>
                        <h2 className="mt-2 text-lg font-semibold text-[#0E2A47]">
                          Copiar horario a otros días
                        </h2>
                        <div className="mt-4 grid gap-4">
                          <div>
                            <label className="text-sm font-medium text-[#0E2A47]">
                              Día base
                            </label>
                            <select
                              className={inputClassName}
                              value={repeatSource}
                              onChange={(event) =>
                                setRepeatSource(event.target.value as WorkDayKey)
                              }
                            >
                              {dayOptions.map((day) => (
                                <option key={day} value={day}>
                                  {dayLabels[day]}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-[#0E2A47]">
                              Días a copiar
                            </p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {dayOptions.map((day) => (
                                <button
                                  key={day}
                                  type="button"
                                  onClick={() => toggleRepeatTarget(day)}
                                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                                    repeatTargets.includes(day)
                                      ? 'border-[#1FB6A6] bg-[#1FB6A6]/10 text-[#0E2A47]'
                                      : 'border-[#E2E7EC] bg-white text-[#64748B]'
                                  }`}
                                >
                                  {dayLabels[day]}
                                </button>
                              ))}
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => setRepeatTargets(dayOptions)}
                                className="rounded-full border border-[#E2E7EC] bg-white px-3 py-1 text-xs font-semibold text-[#0E2A47] transition hover:-translate-y-0.5 hover:shadow-sm"
                              >
                                Seleccionar todos
                              </button>
                              <button
                                type="button"
                                onClick={() => setRepeatTargets([])}
                                className="rounded-full border border-[#E2E7EC] bg-white px-3 py-1 text-xs font-semibold text-[#0E2A47] transition hover:-translate-y-0.5 hover:shadow-sm"
                              >
                                Limpiar selección
                              </button>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={handleApplyRepeat}
                            className="w-full rounded-full bg-[#1FB6A6] px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-md"
                          >
                            Aplicar a seleccionados
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {days.map((day) => (
                      <div
                        key={day.day}
                        className="rounded-[22px] border border-white/70 bg-white/95 p-5 shadow-[0_16px_36px_rgba(15,23,42,0.12)]"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-4">
                          <div>
                            <p className="text-[0.65rem] uppercase tracking-[0.35em] text-[#94A3B8]">
                              Día
                            </p>
                            <h3 className="mt-2 text-lg font-semibold text-[#0E2A47]">
                              {dayLabels[day.day]}
                            </h3>
                          </div>
                          <div className="flex flex-wrap items-center gap-3">
                            <label className="flex items-center gap-2 text-xs font-semibold text-[#0E2A47]">
                              <input
                                type="checkbox"
                                checked={day.enabled}
                                onChange={(event) =>
                                  handleToggleAvailable(day.day, event.target.checked)
                                }
                                className="h-4 w-4 accent-[#1FB6A6]"
                              />
                              Disponible
                            </label>
                            <label className="flex items-center gap-2 text-xs font-semibold text-[#0E2A47]">
                              <input
                                type="checkbox"
                                checked={day.paused}
                                onChange={(event) =>
                                  handleTogglePaused(day.day, event.target.checked)
                                }
                                className="h-4 w-4 accent-[#F59E0B]"
                              />
                              Pausado
                            </label>
                          </div>
                        </div>
                        <div className="mt-4 grid gap-4 sm:grid-cols-2">
                          <div className="sm:col-span-2">
                            <label className="text-sm font-medium text-[#0E2A47]">
                              Franjas horarias
                            </label>
                            <p className="mt-1 text-xs text-[#64748B]">
                              Podés definir varias franjas (ej: 09:00-12:00 y
                              14:00-19:00).
                            </p>
                            <div className="mt-3 space-y-3">
                              {day.ranges.length === 0 ? (
                                <div className="rounded-[16px] border border-dashed border-[#CBD5F5] bg-white/70 px-4 py-3 text-sm text-[#64748B]">
                                  Sin horarios definidos para este día.
                                </div>
                              ) : (
                                day.ranges.map((range) => {
                                  return (
                                    <div
                                      key={range.id}
                                      id={`range-${day.day}-${range.id}`}
                                      className="flex flex-wrap items-center justify-between gap-3 rounded-[16px] border border-[#E2E7EC] bg-[#F7F9FB] px-4 py-3 text-sm"
                                    >
                                      <div>
                                        <p className="font-semibold text-[#0E2A47]">
                                          {range.start} - {range.end}
                                        </p>
                                        <p className="text-xs text-[#64748B]">
                                          Horario creado
                                        </p>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <button
                                          type="button"
                                          onClick={() => startEditingRange(day.day, range)}
                                          className="rounded-full border border-[#E2E7EC] bg-white px-3 py-1 text-xs font-semibold text-[#0E2A47]"
                                          disabled={!day.enabled || day.paused}
                                        >
                                          Editar
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleRemoveRange(day.day, range.id)}
                                          className="rounded-full border border-[#F1B4B4] px-3 py-1 text-xs font-semibold text-[#C24141]"
                                          disabled={!day.enabled || day.paused}
                                        >
                                          Eliminar
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleCreateFromDay(day.day)}
                              disabled={!day.enabled || day.paused}
                              className={`mt-3 rounded-full border px-3 py-1 text-xs font-semibold transition ${
                                !day.enabled || day.paused
                                  ? 'cursor-not-allowed border-[#E2E7EC] bg-[#F4F6F8] text-[#94A3B8]'
                                  : 'border-[#E2E7EC] bg-white text-[#0E2A47] hover:-translate-y-0.5 hover:shadow-sm'
                              }`}
                            >
                              + Agregar franja horaria
                            </button>
                          </div>
                        </div>
                        {day.paused ? (
                          <p className="mt-3 text-xs font-semibold text-[#F59E0B]">
                            Día pausado: no se tomarán reservas.
                          </p>
                        ) : null}
                      </div>
                    ))}
                  </div>

                  <div className="rounded-[24px] border border-white/70 bg-white/95 p-5 shadow-[0_16px_36px_rgba(15,23,42,0.12)]">
                    <p className="text-[0.65rem] uppercase tracking-[0.35em] text-[#94A3B8]">
                      Pausas por fecha
                    </p>
                    <h2 className="mt-2 text-lg font-semibold text-[#0E2A47]">
                      Pausar disponibilidad por viaje
                    </h2>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="text-sm font-medium text-[#0E2A47]">
                          Desde
                        </label>
                        <input
                          type="date"
                          className={inputClassName}
                          value={pauseDraft.startDate}
                          onChange={(event) =>
                            handlePauseDraftChange('startDate', event.target.value)
                          }
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-[#0E2A47]">
                          Hasta
                        </label>
                        <input
                          type="date"
                          className={inputClassName}
                          value={pauseDraft.endDate}
                          onChange={(event) =>
                            handlePauseDraftChange('endDate', event.target.value)
                          }
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="text-sm font-medium text-[#0E2A47]">
                          Nota (opcional)
                        </label>
                        <input
                          className={inputClassName}
                          value={pauseDraft.note ?? ''}
                          onChange={(event) =>
                            handlePauseDraftChange('note', event.target.value)
                          }
                          placeholder="Ej: Viaje a congreso"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddPause}
                      className="mt-4 w-full rounded-full bg-[#0B1D2A] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                    >
                      Agregar pausa
                    </button>
                    <div className="mt-4 space-y-3">
                      {pauses.length === 0 ? (
                        <div className="rounded-[18px] border border-dashed border-[#CBD5F5] bg-white/70 px-4 py-4 text-sm text-[#64748B]">
                          No hay pausas cargadas todavía.
                        </div>
                      ) : (
                        pauses.map((pause) => (
                          <div
                            key={pause.id}
                            className="flex flex-wrap items-center justify-between gap-4 rounded-[18px] border border-[#E2E7EC] bg-[#F7F9FB] px-4 py-3 text-sm text-[#0E2A47]"
                          >
                            <div>
                              <p className="font-semibold">
                                {pause.startDate} → {pause.endDate}
                              </p>
                              {pause.note ? (
                                <p className="text-xs text-[#64748B]">{pause.note}</p>
                              ) : null}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemovePause(pause.id)}
                              className="rounded-full border border-[#F1B4B4] px-3 py-1 text-xs font-semibold text-[#C24141]"
                            >
                              Quitar
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="rounded-[24px] border border-white/70 bg-white/95 p-5 shadow-[0_16px_36px_rgba(15,23,42,0.12)]">
                    <p className="text-[0.65rem] uppercase tracking-[0.35em] text-[#94A3B8]">
                      Resumen
                    </p>
                    <h2 className="mt-2 text-lg font-semibold text-[#0E2A47]">
                      Estado semanal
                    </h2>
                    <div className="mt-4 grid gap-3">
                      <div className="flex items-center justify-between rounded-[16px] border border-[#E2E7EC] bg-[#F7F9FB] px-4 py-3 text-sm font-semibold text-[#0E2A47]">
                        <span>Días activos</span>
                        <span>{summary.activeCount}</span>
                      </div>
                      <div className="flex items-center justify-between rounded-[16px] border border-[#E2E7EC] bg-[#F7F9FB] px-4 py-3 text-sm font-semibold text-[#0E2A47]">
                        <span>Días pausados</span>
                        <span>{summary.pausedCount}</span>
                      </div>
                      <div className="flex items-center justify-between rounded-[16px] border border-[#E2E7EC] bg-[#F7F9FB] px-4 py-3 text-sm font-semibold text-[#0E2A47]">
                        <span>Días cerrados</span>
                        <span>{summary.closedCount}</span>
                      </div>
                    </div>
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
        </section>
      </main>
      <Footer />
    </div>
  );
}
