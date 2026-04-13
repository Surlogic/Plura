import type {
  BookingPaymentBreakdown,
  BookingCommandResponseBase,
  BookingOperationalStatus,
} from '../types/bookings';

export type ApiReservationStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'COMPLETED'
  | 'NO_SHOW';

export type FrontendReservationStatus =
  | 'confirmed'
  | 'pending'
  | 'completed'
  | 'cancelled'
  | 'no_show';

export type BookingDateTimeFormatterInput = {
  startDateTime: string;
  timezone?: string | null;
  startDateTimeUtc?: string | null;
};

export type BookingDateTimeFormatter = (
  input: BookingDateTimeFormatterInput,
) => {
  date: string;
  time: string;
};

export type ClientBookingDtoBase<
  TPaymentType = string,
  TFinancialSummary = unknown,
  TPaymentBreakdown = BookingPaymentBreakdown,
  TPaymentStatus = unknown,
  TRefundStatus = string,
  TPayoutStatus = string,
  TRefundRecord = unknown,
  TPayoutRecord = unknown,
  TPolicySnapshot = unknown,
> = {
  id: number | string;
  status?: string | null;
  dateTime?: string | null;
  startDateTime?: string | null;
  startDateTimeUtc?: string | null;
  timezone?: string | null;
  serviceId?: string | null;
  serviceName?: string | null;
  paymentType?: TPaymentType | null;
  paymentStatus?: TPaymentStatus | null;
  refundStatus?: TRefundStatus | null;
  payoutStatus?: TPayoutStatus | null;
  paymentBreakdown?: TPaymentBreakdown | null;
  financialSummary?: TFinancialSummary | null;
  latestRefund?: TRefundRecord | null;
  latestPayout?: TPayoutRecord | null;
  policySnapshot?: TPolicySnapshot | null;
  professionalName?: string | null;
  professionalSlug?: string | null;
  professionalLocation?: string | null;
  service?: {
    id?: string | null;
    name?: string | null;
  } | null;
  professional?: {
    name?: string | null;
    fullName?: string | null;
    location?: string | null;
    slug?: string | null;
  } | null;
};

export type ClientBookingsResponseDto<TBooking> =
  | TBooking[]
  | {
      bookings?: TBooking[] | null;
      data?: TBooking[] | null;
      items?: TBooking[] | null;
      content?: TBooking[] | null;
    }
  | null;

export type ClientDashboardBookingBase<
  TPaymentType = string,
  TFinancialSummary = unknown,
  TPaymentBreakdown = BookingPaymentBreakdown,
  TPaymentStatus = unknown,
  TRefundStatus = string,
  TPayoutStatus = string,
  TRefundRecord = unknown,
  TPayoutRecord = unknown,
  TPolicySnapshot = unknown,
> = {
  id: string;
  professional: string;
  service: string;
  dateTime: string;
  date: string;
  time: string;
  location: string;
  status: BookingOperationalStatus;
  professionalSlug?: string | null;
  serviceId?: string | null;
  paymentType?: TPaymentType | null;
  paymentBreakdown?: TPaymentBreakdown | null;
  financialSummary?: TFinancialSummary | null;
  timezone?: string | null;
  startDateTimeUtc?: string | null;
  paymentStatus?: TPaymentStatus | null;
  refundStatus?: TRefundStatus | null;
  payoutStatus?: TPayoutStatus | null;
  latestRefund?: TRefundRecord | null;
  latestPayout?: TPayoutRecord | null;
  policySnapshot?: TPolicySnapshot | null;
};

export type ProfessionalBookingDtoBase<
  TPaymentType = string,
  TFinancialSummary = unknown,
  TPaymentBreakdown = BookingPaymentBreakdown,
  TPaymentStatus = unknown,
  TRefundStatus = string,
  TPayoutStatus = string,
  TRefundRecord = unknown,
  TPayoutRecord = unknown,
  TPolicySnapshot = unknown,
> = {
  id: number;
  userId: string;
  clientName: string;
  serviceId: string;
  serviceName: string;
  startDateTime: string;
  startDateTimeUtc?: string | null;
  timezone?: string | null;
  duration?: string;
  postBufferMinutes?: number;
  effectiveDurationMinutes?: number;
  paymentType?: TPaymentType | null;
  rescheduleCount?: number;
  paymentStatus?: TPaymentStatus | null;
  refundStatus?: TRefundStatus | null;
  payoutStatus?: TPayoutStatus | null;
  paymentBreakdown?: TPaymentBreakdown | null;
  financialSummary?: TFinancialSummary | null;
  latestRefund?: TRefundRecord | null;
  latestPayout?: TPayoutRecord | null;
  policySnapshot?: TPolicySnapshot | null;
  status: ApiReservationStatus;
};

