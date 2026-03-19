import type {
  ProfessionalNotificationEventType,
  ProfessionalNotificationItem,
  ProfessionalNotificationSeverity,
  ProfessionalNotificationStatus,
} from '@/types/notification';

type NotificationTypeOptionValue = 'ALL' | ProfessionalNotificationEventType;

export type ProfessionalNotificationTypeOption = {
  value: NotificationTypeOptionValue;
  label: string;
};

export type NotificationActionLink = {
  href: string;
  external: boolean;
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  BOOKING_CREATED: 'Reserva creada',
  BOOKING_CONFIRMED: 'Reserva confirmada',
  BOOKING_CANCELLED: 'Reserva cancelada',
  BOOKING_RESCHEDULED: 'Reserva reprogramada',
  BOOKING_COMPLETED: 'Reserva completada',
  BOOKING_NO_SHOW: 'No show',
  PAYMENT_APPROVED: 'Pago aprobado',
  PAYMENT_FAILED: 'Pago fallido',
  PAYMENT_REFUNDED: 'Pago reembolsado',
};

const CATEGORY_LABELS: Record<string, string> = {
  BOOKING: 'Reserva',
  PAYMENT: 'Pago',
};

export const PROFESSIONAL_NOTIFICATION_STATUS_OPTIONS: Array<{
  value: ProfessionalNotificationStatus;
  label: string;
}> = [
  { value: 'ALL', label: 'Todas' },
  { value: 'UNREAD', label: 'No leidas' },
  { value: 'READ', label: 'Leidas' },
];

export const PROFESSIONAL_NOTIFICATION_TYPE_OPTIONS: ProfessionalNotificationTypeOption[] = [
  { value: 'ALL', label: 'Todos los eventos' },
  { value: 'BOOKING_CREATED', label: EVENT_TYPE_LABELS.BOOKING_CREATED },
  { value: 'BOOKING_CONFIRMED', label: EVENT_TYPE_LABELS.BOOKING_CONFIRMED },
  { value: 'BOOKING_CANCELLED', label: EVENT_TYPE_LABELS.BOOKING_CANCELLED },
  { value: 'BOOKING_RESCHEDULED', label: EVENT_TYPE_LABELS.BOOKING_RESCHEDULED },
  { value: 'BOOKING_COMPLETED', label: EVENT_TYPE_LABELS.BOOKING_COMPLETED },
  { value: 'BOOKING_NO_SHOW', label: EVENT_TYPE_LABELS.BOOKING_NO_SHOW },
  { value: 'PAYMENT_APPROVED', label: EVENT_TYPE_LABELS.PAYMENT_APPROVED },
  { value: 'PAYMENT_FAILED', label: EVENT_TYPE_LABELS.PAYMENT_FAILED },
  { value: 'PAYMENT_REFUNDED', label: EVENT_TYPE_LABELS.PAYMENT_REFUNDED },
];

export const professionalNotificationSeverityDotClassName: Record<
  ProfessionalNotificationSeverity,
  string
> = {
  INFO: 'bg-sky-500',
  SUCCESS: 'bg-emerald-500',
  WARNING: 'bg-amber-500',
  ERROR: 'bg-rose-500',
};

export const professionalNotificationSeveritySurfaceClassName: Record<
  ProfessionalNotificationSeverity,
  string
> = {
  INFO: 'border-sky-100 bg-sky-50 text-sky-700',
  SUCCESS: 'border-emerald-100 bg-emerald-50 text-emerald-700',
  WARNING: 'border-amber-100 bg-amber-50 text-amber-700',
  ERROR: 'border-rose-100 bg-rose-50 text-rose-700',
};

const titleCase = (value: string) =>
  value
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join(' ');

export const getProfessionalNotificationTypeLabel = (
  type: ProfessionalNotificationEventType,
) => EVENT_TYPE_LABELS[type] || titleCase(type.replaceAll('_', ' '));

