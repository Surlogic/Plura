import type {
  BookingActionsBase,
  BookingCommandResponseBase,
  BookingFinancialStatus,
  BookingFinancialSummary,
  BookingOperationalStatus,
  BookingPaymentSession,
  BookingPaymentType,
  ProfessionalBookingPolicyBase,
  ProfessionalBookingPolicyUpdateInputBase,
} from '../../../../packages/shared/src/types/bookings';

export type {
  BookingFinancialStatus,
  BookingFinancialSummary,
  BookingOperationalStatus,
  BookingPaymentSession,
  BookingPaymentType,
};

export type BookingRefundStatus =
  | 'NONE'
  | 'PENDING_MANUAL'
  | 'PENDING_PROVIDER'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export type BookingPayoutStatus =
  | 'NONE'
  | 'PENDING_MANUAL'
  | 'PENDING_PROVIDER'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export type LateCancellationRefundMode = 'FULL' | 'NONE' | 'PERCENTAGE';

export type BookingPolicySnapshot = {
  sourcePolicyId?: string | null;
  sourcePolicyVersion?: number | null;
  professionalId?: number | null;
  resolvedAt?: string | null;
  policySource?: string | null;
  allowClientCancellation: boolean;
  allowClientReschedule: boolean;
  cancellationWindowHours?: number | null;
  rescheduleWindowHours?: number | null;
  maxClientReschedules?: number | null;
  lateCancellationRefundMode?: LateCancellationRefundMode | null;
  lateCancellationRefundValue?: number | null;
};

export type BookingSuggestedAction = 'NONE' | 'RESCHEDULE';

export type BookingActions = BookingActionsBase & {
  actorType?: string | null;
  operationalStatus?: BookingOperationalStatus | null;
  policySource?: string | null;
  policySnapshot?: BookingPolicySnapshot | null;
  suggestedAction?: BookingSuggestedAction | null;
  reasonCodes?: string[] | null;
  messageCode?: string | null;
  messageParams?: Record<string, string> | null;
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

export type ProfessionalBookingPolicy = ProfessionalBookingPolicyBase & {
  lateCancellationRefundMode?: LateCancellationRefundMode | null;
  lateCancellationRefundValue?: number | null;
};

export type ProfessionalBookingPolicyUpdateInput = ProfessionalBookingPolicyUpdateInputBase & {
  lateCancellationRefundMode?: LateCancellationRefundMode | null;
  lateCancellationRefundValue?: number | null;
};

export type BookingCommandResponse<TBooking> = BookingCommandResponseBase<TBooking> & {
  decision?: BookingDecision | null;
  refundRecord?: BookingRefundRecord | null;
  payoutRecord?: BookingPayoutRecord | null;
  messageCode?: string | null;
  messageParams?: Record<string, string> | null;
};
