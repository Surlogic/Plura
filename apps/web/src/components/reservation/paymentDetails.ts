import type { PublicProfessionalService } from '@/services/publicBookings';
import { formatBookingMoney, getPaymentTypeDescription, getPaymentTypeLabel } from '@/utils/bookings';
import { formatPrice } from '@/utils/reservarHelpers';

const parseServiceAmount = (value?: string | number | null) => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) return null;

  const sanitized = trimmed.replace(/[^\d,.-]/g, '');
  if (!sanitized) return null;

  const normalized = sanitized.includes(',') && sanitized.includes('.')
    ? sanitized.replace(/\./g, '').replace(',', '.')
    : sanitized.replace(',', '.');

  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const formatServiceAmount = (
  amount: number | null,
  currency?: string | null,
  fallback?: string | null,
) => {
  const formatted = formatBookingMoney(amount, currency);
  if (formatted) return formatted;
  if (fallback) return formatPrice(fallback);
  return 'A confirmar';
};

export type ReservationPaymentDetails = {
  paymentTypeLabel: string;
  paymentTypeDescription: string;
  ctaLabel: string;
  prepaidLabel: string | null;
  prepaidAmount: string | null;
  processingFeeLabel: string | null;
  processingFeeAmount: string | null;
  payNowLabel: string;
  payNowAmount: string;
  remainingLabel: string | null;
  remainingAmount: string | null;
  pendingNotice: string;
};

export const getReservationPaymentDetails = (
  service?: PublicProfessionalService | null,
): ReservationPaymentDetails => {
  const paymentTypeLabel = getPaymentTypeLabel(service?.paymentType);
  const paymentTypeDescription = getPaymentTypeDescription(service?.paymentType);
  const totalAmount = parseServiceAmount(service?.price);
  const depositAmount = typeof service?.depositAmount === 'number' ? service.depositAmount : null;
  const currency = service?.currency || null;
  const paymentBreakdown = service?.paymentBreakdown || null;
  const payNowCurrency = paymentBreakdown?.currency || currency;
  const payNowBaseAmount = typeof paymentBreakdown?.prepaidBaseAmount === 'number'
    ? paymentBreakdown.prepaidBaseAmount
    : service?.paymentType === 'DEPOSIT'
      ? depositAmount
      : totalAmount;
  const payNowTotalAmount = typeof paymentBreakdown?.totalAmount === 'number'
    ? paymentBreakdown.totalAmount
    : payNowBaseAmount;
  const processingFeeAmount = typeof paymentBreakdown?.processingFeeAmount === 'number'
    ? paymentBreakdown.processingFeeAmount
    : null;
  const prepaidLabel = service?.paymentType === 'DEPOSIT' ? 'Seña del servicio' : 'Monto del servicio';
  const processingFeeLabel = paymentBreakdown?.processingFeeLabel?.trim() || 'Cargo de procesamiento';

  if (service?.paymentType === 'DEPOSIT') {
    const remainingAmount = totalAmount !== null && depositAmount !== null
      ? Math.max(totalAmount - depositAmount, 0)
      : null;

    return {
      paymentTypeLabel,
      paymentTypeDescription,
      ctaLabel: 'Pagar seña y reservar',
      prepaidLabel,
      prepaidAmount: formatServiceAmount(payNowBaseAmount, payNowCurrency, null),
      processingFeeLabel: processingFeeAmount && processingFeeAmount > 0 ? processingFeeLabel : null,
      processingFeeAmount: processingFeeAmount && processingFeeAmount > 0
        ? formatServiceAmount(processingFeeAmount, payNowCurrency, null)
        : null,
      payNowLabel: 'Total del checkout',
      payNowAmount: formatServiceAmount(payNowTotalAmount, payNowCurrency, null),
      remainingLabel: 'Resta pagar',
      remainingAmount: formatServiceAmount(remainingAmount, currency, service?.price),
      pendingNotice:
        'La reserva se crea en estado pendiente y la confirmación final depende de la acreditación online del pago.',
    };
  }

  if (service?.paymentType === 'FULL_PREPAY') {
    return {
      paymentTypeLabel,
      paymentTypeDescription,
      ctaLabel: 'Pagar y reservar',
      prepaidLabel,
      prepaidAmount: formatServiceAmount(payNowBaseAmount, payNowCurrency, service?.price),
      processingFeeLabel: processingFeeAmount && processingFeeAmount > 0 ? processingFeeLabel : null,
      processingFeeAmount: processingFeeAmount && processingFeeAmount > 0
        ? formatServiceAmount(processingFeeAmount, payNowCurrency, null)
        : null,
      payNowLabel: 'Total del checkout',
      payNowAmount: formatServiceAmount(payNowTotalAmount, payNowCurrency, service?.price),
      remainingLabel: null,
      remainingAmount: null,
      pendingNotice:
        'La reserva se crea en estado pendiente y la confirmación final depende de que el backend reciba el pago correctamente.',
    };
  }

  return {
    paymentTypeLabel,
    paymentTypeDescription,
    ctaLabel: 'Reservar',
    prepaidLabel: null,
    prepaidAmount: null,
    processingFeeLabel: null,
    processingFeeAmount: null,
    payNowLabel: 'Pagás ahora',
    payNowAmount: 'Pagás en el lugar',
    remainingLabel: null,
    remainingAmount: null,
    pendingNotice:
      'La reserva se crea en estado pendiente. El servicio no abre checkout online y el pago se resuelve en persona.',
  };
};
