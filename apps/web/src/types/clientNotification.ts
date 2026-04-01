export type ClientNotificationEventType =
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

export type ClientNotificationSeverity =
  | 'INFO'
  | 'SUCCESS'
  | 'WARNING'
  | 'ERROR'
  | (string & {});

export type ClientNotificationStatus = 'ALL' | 'READ' | 'UNREAD';

export type ClientNotificationItem = {
  id: string;
  type: ClientNotificationEventType;
  title: string;
  body: string;
  severity: ClientNotificationSeverity;
  category: string | null;
  createdAt: string;
  readAt: string | null;
  bookingId: number | null;
  actionUrl: string | null;
};

export type ClientNotificationListResponse = {
  page: number;
  size: number;
  total: number;
  items: ClientNotificationItem[];
};

export type ClientNotificationUnreadCountResponse = {
  count: number;
};

export type ClientNotificationListParams = {
  status?: ClientNotificationStatus;
  page?: number;
  size?: number;
  bookingId?: number;
  from?: string;
  to?: string;
  types?: ClientNotificationEventType[];
};
