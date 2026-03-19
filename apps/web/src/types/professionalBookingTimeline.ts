import type { ProfessionalNotificationEventType } from '@/types/notification';

export type ProfessionalBookingTimelinePayload = Record<string, unknown>;

export type ProfessionalBookingTimelineItem = {
  id: string;
  eventUuid: string | null;
  type: ProfessionalNotificationEventType;
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
  payload: ProfessionalBookingTimelinePayload | null;
};

export type ProfessionalBookingTimelineResponse = {
  bookingId: number;
  items: ProfessionalBookingTimelineItem[];
};
