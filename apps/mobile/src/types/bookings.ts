import type {
  BookingActionsBase,
  BookingCommandResponseBase,
  ProfessionalBookingPolicyBase,
  ProfessionalBookingPolicyUpdateInputBase,
} from '../../../../packages/shared/src/types/bookings';

export type {
  BookingFinancialStatus,
  BookingFinancialSummary,
  BookingOperationalStatus,
  BookingPaymentBreakdown,
  BookingProcessingFeeMode,
  BookingPaymentSession,
  BookingPaymentType,
} from '../../../../packages/shared/src/types/bookings';

export type BookingActions = BookingActionsBase;

export type BookingCommandResponse<TBooking> = BookingCommandResponseBase<TBooking>;

export type ProfessionalBookingPolicy = ProfessionalBookingPolicyBase & {
  retainDepositOnLateCancellation: boolean;
};

export type ProfessionalBookingPolicyUpdateInput = ProfessionalBookingPolicyUpdateInputBase & {
  retainDepositOnLateCancellation?: boolean;
};
