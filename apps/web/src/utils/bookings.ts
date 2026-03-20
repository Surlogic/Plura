import type {
  BookingFinancialStatus,
  BookingFinancialSummary,
  BookingOperationalStatus,
  BookingPaymentType,
  BookingPolicySnapshot,
  BookingPayoutStatus,
  BookingRefundStatus,
  LateCancellationRefundMode,
} from '@/types/bookings';

const DEFAULT_CURRENCY = 'UYU';

export const formatBookingMoney = (
  amount?: number | null,
  currency?: string | null,
) => {
  if (typeof amount !== 'number' || Number.isNaN(amount)) {
    return null;
  }

  try {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: currency || DEFAULT_CURRENCY,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency || DEFAULT_CURRENCY} ${amount.toFixed(2)}`;
  }
};

export const getPaymentTypeLabel = (paymentType?: BookingPaymentType | null) => {
  switch (paymentType) {
    case 'DEPOSIT':
      return 'Seña online';
    case 'FULL_PREPAY':
      return 'Pago total online';
    case 'ON_SITE':
    default:
      return 'Pago en el lugar';
  }
};

export const getPaymentTypeDescription = (paymentType?: BookingPaymentType | null) => {
  switch (paymentType) {
    case 'DEPOSIT':
      return 'Reservás pagando una seña y el resto se resuelve según el backend.';
    case 'FULL_PREPAY':
      return 'Reservás pagando el total por adelantado.';
    case 'ON_SITE':
    default:
      return 'No requiere checkout online para confirmar la reserva.';
  }
};

export const getOperationalStatusLabel = (
  status?: BookingOperationalStatus | null,
) => {
  switch (status) {
    case 'CONFIRMED':
      return 'Confirmada';
    case 'CANCELLED':
      return 'Cancelada';
    case 'COMPLETED':
      return 'Completada';
    case 'NO_SHOW':
      return 'No asistió';
    case 'PENDING':
    default:
      return 'Pendiente';
  }
};

export const getOperationalStatusTone = (
  status?: BookingOperationalStatus | null,
) => {
  switch (status) {
    case 'CONFIRMED':
      return 'bg-[#1FB6A6]/10 text-[#1FB6A6]';
    case 'CANCELLED':
      return 'bg-[#EF4444]/10 text-[#EF4444]';
    case 'COMPLETED':
      return 'bg-[#0B1D2A]/10 text-[#0B1D2A]';
    case 'NO_SHOW':
      return 'bg-[#7C3AED]/10 text-[#7C3AED]';
    case 'PENDING':
    default:
      return 'bg-[#F59E0B]/10 text-[#F59E0B]';
  }
};

export const isPrepaidBooking = (paymentType?: BookingPaymentType | null) =>
  paymentType === 'DEPOSIT' || paymentType === 'FULL_PREPAY';

const resolveBookingDate = (
  startDateTime?: string | null,
  startDateTimeUtc?: string | null,
) => {
  const candidate = startDateTimeUtc || startDateTime;
  if (!candidate) return null;
  const parsed = new Date(candidate);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const formatBookingDateLabel = (
  startDateTime?: string | null,
  timezone?: string | null,
  startDateTimeUtc?: string | null,
) => {
  const parsed = resolveBookingDate(startDateTime, startDateTimeUtc);
  if (!parsed) {
    return (startDateTime || '').split('T')[0] ?? '';
  }
  return parsed.toLocaleDateString('es-AR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    timeZone: timezone || undefined,
  });
};

export const formatBookingTimeLabel = (
  startDateTime?: string | null,
  timezone?: string | null,
  startDateTimeUtc?: string | null,
) => {
  const parsed = resolveBookingDate(startDateTime, startDateTimeUtc);
  if (!parsed) {
    return (startDateTime || '').split('T')[1]?.slice(0, 5) ?? '';
  }
  return parsed.toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: timezone || undefined,
  });
};

export const getRefundStatusCopy = (status?: BookingRefundStatus | string | null) => {
  switch (status) {
    case 'PENDING_MANUAL':
      return 'Devolución pendiente de revisión';
    case 'PENDING_PROVIDER':
      return 'Devolución enviada al proveedor';
    case 'COMPLETED':
      return 'Devolución completada';
    case 'FAILED':
      return 'Devolución fallida';
    case 'CANCELLED':
      return 'Devolución cancelada';
    case 'NONE':
    default:
      return 'Sin devolución';
  }
};

export const getPayoutStatusCopy = (status?: BookingPayoutStatus | string | null) => {
  switch (status) {
    case 'PENDING_MANUAL':
      return 'Liquidación pendiente';
    case 'PENDING_PROVIDER':
      return 'Liquidación en proceso';
    case 'COMPLETED':
      return 'Liquidación completada';
    case 'FAILED':
      return 'Liquidación pendiente de revisión';
    case 'CANCELLED':
      return 'Liquidación cancelada';
    case 'NONE':
    default:
      return 'Sin liquidación';
  }
};

const formatRefundRule = (
  mode?: LateCancellationRefundMode | null,
  value?: number | null,
) => {
  switch (mode) {
    case 'NONE':
      return 'Dentro de la ventana no hay devolución.';
    case 'PERCENTAGE':
      return `Dentro de la ventana se devuelve ${value ?? 0}% del monto prepagado.`;
    case 'FULL':
    default:
      return 'Dentro de la ventana la devolución sigue siendo total.';
  }
};

export const describeBookingPolicy = (policy?: BookingPolicySnapshot | null) => {
  if (!policy) {
    return 'La política de cancelación se informa desde backend.';
  }
  const windowCopy = typeof policy.cancellationWindowHours === 'number'
    ? `Hasta ${policy.cancellationWindowHours}h antes del turno: devolución total.`
    : 'Sin ventana de penalización configurada: devolución total mientras la reserva siga activa.';
  return `${windowCopy} ${formatRefundRule(policy.lateCancellationRefundMode, policy.lateCancellationRefundValue)}`;
};

export const getClientFinancialStatusCopy = (
  paymentType?: BookingPaymentType | null,
  financialSummary?: BookingFinancialSummary | null,
  operationalStatus?: BookingOperationalStatus | null,
) => {
  const financialStatus = financialSummary?.financialStatus;

  if (!isPrepaidBooking(paymentType)) {
    return {
      label: 'Pago en el lugar',
      tone: 'bg-[#E2E8F0] text-[#475569]',
      detail: operationalStatus === 'CONFIRMED'
        ? 'La reserva está confirmada y el pago se realiza en persona.'
        : 'Esta reserva no requiere checkout online.',
    };
  }

  switch (financialStatus) {
    case 'PAYMENT_PENDING':
      return {
        label: 'Pago pendiente',
        tone: 'bg-[#FEF3C7] text-[#B45309]',
        detail: 'La reserva existe, pero falta completar el checkout.',
      };
    case 'HELD':
      return {
        label: 'Pago confirmado',
        tone: 'bg-[#D1FAE5] text-[#047857]',
        detail: 'El pago fue tomado y los fondos quedaron retenidos.',
      };
    case 'REFUND_PENDING':
      return {
        label: 'Devolución en proceso',
        tone: 'bg-[#DBEAFE] text-[#1D4ED8]',
        detail: 'La devolución fue iniciada y sigue en curso.',
      };
    case 'PARTIALLY_REFUNDED':
      return {
        label: 'Devolución parcial',
        tone: 'bg-[#DBEAFE] text-[#1D4ED8]',
        detail: 'Ya se devolvió parte del monto.',
      };
    case 'REFUNDED':
      return {
        label: 'Devolución completada',
        tone: 'bg-[#DBEAFE] text-[#1D4ED8]',
        detail: 'La devolución al cliente ya fue completada.',
      };
    case 'RELEASE_PENDING':
      return {
        label: 'Servicio realizado',
        tone: 'bg-[#E0F2FE] text-[#0369A1]',
        detail: 'La reserva ya se cerró y el backend está procesando el cierre financiero.',
      };
    case 'PARTIALLY_RELEASED':
    case 'RELEASED':
      return {
        label: 'Reserva finalizada',
        tone: 'bg-[#E0F2FE] text-[#0369A1]',
        detail: 'La reserva terminó y el backend ya cerró el flujo financiero principal.',
      };
    case 'FAILED':
      return {
        label: 'Pago con incidencia',
        tone: 'bg-[#FEE2E2] text-[#B91C1C]',
        detail: 'Hubo un problema y conviene revisar el estado antes de actuar.',
      };
    case 'NOT_REQUIRED':
    default:
      return {
        label: 'Pago pendiente',
        tone: 'bg-[#FEF3C7] text-[#B45309]',
        detail: 'Esperando confirmación del checkout.',
      };
  }
};

export const getProfessionalFinancialStatusCopy = (
  paymentType?: BookingPaymentType | null,
  financialSummary?: BookingFinancialSummary | null,
) => {
  const financialStatus = financialSummary?.financialStatus;

  if (!isPrepaidBooking(paymentType)) {
    return {
      label: 'Sin pago online',
      tone: 'bg-[#E2E8F0] text-[#475569]',
      detail: 'Esta reserva no usa retención online.',
    };
  }

  switch (financialStatus) {
    case 'PAYMENT_PENDING':
      return {
        label: 'Pago pendiente',
        tone: 'bg-[#FEF3C7] text-[#B45309]',
        detail: 'La clienta o el cliente todavía no completó el checkout.',
      };
    case 'HELD':
      return {
        label: 'Retenido',
        tone: 'bg-[#D1FAE5] text-[#047857]',
        detail: 'El cobro está aprobado y los fondos quedaron retenidos.',
      };
    case 'REFUND_PENDING':
      return {
        label: 'Devolución en proceso',
        tone: 'bg-[#DBEAFE] text-[#1D4ED8]',
        detail: 'El backend está procesando una devolución.',
      };
    case 'PARTIALLY_REFUNDED':
    case 'REFUNDED':
      return {
        label: 'Devuelto al cliente',
        tone: 'bg-[#DBEAFE] text-[#1D4ED8]',
        detail: 'El flujo financiero terminó en devolución.',
      };
    case 'RELEASE_PENDING':
      return {
        label: 'Liquidación en curso',
        tone: 'bg-[#E0F2FE] text-[#0369A1]',
        detail: 'La reserva ya inició la liquidación hacia la cuenta del profesional.',
      };
    case 'PARTIALLY_RELEASED':
    case 'RELEASED':
      return {
        label: 'Liquidado',
        tone: 'bg-[#E0F2FE] text-[#0369A1]',
        detail: 'La reserva ya quedó liquidada para el profesional.',
      };
    case 'FAILED':
      return {
        label: 'Fallido',
        tone: 'bg-[#FEE2E2] text-[#B91C1C]',
        detail: 'Hay una incidencia financiera pendiente de revisión.',
      };
    case 'NOT_REQUIRED':
    default:
      return {
        label: 'Pago pendiente',
        tone: 'bg-[#FEF3C7] text-[#B45309]',
        detail: 'Esperando confirmación del cobro.',
      };
  }
};

export const shouldAutoRefreshFinancialStatus = (
  financialStatus?: BookingFinancialStatus | null,
) =>
  financialStatus === 'PAYMENT_PENDING'
  || financialStatus === 'REFUND_PENDING'
  || financialStatus === 'RELEASE_PENDING';
