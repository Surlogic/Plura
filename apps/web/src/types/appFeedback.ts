export type AppFeedbackResponse = {
  id: number;
  rating: number;
  text: string | null;
  category: string | null;
  contextSource: string | null;
  createdAt: string;
};

export type CreateAppFeedbackRequest = {
  rating: number;
  text?: string;
  category?: string;
  contextSource?: string;
};

export type AppFeedbackPage = {
  content: AppFeedbackResponse[];
  totalPages: number;
  totalElements: number;
  first: boolean;
  last: boolean;
  empty: boolean;
};
