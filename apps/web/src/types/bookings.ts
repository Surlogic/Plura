export type BookingOperationalStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'COMPLETED'
  | 'NO_SHOW';

export type BookingPaymentType = 'ON_SITE' | 'DEPOSIT' | 'FULL_PREPAY';

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

export type BookingSuggestedAction = 'NONE' | 'RESCHEDULE';

export type BookingActions = {
  bookingId: number;
  actorType?: string | null;
  operationalStatus?: BookingOperationalStatus | null;
  policySource?: string | null;
  canCancel: boolean;
  canReschedule: boolean;
  canMarkNoShow: boolean;
  refundPreviewAmount?: number | null;
  retainPreviewAmount?: number | null;
  currency?: string | null;
  suggestedAction?: BookingSuggestedAction | null;
  reasonCodes?: string[] | null;
  messageCode?: string | null;
  messageParams?: Record<string, string> | null;
  plainTextFallback?: string | null;
};

export type BookingDecision = {
  id?: string | null;
  actionType?: string | null;
  actorType?: string | null;
  statusBefore?: string | null;
  statusAfter?: string | null;
  refundPreviewAmount?: number | null;
  retainPreviewAmount?: number | null;
  currency?: string | null;
  financialOutcomeCode?: string | null;
  reasonCodes?: string[] | null;
  messageCode?: string | null;
  messageParams?: Record<string, string> | null;
  plainTextFallback?: string | null;
  createdAt?: string | null;
};

export type BookingRefundRecord = {
  id?: string | null;
  actorType?: string | null;
  actorUserId?: number | null;
  requestedAmount?: number | null;
  targetAmount?: number | null;
  status?: string | null;
  reasonCode?: string | null;
  currency?: string | null;
  providerReference?: string | null;
  relatedDecisionId?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type BookingPayoutRecord = {
  id?: string | null;
  professionalId?: number | null;
  targetAmount?: number | null;
  releasedAmount?: number | null;
  currency?: string | null;
  status?: string | null;
  reasonCode?: string | null;
  provider?: string | null;
  providerReference?: string | null;
  relatedDecisionId?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  executedAt?: string | null;
  failedAt?: string | null;
};

export type BookingPaymentSession = {
  bookingId: number;
  transactionId?: string | null;
  provider?: string | null;
  checkoutUrl?: string | null;
  amount?: number | null;
  currency?: string | null;
  financialStatus?: BookingFinancialStatus | null;
};

export type BookingCommandResponse<TBooking> = {
  booking?: TBooking | null;
  decision?: BookingDecision | null;
  operationalStatus?: BookingOperationalStatus | null;
  financialSummary?: BookingFinancialSummary | null;
  refundRecord?: BookingRefundRecord | null;
  payoutRecord?: BookingPayoutRecord | null;
  messageCode?: string | null;
  messageParams?: Record<string, string> | null;
  plainTextFallback?: string | null;
};

