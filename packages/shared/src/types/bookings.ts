export type BookingOperationalStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'COMPLETED'
  | 'NO_SHOW';

export type BookingPaymentType = 'ON_SITE' | 'DEPOSIT' | 'FULL_PREPAY';
export type BookingProcessingFeeMode = 'INSTANT' | 'DELAYED_21_DAYS';

export type BookingFinancialStatus =
  | 'NOT_REQUIRED'
  | 'PAYMENT_PENDING'
  | 'HELD'
  | 'REFUND_PENDING'
  | 'PARTIALLY_REFUNDED'
  | 'REFUNDED'
  | 'RELEASE_PENDING'
  | 'PARTIALLY_RELEASED'
  | 'RELEASED'
  | 'FAILED';

export type BookingFinancialSummary = {
  amountCharged?: number | null;
  amountHeld?: number | null;
  amountToRefund?: number | null;
  amountRefunded?: number | null;
  amountToRelease?: number | null;
  amountReleased?: number | null;
  currency?: string | null;
  financialStatus?: BookingFinancialStatus | null;
  lastDecisionId?: string | null;
  updatedAt?: string | null;
};

export type BookingPaymentBreakdown = {
  prepaidBaseAmount?: number | null;
  processingFeeAmount?: number | null;
  totalAmount?: number | null;
  currency?: string | null;
  processingFeeLabel?: string | null;
  processingFeeMode?: BookingProcessingFeeMode | null;
  providerFeePercent?: number | null;
  taxPercent?: number | null;
  platformFeePercent?: number | null;
};

export type BookingActionsBase = {
  bookingId: number;
  canCancel: boolean;
  canReschedule: boolean;
  canMarkNoShow: boolean;
  canComplete: boolean;
  refundPreviewAmount?: number | null;
  retainPreviewAmount?: number | null;
  currency?: string | null;
  plainTextFallback?: string | null;
};

export type BookingPaymentSession = {
  bookingId: number;
  transactionId?: string | null;
  provider?: string | null;
  checkoutUrl?: string | null;
  amount?: number | null;
  paymentBreakdown?: BookingPaymentBreakdown | null;
  currency?: string | null;
  financialStatus?: BookingFinancialStatus | null;
};

export type BookingCommandResponseBase<TBooking> = {
  booking?: TBooking | null;
  operationalStatus?: BookingOperationalStatus | null;
  financialSummary?: BookingFinancialSummary | null;
  plainTextFallback?: string | null;
};

export type ProfessionalBookingPolicyBase = {
  id?: string | null;
  allowClientCancellation: boolean;
  allowClientReschedule: boolean;
  cancellationWindowHours?: number | null;
  rescheduleWindowHours?: number | null;
  maxClientReschedules?: number | null;
};

export type ProfessionalBookingPolicyUpdateInputBase = {
  allowClientCancellation?: boolean;
  allowClientReschedule?: boolean;
  cancellationWindowHours?: number | null;
  rescheduleWindowHours?: number | null;
  maxClientReschedules?: number | null;
};