export const getProfessionalNotificationCategoryLabel = (category: string | null) => {
  if (!category) return null;
  return CATEGORY_LABELS[category] || titleCase(category.replaceAll('_', ' '));
};

export const formatProfessionalNotificationTimestamp = (rawValue: string) => {
  const parsed = new Date(rawValue);
  if (Number.isNaN(parsed.getTime())) return '';

  const now = new Date();
  const diffMs = now.getTime() - parsed.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) return 'Ahora';
  if (diffMinutes < 60) return `Hace ${diffMinutes} min`;

  const isSameDay = parsed.toDateString() === now.toDateString();
  if (isSameDay) {
    return `Hoy, ${parsed.toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
    })}`;
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (parsed.toDateString() === yesterday.toDateString()) {
    return `Ayer, ${parsed.toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
    })}`;
  }

  return parsed.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatProfessionalNotificationAbsoluteTimestamp = (rawValue: string) => {
  const parsed = new Date(rawValue);
  if (Number.isNaN(parsed.getTime())) return '';

  return parsed.toLocaleString('es-AR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const normalizeProfessionalReservationActionHref = (href: string) => {
  const legacyMatch = href.match(/^\/profesional\/reservas\/([^/?#]+)$/);
  if (legacyMatch) {
    return `/profesional/dashboard/reservas?bookingId=${encodeURIComponent(legacyMatch[1])}`;
  }

  const dashboardLegacyMatch = href.match(/^\/profesional\/dashboard\/reservas\/([^/?#]+)$/);
  if (dashboardLegacyMatch) {
    return `/profesional/dashboard/reservas?bookingId=${encodeURIComponent(dashboardLegacyMatch[1])}`;
  }

  return href;
};

export const getProfessionalNotificationActionLink = (
  actionUrl: string | null,
): NotificationActionLink | null => {
  const trimmed = actionUrl?.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('/')) {
    return {
      href: normalizeProfessionalReservationActionHref(trimmed),
      external: false,
    };
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }

    if (typeof window !== 'undefined' && parsed.origin === window.location.origin) {
      return {
        href: normalizeProfessionalReservationActionHref(
          `${parsed.pathname}${parsed.search}${parsed.hash}`,
        ),
        external: false,
      };
    }

    return {
      href: trimmed,
      external: true,
    };
  } catch {
    return null;
  }
};

export const getProfessionalNotificationActionLabel = (
  notification: ProfessionalNotificationItem,
) => {
  if (notification.bookingId) return 'Ver reserva';
  return 'Abrir contexto';
};

export const getProfessionalNotificationDropdownEmptyCopy = () => ({
  title: 'Todavia no hay novedades',
  description: 'Cuando entren reservas, confirmaciones o pagos relevantes, vas a ver el resumen aca.',
});

export const getProfessionalNotificationDropdownErrorCopy = () => ({
  title: 'No pudimos cargar el preview',
  description: 'Podés abrir el inbox completo para revisar la actividad desde la pantalla dedicada.',
});

export const getProfessionalNotificationsEmptyStateCopy = ({
  status,
  type,
}: {
  status: ProfessionalNotificationStatus;
  type: NotificationTypeOptionValue;
}) => {
  if (status === 'UNREAD') {
    return {
      title: 'No hay notificaciones sin leer',
      description: 'Cuando entren novedades pendientes, las vas a ver primero aca.',
    };
  }

  if (status === 'READ') {
    return {
      title: 'No hay notificaciones leidas',
      description: 'A medida que revises el inbox, el historial va a quedar disponible aca.',
    };
  }

  if (type !== 'ALL') {
    return {
      title: 'No hay resultados para este evento',
      description: 'Probá cambiar el filtro para ver el resto de la actividad operativa.',
    };
  }

  return {
    title: 'Todavia no hay notificaciones',
    description: 'Cuando entren reservas, pagos o cambios relevantes, el inbox se va a poblar aca.',
  };
};
