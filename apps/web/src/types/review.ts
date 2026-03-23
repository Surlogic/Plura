export type BookingReviewResponse = {
  id: number;
  bookingId: number;
  professionalId: number;
  rating: number;
  text: string | null;
  authorDisplayName: string;
  textHiddenByProfessional: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ReviewEligibilityResponse = {
  eligible: boolean;
  alreadyReviewed: boolean;
  reason: string | null;
};

export type CreateBookingReviewRequest = {
  rating: number;
  text?: string | null;
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
