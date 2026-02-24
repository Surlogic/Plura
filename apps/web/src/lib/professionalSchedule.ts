import type {
  ProfessionalSchedule,
  SchedulePauseRange,
  WorkDayKey,
  WorkDaySchedule,
  WorkShift,
} from '@/types/professional';

const buildStorageKey = (professionalId: string) =>
  `plura:schedule:${professionalId}`;

const dayOrder: WorkDayKey[] = [
  'mon',
  'tue',
  'wed',
  'thu',
  'fri',
  'sat',
  'sun',
];

const createDefaultRange = (
  day: WorkDayKey,
  start: string,
  end: string,
  index: number,
): WorkShift => ({
  id: `range-${day}-${index}`,
  start,
  end,
});

const createDefaultDays = (): WorkDaySchedule[] => [
  {
    day: 'mon',
    enabled: true,
    paused: false,
    ranges: [createDefaultRange('mon', '09:00', '18:00', 1)],
  },
  {
    day: 'tue',
    enabled: true,
    paused: false,
    ranges: [createDefaultRange('tue', '09:00', '18:00', 1)],
  },
  {
    day: 'wed',
    enabled: true,
    paused: false,
    ranges: [createDefaultRange('wed', '09:00', '18:00', 1)],
  },
  {
    day: 'thu',
    enabled: true,
    paused: false,
    ranges: [createDefaultRange('thu', '09:00', '18:00', 1)],
  },
  {
    day: 'fri',
    enabled: true,
    paused: false,
    ranges: [createDefaultRange('fri', '09:00', '18:00', 1)],
  },
  {
    day: 'sat',
    enabled: true,
    paused: false,
    ranges: [createDefaultRange('sat', '09:00', '13:00', 1)],
  },
  {
    day: 'sun',
    enabled: false,
    paused: false,
    ranges: [createDefaultRange('sun', '09:00', '13:00', 1)],
  },
];

const normalizeRanges = (
  value: unknown,
  fallbackRanges: WorkShift[],
  legacyStart?: string,
  legacyEnd?: string,
): WorkShift[] => {
  if (Array.isArray(value)) {
    return value.map((range, index) => {
      const safeRange = range as Partial<WorkShift>;
      const fallback = fallbackRanges[index] ?? fallbackRanges[0];
      return {
        id: safeRange.id || fallback?.id || `range-${index + 1}`,
        start: safeRange.start || fallback?.start || '09:00',
        end: safeRange.end || fallback?.end || '18:00',
      };
    });
  }

  if (legacyStart || legacyEnd) {
    return [
      {
        id: fallbackRanges[0]?.id || 'range-1',
        start: legacyStart || fallbackRanges[0]?.start || '09:00',
        end: legacyEnd || fallbackRanges[0]?.end || '18:00',
      },
    ];
  }

  return fallbackRanges;
};

const normalizeDays = (value: unknown): WorkDaySchedule[] => {
  const fallback = createDefaultDays();
  const fallbackMap = new Map<WorkDayKey, WorkDaySchedule>(
    fallback.map((day) => [day.day, day]),
  );
  if (!Array.isArray(value)) return fallback;

  const map = new Map<WorkDayKey, WorkDaySchedule>();
  value.forEach((item, index) => {
    const safeItem = item as Partial<WorkDaySchedule> & { day?: WorkDayKey };
    if (!safeItem.day || !dayOrder.includes(safeItem.day)) return;
    const fallbackDay = fallbackMap.get(safeItem.day) ?? fallback[index];
    map.set(safeItem.day, {
      day: safeItem.day,
      enabled: Boolean(safeItem.paused) ? false : Boolean(safeItem.enabled),
      paused: Boolean(safeItem.paused),
      ranges: normalizeRanges(
        (safeItem as { ranges?: unknown }).ranges,
        fallbackDay?.ranges ?? [],
        (safeItem as { start?: string }).start,
        (safeItem as { end?: string }).end,
      ),
    });
  });

  return dayOrder.map((dayKey, index) => {
    const fallbackDay = fallbackMap.get(dayKey) ?? fallback[index];
    const stored = map.get(dayKey);
    return (
      stored ?? {
        day: dayKey,
        enabled: fallbackDay?.enabled ?? true,
        paused: false,
        ranges: fallbackDay?.ranges ?? [],
      }
    );
  });
};

const normalizePauses = (value: unknown): SchedulePauseRange[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item, index) => {
      const safeItem = item as Partial<SchedulePauseRange>;
      return {
        id: safeItem.id || `pause-${Date.now()}-${index}`,
        startDate: safeItem.startDate || '',
        endDate: safeItem.endDate || safeItem.startDate || '',
        note: safeItem.note || '',
      };
    })
    .filter((item) => item.startDate);
};

export const loadProfessionalSchedule = (
  professionalId?: string | null,
  options?: { allowFallback?: boolean },
): ProfessionalSchedule => {
  const fallback = { days: createDefaultDays(), pauses: [] };
  const allowFallback = options?.allowFallback ?? true;
  const emptySchedule = { days: [] as WorkDaySchedule[], pauses: [] };
  if (!professionalId) return fallback;
  if (typeof window === 'undefined') return fallback;
  const raw = window.localStorage.getItem(buildStorageKey(professionalId));
  if (!raw) return allowFallback ? fallback : emptySchedule;

  try {
    const parsed = JSON.parse(raw) as Partial<ProfessionalSchedule>;
    return {
      days: normalizeDays(parsed.days),
      pauses: normalizePauses(parsed.pauses),
    };
  } catch {
    return allowFallback ? fallback : emptySchedule;
  }
};

export const saveProfessionalSchedule = (
  professionalId: string,
  schedule: ProfessionalSchedule,
) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(
    buildStorageKey(professionalId),
    JSON.stringify(schedule),
  );
};
