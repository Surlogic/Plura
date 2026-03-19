import type {
  ClientNotificationEventType,
  ClientNotificationItem,
  ClientNotificationSeverity,
  ClientNotificationStatus,
} from '@/types/clientNotification';

export type ClientNotificationActionLink = {
  href: string;
  external: boolean;
};

type NotificationTypeOptionValue = 'ALL' | ClientNotificationEventType;

export type ClientNotificationTypeOption = {
  value: NotificationTypeOptionValue;
  label: string;
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

export const clientNotificationSeverityDotClassName: Record<
  ClientNotificationSeverity,
  string
> = {
  INFO: 'bg-sky-500',
  SUCCESS: 'bg-emerald-500',
  WARNING: 'bg-amber-500',
  ERROR: 'bg-rose-500',
};

export const clientNotificationSeverityBadgeClassName: Record<
  ClientNotificationSeverity,
  string
> = {
  INFO: 'border-sky-200 bg-sky-50 text-sky-700',
  SUCCESS: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  WARNING: 'border-amber-200 bg-amber-50 text-amber-700',
  ERROR: 'border-rose-200 bg-rose-50 text-rose-700',
};

export const CLIENT_NOTIFICATION_STATUS_OPTIONS: Array<{
  value: ClientNotificationStatus;
  label: string;
}> = [
  { value: 'ALL', label: 'Todas' },
  { value: 'UNREAD', label: 'No leidas' },
  { value: 'READ', label: 'Leidas' },
];

export const CLIENT_NOTIFICATION_TYPE_OPTIONS: ClientNotificationTypeOption[] = [
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

const titleCase = (value: string) =>
  value
    .toLowerCase()
    .split(/[\s_]+/)
    .filter(Boolean)
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join(' ');

export const getClientNotificationTypeLabel = (
  type: ClientNotificationEventType,
) => EVENT_TYPE_LABELS[type] || titleCase(type);

export const getClientNotificationCategoryLabel = (category: string | null) => {
  if (!category) return null;
  return CATEGORY_LABELS[category] || titleCase(category);
};

export const formatClientNotificationTimestamp = (rawValue: string) => {
  const parsed = new Date(rawValue);
  if (Number.isNaN(parsed.getTime())) return '';

  const now = new Date();
  const diffMinutes = Math.floor((now.getTime() - parsed.getTime()) / 60000);

  if (diffMinutes < 1) return 'Ahora';
  if (diffMinutes < 60) return `Hace ${diffMinutes} min`;

  if (parsed.toDateString() === now.toDateString()) {
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

export const getClientNotificationActionLink = (
  actionUrl: string | null,
): ClientNotificationActionLink | null => {
  const trimmed = actionUrl?.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('/')) {
    return { href: trimmed, external: false };
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    if (typeof window !== 'undefined' && parsed.origin === window.location.origin) {
      return {
        href: `${parsed.pathname}${parsed.search}${parsed.hash}`,
        external: false,
      };
    }
    return { href: trimmed, external: true };
  } catch {
    return null;
  }
};

export const getClientNotificationActionLabel = (item: ClientNotificationItem) => {
  if (item.bookingId) return 'Ver reserva';
  return 'Abrir';
};

export const getClientNotificationDropdownEmptyCopy = () => ({
  title: 'Todavia no hay novedades',
  description: 'Cuando tus reservas o pagos cambien, vas a ver un resumen rapido aca.',
});

export const getClientNotificationDropdownErrorCopy = () => ({
  title: 'No pudimos cargar tus notificaciones',
  description: 'Podés abrir el inbox cliente para revisar la actividad cuando lo necesites.',
});

export const getClientNotificationsEmptyStateCopy = ({
  status,
  type,
}: {
  status: ClientNotificationStatus;
  type: NotificationTypeOptionValue;
}) => {
  if (status === 'UNREAD') {
    return {
      title: 'No hay notificaciones sin leer',
      description: 'Cuando entren novedades pendientes, las vas a ver primero acá.',
    };
  }

  if (status === 'READ') {
    return {
      title: 'No hay notificaciones leidas',
      description: 'A medida que revises tu actividad, el historial va a quedar disponible acá.',
    };
  }

  if (type !== 'ALL') {
    return {
      title: 'No hay resultados para este evento',
      description: 'Probá cambiar el filtro para ver el resto de la actividad reciente.',
    };
  }

  return {
    title: 'Todavia no hay notificaciones',
    description: 'Cuando tus reservas o pagos cambien, este inbox se va a poblar acá.',
  };
};