export type ProfessionalReservationBase<
  TPaymentType = string,
  TFinancialSummary = unknown,
  TPaymentBreakdown = BookingPaymentBreakdown,
  TPaymentStatus = unknown,
  TRefundStatus = string,
  TPayoutStatus = string,
  TRefundRecord = unknown,
  TPayoutRecord = unknown,
  TPolicySnapshot = unknown,
> = {
  id: string;
  userId?: string;
  serviceId?: string;
  serviceName: string;
  clientName: string;
  date: string;
  time: string;
  duration?: string;
  postBufferMinutes?: number;
  effectiveDurationMinutes?: number;
  status?: FrontendReservationStatus;
  paymentType?: TPaymentType | null;
  paymentBreakdown?: TPaymentBreakdown | null;
  financialSummary?: TFinancialSummary | null;
  paymentStatus?: TPaymentStatus | null;
  refundStatus?: TRefundStatus | null;
  payoutStatus?: TPayoutStatus | null;
  latestRefund?: TRefundRecord | null;
  latestPayout?: TPayoutRecord | null;
  policySnapshot?: TPolicySnapshot | null;
  timezone?: string | null;
  startDateTimeUtc?: string | null;
};

export const normalizeBookingOperationalStatus = (
  rawStatus: unknown,
): BookingOperationalStatus => {
  if (typeof rawStatus !== 'string') return 'PENDING';
  const status = rawStatus.toUpperCase().trim();
  if (status === 'CONFIRMED') return 'CONFIRMED';
  if (status === 'CANCELLED') return 'CANCELLED';
  if (status === 'COMPLETED') return 'COMPLETED';
  if (status === 'NO_SHOW') return 'NO_SHOW';
  return 'PENDING';
};

export const resolveClientBookingsArray = <TBooking>(
  payload: ClientBookingsResponseDto<TBooking>,
): TBooking[] => {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];
  if (Array.isArray(payload.bookings)) return payload.bookings;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.content)) return payload.content;
  return [];
};

const financialStatusFromSummary = <TPaymentStatus>(
  summary: unknown,
): TPaymentStatus | null => {
  if (!summary || typeof summary !== 'object') return null;
  return ((summary as { financialStatus?: TPaymentStatus | null }).financialStatus ?? null);
};

export const mapClientBookingBase = <
  TPaymentType = string,
  TFinancialSummary = unknown,
  TPaymentBreakdown = BookingPaymentBreakdown,
  TPaymentStatus = unknown,
  TRefundStatus = string,
  TPayoutStatus = string,
  TRefundRecord = unknown,
  TPayoutRecord = unknown,
  TPolicySnapshot = unknown,
>(
  booking: ClientBookingDtoBase<
    TPaymentType,
    TFinancialSummary,
    TPaymentBreakdown,
    TPaymentStatus,
    TRefundStatus,
    TPayoutStatus,
    TRefundRecord,
    TPayoutRecord,
    TPolicySnapshot
  >,
  formatDateTime: BookingDateTimeFormatter,
): ClientDashboardBookingBase<
  TPaymentType,
  TFinancialSummary,
  TPaymentBreakdown,
  TPaymentStatus,
  TRefundStatus,
  TPayoutStatus,
  TRefundRecord,
  TPayoutRecord,
  TPolicySnapshot
> | null => {
  const dateTime = (booking.dateTime || booking.startDateTime || '').trim();
  const timezone = booking.timezone || null;
  const startDateTimeUtc = booking.startDateTimeUtc || null;
  if (!dateTime) return null;

  const { date, time } = formatDateTime({ startDateTime: dateTime, timezone, startDateTimeUtc });

  return {
    id: String(booking.id),
    professional:
      booking.professional?.name
      || booking.professional?.fullName
      || booking.professionalName
      || 'Profesional',
    service: booking.service?.name || booking.serviceName || 'Servicio',
    dateTime,
    date,
    time,
    location: booking.professional?.location || booking.professionalLocation || 'Ubicacion a confirmar',
    status: normalizeBookingOperationalStatus(booking.status),
    professionalSlug: booking.professional?.slug || booking.professionalSlug || null,
    serviceId: booking.service?.id || booking.serviceId || null,
    paymentType: booking.paymentType || null,
    paymentBreakdown: booking.paymentBreakdown || null,
    financialSummary: booking.financialSummary || null,
    timezone,
    startDateTimeUtc,
    paymentStatus: booking.paymentStatus || financialStatusFromSummary<TPaymentStatus>(booking.financialSummary),
    refundStatus: (booking.refundStatus ?? 'NONE') as TRefundStatus,
    payoutStatus: (booking.payoutStatus ?? 'NONE') as TPayoutStatus,
    latestRefund: booking.latestRefund || null,
    latestPayout: booking.latestPayout || null,
    policySnapshot: booking.policySnapshot || null,
  };
};

