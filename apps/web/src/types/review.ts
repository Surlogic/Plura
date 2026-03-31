export type BookingReviewResponse = {
  id: number;
  bookingId: number;
  professionalId: number;
  rating: number;
  text: string | null;
  authorDisplayName: string;
  textHiddenByProfessional: boolean;
  reportedByProfessional: boolean;
  createdAt: string;
  updatedAt: string;
};

export type BookingReviewLookupResponse =
  | {
      exists: false;
      review: null;
    }
  | {
      exists: true;
      review: BookingReviewResponse;
    };

export type ReviewEligibilityResponse = {
  eligible: boolean;
  alreadyReviewed: boolean;
  reason: string | null;
};

export type ReviewReminder = {
  bookingId: number;
  professionalName: string;
  serviceName: string;
  completedAt: string;
  reviewWindowEndsAt: string;
  reminderCount: number;
};

export type NextReviewReminderResponse =
  | {
      exists: false;
      reminder: null;
    }
  | {
      exists: true;
      reminder: ReviewReminder;
    };

export type ReviewReminderShownResponse = {
  recorded: boolean;
  reminderCount: number;
  reason: string | null;
};

export type CreateBookingReviewRequest = {
  rating: number;
  text?: string | null;
};

export type ReviewReportReason =
  | 'SPAM'
  | 'OFFENSIVE'
  | 'FALSE_INFORMATION'
  | 'HARASSMENT'
  | 'OTHER';

export type CreateProfessionalReviewReportRequest = {
  reason: ReviewReportReason;
  note?: string | null;
};

export type BookingReviewReportResponse = {
  id: number;
  reviewId: number;
  professionalId: number;
  reason: ReviewReportReason;
  note: string | null;
  status: 'OPEN' | 'REVIEWED' | 'RESOLVED';
  createdAt: string;
  resolvedAt: string | null;
};

export type BookingReviewPage = {
  content: BookingReviewResponse[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
  empty: boolean;
};
