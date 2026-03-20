import type { BookingFinancialStatus, BookingPaymentSession } from '@/types/bookings';

export type BookingPaymentSessionFeedbackTone = 'success' | 'info' | 'error';

export type BookingPaymentSessionFeedback = {
  tone: BookingPaymentSessionFeedbackTone;
  title: string;
  description: string;
};

const resolveFallbackByStatus = (financialStatus?: BookingFinancialStatus | null) => {
  switch (financialStatus) {
    case 'HELD':
    case 'RELEASE_PENDING':
    case 'PARTIALLY_RELEASED':
    case 'RELEASED':
      return 'Tu reserva ya quedó con el pago confirmado.';
    case 'PAYMENT_PENDING':
      return 'Tu pago quedó iniciado y vamos a reflejar el estado actualizado de la reserva.';
    case 'REFUND_PENDING':
    case 'PARTIALLY_REFUNDED':
    case 'REFUNDED':
      return 'La reserva quedó actualizada con el estado financiero más reciente.';
    case 'FAILED':
      return 'La reserva quedó creada, pero el pago necesita una nueva revisión.';
    case 'NOT_REQUIRED':
    default:
      return 'La reserva quedó creada y estamos actualizando su estado.';
  }
};

export const getBookingPaymentSessionFeedback = (
  session?: BookingPaymentSession | null,
): BookingPaymentSessionFeedback => {
  if (session?.checkoutUrl) {
    return {
      tone: 'info',
      title: 'Abrimos Mercado Pago',
      description: 'Te redirigimos a Mercado Pago para completar el pago de tu reserva.',
    };
  }

  if (session?.financialStatus === 'FAILED') {
    return {
      tone: 'error',
      title: 'No pudimos continuar el pago',
      description: resolveFallbackByStatus(session.financialStatus),
    };
  }

  return {
    tone: 'success',
    title: 'Reserva actualizada',
    description: resolveFallbackByStatus(session?.financialStatus),
  };
};

export const getBookingPaymentSessionMessage = (
  session?: BookingPaymentSession | null,
) => getBookingPaymentSessionFeedback(session).description;
