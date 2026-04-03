import api from '@/services/api';

type InternalFeedbackListItem = {
  id: number;
  authorUserId: number;
  authorName: string;
  authorRole: string;
  rating: number;
  text: string | null;
  category: string | null;
  contextSource: string | null;
  status: string;
  createdAt: string;
};

type InternalFeedbackDetail = InternalFeedbackListItem & {
  updatedAt: string;
};

type InternalFeedbackAnalytics = {
  totalFeedbacks: number;
  averageRating: number | null;
  countByAuthorRole: Record<string, number>;
  countByCategory: Record<string, number>;
  countByRating: Record<number, number>;
  dailyCounts: { date: string; count: number; averageRating: number }[];
};

type InternalFeedbackListPage = {
  content: InternalFeedbackListItem[];
  totalElements: number;
  totalPages: number;
  number: number;
  first: boolean;
  last: boolean;
  empty: boolean;
};

const getBaseUrl = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('plura_ops_api_url') || '';
  }
  return '';
};

const getToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('plura_ops_token') || '';
  }
  return '';
};

const opsFetch = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const baseUrl = getBaseUrl();
  const token = getToken();
  if (!baseUrl || !token) throw new Error('Configurá URL base y token interno primero.');
  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      'X-Internal-Token': token,
      Accept: 'application/json',
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${res.status}: ${text || res.statusText}`);
  }
  return res.json() as Promise<T>;
};

export type { InternalFeedbackListItem, InternalFeedbackDetail, InternalFeedbackAnalytics, InternalFeedbackListPage };

export const fetchFeedbackList = (params: Record<string, string | number | undefined>) => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v != null && v !== '') searchParams.set(k, String(v));
  });
  return opsFetch<InternalFeedbackListPage>(`/internal/ops/app-feedback?${searchParams.toString()}`);
};

export const fetchFeedbackDetail = (id: number) =>
  opsFetch<InternalFeedbackDetail>(`/internal/ops/app-feedback/${id}`);

export const archiveFeedback = (id: number) =>
  opsFetch<InternalFeedbackDetail>(`/internal/ops/app-feedback/${id}/archive`, { method: 'PATCH' });

export const unarchiveFeedback = (id: number) =>
  opsFetch<InternalFeedbackDetail>(`/internal/ops/app-feedback/${id}/unarchive`, { method: 'PATCH' });

export const fetchFeedbackAnalytics = (from?: string, to?: string) => {
  const searchParams = new URLSearchParams();
  if (from) searchParams.set('from', from);
  if (to) searchParams.set('to', to);
  const qs = searchParams.toString();
  return opsFetch<InternalFeedbackAnalytics>(`/internal/ops/app-feedback/analytics${qs ? `?${qs}` : ''}`);
};

// ── Review Ops ──

type InternalReviewListItem = {
  id: number;
  bookingId: number;
  professionalId: number;
  professionalName: string;
  professionalSlug: string;
  clientUserId: number;
  clientName: string;
  rating: number;
  text: string | null;
  textHiddenByProfessional: boolean;
  textHiddenByInternalOps: boolean;
  reported: boolean;
  reportCount: number;
  latestReport: {
    id: number;
    reason: 'SPAM' | 'OFFENSIVE' | 'FALSE_INFORMATION' | 'HARASSMENT' | 'OTHER';
    note: string | null;
    status: 'OPEN' | 'REVIEWED' | 'RESOLVED';
    createdAt: string | null;
    resolvedAt: string | null;
  } | null;
  internalModerationNote: string | null;
  createdAt: string;
};

type InternalReviewDetail = InternalReviewListItem & {
  textHiddenAt: string | null;
  updatedAt: string;
};

type InternalReviewAnalytics = {
  totalReviews: number;
  averageRating: number | null;
  countByRating: Record<number, number>;
  withText: number;
  withoutText: number;
  textHidden: number;
  topByVolume: { professionalId: number; name: string; slug: string; reviewCount: number; averageRating: number }[];
  topByRating: { professionalId: number; name: string; slug: string; reviewCount: number; averageRating: number }[];
  dailyCounts: { date: string; count: number; averageRating: number }[];
};

type InternalReviewListPage = {
  content: InternalReviewListItem[];
  totalElements: number;
  totalPages: number;
  number: number;
  first: boolean;
  last: boolean;
  empty: boolean;
};

export type { InternalReviewListItem, InternalReviewDetail, InternalReviewAnalytics, InternalReviewListPage };

export const fetchReviewList = (params: Record<string, string | number | boolean | undefined>) => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v != null && v !== '') searchParams.set(k, String(v));
  });
  return opsFetch<InternalReviewListPage>(`/internal/ops/reviews?${searchParams.toString()}`);
};

export const fetchReviewDetail = (id: number) =>
  opsFetch<InternalReviewDetail>(`/internal/ops/reviews/${id}`);

export const hideReviewTextOps = (id: number, note?: string) => {
  const qs = note ? `?note=${encodeURIComponent(note)}` : '';
  return opsFetch<InternalReviewDetail>(`/internal/ops/reviews/${id}/hide-text${qs}`, { method: 'PATCH' });
};

export const showReviewTextOps = (id: number) =>
  opsFetch<InternalReviewDetail>(`/internal/ops/reviews/${id}/show-text`, { method: 'PATCH' });

export const fetchReviewAnalytics = (from?: string, to?: string) => {
  const searchParams = new URLSearchParams();
  if (from) searchParams.set('from', from);
  if (to) searchParams.set('to', to);
  const qs = searchParams.toString();
  return opsFetch<InternalReviewAnalytics>(`/internal/ops/reviews/analytics${qs ? `?${qs}` : ''}`);
};

// Analytics Ops

type InternalOpsAnalyticsOverview = {
  from: string;
  to: string;
  totalReservations: number;
  confirmedReservations: number;
  completedReservations: number;
  cancelledReservations: number;
  noShowReservations: number;
  estimatedRevenue: number;
  averageTicket: number;
  totalSearches: number;
  totalProfileViews: number;
};

type InternalOpsAnalyticsReservationFunnel = {
  searches: number;
  profileViews: number;
  reservationFlowSessions: number;
  serviceConfirmedSessions: number;
  dateConfirmedSessions: number;
  timeSelectedSessions: number;
  reviewSessions: number;
  confirmSessions: number;
  authOpenedSessions: number;
  authCompletedSessions: number;
  submitAttemptedSessions: number;
  bookingsCreated: number;
  paymentSessions: number;
  bookingsConfirmed: number;
  bookingsCompleted: number;
  profileToFlowRate: number;
  flowToSubmitRate: number;
  submitToBookingRate: number;
  bookingToConfirmationRate: number;
  bookingToCompletionRate: number;
};

type InternalOpsAnalyticsCategoryPerformance = {
  categoryKey: string;
  categoryLabel: string;
  totalBookings: number;
  pendingBookings: number;
  confirmedBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  noShowBookings: number;
  cancellationRate: number;
  noShowRate: number;
  estimatedRevenue: number;
  averageTicket: number;
};

type InternalOpsAnalyticsServicePerformance = {
  serviceId: string;
  serviceName: string;
  categoryLabel: string;
  totalBookings: number;
  estimatedRevenue: number;
  averageTicket: number;
};

type InternalOpsAnalyticsFunnelByCategory = {
  categoryKey: string;
  categoryLabel: string;
  searches: number;
  profileViews: number;
  reservations: number;
  searchToProfileRate: number;
  profileToReservationRate: number;
  searchToReservationRate: number;
};

type InternalOpsAnalyticsRetention = {
  activeClients: number;
  returningClients: number;
  returningRate: number;
  repeatClientsInPeriod: number;
  repeatRate: number;
  previousWindowClients: number;
  retainedFromPreviousWindow: number;
  windowRetentionRate: number;
};

type InternalOpsAnalyticsDemandPoint = {
  label: string;
  count: number;
};

type InternalOpsAnalyticsCityPerformance = {
  city: string;
  searches: number;
  profileViews: number;
  reservations: number;
  profileToReservationRate: number;
  searchToReservationRate: number;
};

type InternalOpsAnalyticsProfessionalPerformance = {
  professionalId: number;
  professionalName: string;
  professionalSlug: string;
  categoryLabel: string;
  city: string;
  totalBookings: number;
  estimatedRevenue: number;
  averageTicket: number;
  occupancyRate: number;
  rating: number;
  reviewsCount: number;
};

type InternalOpsAnalyticsPlatformPerformance = {
  platform: string;
  searches: number;
  profileViews: number;
  reservationFlowSessions: number;
  bookings: number;
  confirmedBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  noShowBookings: number;
  searchToBookingRate: number;
  bookingToCompletionRate: number;
};

type InternalOpsAnalyticsPaymentTypePerformance = {
  paymentType: string;
  totalBookings: number;
  confirmedBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  completionRate: number;
  cancellationRate: number;
  estimatedRevenue: number;
  averageTicket: number;
};

type InternalOpsAnalyticsSummary = {
  overview: InternalOpsAnalyticsOverview;
  reservationFunnel: InternalOpsAnalyticsReservationFunnel;
  categoryPerformance: InternalOpsAnalyticsCategoryPerformance[];
  servicePerformance: InternalOpsAnalyticsServicePerformance[];
  funnelByCategory: InternalOpsAnalyticsFunnelByCategory[];
  retention: InternalOpsAnalyticsRetention;
  demandByWeekday: InternalOpsAnalyticsDemandPoint[];
  demandByHour: InternalOpsAnalyticsDemandPoint[];
  cityPerformance: InternalOpsAnalyticsCityPerformance[];
  professionalPerformance: InternalOpsAnalyticsProfessionalPerformance[];
  platformPerformance: InternalOpsAnalyticsPlatformPerformance[];
  paymentTypePerformance: InternalOpsAnalyticsPaymentTypePerformance[];
};

export type {
  InternalOpsAnalyticsOverview,
  InternalOpsAnalyticsReservationFunnel,
  InternalOpsAnalyticsCategoryPerformance,
  InternalOpsAnalyticsServicePerformance,
  InternalOpsAnalyticsFunnelByCategory,
  InternalOpsAnalyticsRetention,
  InternalOpsAnalyticsDemandPoint,
  InternalOpsAnalyticsCityPerformance,
  InternalOpsAnalyticsProfessionalPerformance,
  InternalOpsAnalyticsPlatformPerformance,
  InternalOpsAnalyticsPaymentTypePerformance,
  InternalOpsAnalyticsSummary,
};

export const fetchOpsAnalyticsSummary = (from?: string, to?: string) => {
  const searchParams = new URLSearchParams();
  if (from) searchParams.set('from', from);
  if (to) searchParams.set('to', to);
  const qs = searchParams.toString();
  return api
    .get<InternalOpsAnalyticsSummary>(`/internal/ops/analytics/summary${qs ? `?${qs}` : ''}`)
    .then((response) => response.data);
};
