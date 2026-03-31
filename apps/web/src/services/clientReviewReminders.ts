import api from '@/services/api';
import type {
  NextReviewReminderResponse,
  ReviewReminderShownResponse,
} from '@/types/review';

export const getNextReviewReminder = async (): Promise<NextReviewReminderResponse> => {
  const response = await api.get<NextReviewReminderResponse>('/cliente/review-reminders/next');
  return response.data;
};

export const markReviewReminderShown = async (
  bookingId: number,
): Promise<ReviewReminderShownResponse> => {
  const response = await api.post<ReviewReminderShownResponse>(
    `/cliente/review-reminders/${bookingId}/shown`,
  );
  return response.data;
};
