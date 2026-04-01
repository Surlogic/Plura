export type ProfessionalNotificationEventType =
  | 'BOOKING_CREATED'
  | 'BOOKING_CONFIRMED'
  | 'BOOKING_CANCELLED'
  | 'BOOKING_RESCHEDULED'
  | 'BOOKING_COMPLETED'
  | 'BOOKING_NO_SHOW'
  | 'PAYMENT_APPROVED'
  | 'PAYMENT_FAILED'
  | 'PAYMENT_REFUND_PENDING'
  | 'PAYMENT_REFUNDED'
  | (string & {});

export type ProfessionalNotificationSeverity =
  | 'INFO'
  | 'SUCCESS'
  | 'WARNING'
  | 'ERROR'
  | (string & {});

export type ProfessionalNotificationStatus = 'ALL' | 'READ' | 'UNREAD';

export type ProfessionalNotificationItem = {
  id: string;
  type: ProfessionalNotificationEventType;
  title: string;
  body: string;
  severity: ProfessionalNotificationSeverity;
  category: string | null;
  createdAt: string;
  readAt: string | null;
  bookingId: number | null;
  actionUrl: string | null;
};

export type ProfessionalNotificationListResponse = {
  page: number;
  size: number;
  total: number;
  items: ProfessionalNotificationItem[];
};

export type ProfessionalNotificationUnreadCountResponse = {
  count: number;
};

export type ProfessionalNotificationListParams = {
  status?: ProfessionalNotificationStatus;
  page?: number;
  size?: number;
  bookingId?: number;
  from?: string;
  to?: string;
  types?: ProfessionalNotificationEventType[];
};
