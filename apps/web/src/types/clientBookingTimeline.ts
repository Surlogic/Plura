import type { ClientNotificationEventType } from '@/types/clientNotification';

export type ClientBookingTimelinePayload = Record<string, unknown>;

export type ClientBookingTimelineItem = {
  id: string;
  eventUuid: string | null;
  type: ClientNotificationEventType;
  aggregateType: string | null;
  aggregateId: string | null;
  sourceModule: string | null;
  sourceAction: string | null;
  actorType: string | null;
  actorId: string | null;
  recipientType: string | null;
  recipientId: string | null;
  occurredAt: string | null;
  createdAt: string;
  bookingId: number | null;
  payload: ClientBookingTimelinePayload | null;
};

export type ClientBookingTimelineResponse = {
  bookingId: number;
  items: ClientBookingTimelineItem[];
};
