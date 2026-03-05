import type {
  ProfessionalSchedule,
  SchedulePauseRange,
  WorkDayKey,
  WorkDaySchedule,
  WorkShift,
} from '@/types/professional';

export const dayLabels: Record<WorkDayKey, string> = {
  mon: 'Lunes',
  tue: 'Martes',
  wed: 'Miércoles',
  thu: 'Jueves',
  fri: 'Viernes',
  sat: 'Sábado',
  sun: 'Domingo',
};

export const dayOptions: WorkDayKey[] = [
  'mon',
  'tue',
  'wed',
  'thu',
  'fri',
  'sat',
  'sun',
];

export const weekdayOptions: WorkDayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri'];
export const SLOT_DURATION_OPTIONS = [10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60] as const;
export const DEFAULT_SLOT_DURATION_MINUTES = 15;

export type ConstructorApplyMode = 'append' | 'replace';

export const buildEmptyPause = (): SchedulePauseRange => ({
  id: `pause-${Date.now()}`,
  startDate: '',
  endDate: '',
  note: '',
});

export const createRange = (
  day: WorkDayKey,
  start = '09:00',
  end = '18:00',
  index = 1,
): WorkShift => ({
  id: `range-${day}-${Date.now()}-${index}`,
  start,
  end,
});

export const createDefaultDays = (): WorkDaySchedule[] => [
  {
    day: 'mon',
    enabled: true,
    paused: false,
    ranges: [createRange('mon', '09:00', '18:00')],
  },
  {
    day: 'tue',
    enabled: true,
    paused: false,
    ranges: [createRange('tue', '09:00', '18:00')],
  },
  {
    day: 'wed',
    enabled: true,
    paused: false,
    ranges: [createRange('wed', '09:00', '18:00')],
  },
  {
    day: 'thu',
    enabled: true,
    paused: false,
    ranges: [createRange('thu', '09:00', '18:00')],
  },
  {
    day: 'fri',
    enabled: true,
    paused: false,
    ranges: [createRange('fri', '09:00', '18:00')],
  },
  {
    day: 'sat',
    enabled: true,
    paused: false,
    ranges: [createRange('sat', '09:00', '13:00')],
  },
  {
    day: 'sun',
    enabled: false,
    paused: false,
    ranges: [createRange('sun', '09:00', '13:00')],
  },
];

export const createDefaultSchedule = (): ProfessionalSchedule => ({
  days: createDefaultDays(),
  pauses: [],
  slotDurationMinutes: DEFAULT_SLOT_DURATION_MINUTES,
});

export const normalizeSlotDuration = (value: unknown): number => {
  if (typeof value !== 'number') return DEFAULT_SLOT_DURATION_MINUTES;
  return SLOT_DURATION_OPTIONS.includes(value as (typeof SLOT_DURATION_OPTIONS)[number])
    ? value
    : DEFAULT_SLOT_DURATION_MINUTES;
};

export const normalizeSchedule = (
  value: Partial<ProfessionalSchedule> | null | undefined,
): ProfessionalSchedule => {
  const fallback = createDefaultSchedule();
  if (!value) return fallback;

  const dayMap = new Map<WorkDayKey, WorkDaySchedule>();
  if (Array.isArray(value.days)) {
    value.days.forEach((day) => {
      if (!day || !day.day || !dayOptions.includes(day.day)) return;
      dayMap.set(day.day, day);
    });
  }

  const days = dayOptions.map((dayKey, index) => {
    const fallbackDay = fallback.days[index];
    const stored = dayMap.get(dayKey);
    const ranges = Array.isArray(stored?.ranges)
      ? stored.ranges.map((range, rangeIndex) => ({
          id: range?.id || `range-${dayKey}-${Date.now()}-${rangeIndex}`,
          start: range?.start || fallbackDay.ranges[0].start,
          end: range?.end || fallbackDay.ranges[0].end,
        }))
      : fallbackDay.ranges.map((range, rangeIndex) => ({
          id: range.id || `range-${dayKey}-${Date.now()}-${rangeIndex}`,
          start: range.start,
          end: range.end,
        }));

    return {
      day: dayKey,
      enabled: stored?.paused ? false : Boolean(stored?.enabled ?? fallbackDay.enabled),
      paused: Boolean(stored?.paused),
      ranges,
    };
  });

  const pauses = Array.isArray(value.pauses)
    ? value.pauses
        .map((pause, index) => ({
          id: pause?.id || `pause-${Date.now()}-${index}`,
          startDate: pause?.startDate || '',
          endDate: pause?.endDate || pause?.startDate || '',
          note: pause?.note || '',
        }))
        .filter((pause) => Boolean(pause.startDate))
    : [];

  return {
    days,
    pauses,
    slotDurationMinutes: normalizeSlotDuration(value.slotDurationMinutes),
  };
};

export const createScheduleSignature = (schedule: ProfessionalSchedule) =>
  JSON.stringify({
    slotDurationMinutes: normalizeSlotDuration(schedule.slotDurationMinutes),
    days: dayOptions.map((dayKey) => {
      const day = schedule.days.find((item) => item.day === dayKey);
      return {
        day: dayKey,
        enabled: Boolean(day?.enabled),
        paused: Boolean(day?.paused),
        ranges: (day?.ranges ?? []).map((range) => ({
          start: range.start,
          end: range.end,
        })),
      };
    }),
    pauses: (schedule.pauses ?? []).map((pause) => ({
      startDate: pause.startDate,
      endDate: pause.endDate,
      note: pause.note ?? '',
    })),
  });