export const toFrontendReservationStatus = (
  status: ApiReservationStatus,
): FrontendReservationStatus => {
  switch (status) {
    case 'PENDING':
      return 'pending';
    case 'CONFIRMED':
      return 'confirmed';
    case 'CANCELLED':
      return 'cancelled';
    case 'COMPLETED':
      return 'completed';
    case 'NO_SHOW':
      return 'no_show';
    default:
      return 'pending';
  }
};

export const toApiReservationStatus = (
  status: FrontendReservationStatus,
): ApiReservationStatus => {
  switch (status) {
    case 'pending':
      return 'PENDING';
    case 'confirmed':
      return 'CONFIRMED';
    case 'cancelled':
      return 'CANCELLED';
    case 'completed':
      return 'COMPLETED';
    case 'no_show':
      return 'NO_SHOW';
    default:
      return 'PENDING';
  }
};

export const mapProfessionalBookingBase = <
  TPaymentType = string,
  TFinancialSummary = unknown,
  TPaymentBreakdown = BookingPaymentBreakdown,
  TPaymentStatus = unknown,
  TRefundStatus = string,
  TPayoutStatus = string,
  TRefundRecord = unknown,
  TPayoutRecord = unknown,
  TPolicySnapshot = unknown,
>(
  booking: ProfessionalBookingDtoBase<
    TPaymentType,
    TFinancialSummary,
    TPaymentBreakdown,
    TPaymentStatus,
    TRefundStatus,
    TPayoutStatus,
    TRefundRecord,
    TPayoutRecord,
    TPolicySnapshot
  >,
  formatDateTime: BookingDateTimeFormatter,
): ProfessionalReservationBase<
  TPaymentType,
  TFinancialSummary,
  TPaymentBreakdown,
  TPaymentStatus,
  TRefundStatus,
  TPayoutStatus,
  TRefundRecord,
  TPayoutRecord,
  TPolicySnapshot
> => {
  const timezone = booking.timezone || null;
  const startDateTimeUtc = booking.startDateTimeUtc || null;
  const { date, time } = formatDateTime({
    startDateTime: booking.startDateTime,
    timezone,
    startDateTimeUtc,
  });

  return {
    id: String(booking.id),
    serviceName: booking.serviceName,
    clientName: booking.clientName,
    date,
    time,
    duration: booking.duration,
    postBufferMinutes: booking.postBufferMinutes ?? 0,
    effectiveDurationMinutes: booking.effectiveDurationMinutes,
    status: toFrontendReservationStatus(booking.status),
    serviceId: booking.serviceId,
    userId: booking.userId,
    paymentType: booking.paymentType || null,
    paymentBreakdown: booking.paymentBreakdown || null,
    financialSummary: booking.financialSummary || null,
    paymentStatus: booking.paymentStatus || financialStatusFromSummary<TPaymentStatus>(booking.financialSummary),
    refundStatus: (booking.refundStatus ?? 'NONE') as TRefundStatus,
    payoutStatus: (booking.payoutStatus ?? 'NONE') as TPayoutStatus,
    latestRefund: booking.latestRefund || null,
    latestPayout: booking.latestPayout || null,
    policySnapshot: booking.policySnapshot || null,
    timezone,
    startDateTimeUtc,
  };
};

export const mapBookingCommandResponse = <TBooking, TMappedBooking>(
  response: BookingCommandResponseBase<TBooking>,
  mapBooking: (booking: TBooking) => TMappedBooking,
) => ({
  ...response,
  booking: response.booking ? mapBooking(response.booking) : null,
});

export const normalizeArrayPayload = <TItem>(payload: unknown): TItem[] => (
  Array.isArray(payload) ? payload : []
);

export const filterActiveItems = <TItem extends { active?: boolean }>(
  payload: unknown,
): TItem[] => normalizeArrayPayload<TItem>(payload).filter((item) => item?.active !== false);
