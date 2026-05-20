const PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const DEFAULT_INTERNAL_OPS_API_URL =
  (process.env.NEXT_PUBLIC_INTERNAL_OPS_API_URL || PUBLIC_API_URL).trim();

type InternalOpsAccess = {
  baseUrl: string;
  token: string;
};

let internalOpsAccess: InternalOpsAccess = {
  baseUrl: '',
  token: '',
};

const normalizeBaseUrl = (value: string) => value.trim().replace(/\/+$/, '');

const getOrigin = (value: string) => {
  try {
    return new URL(value).origin;
  } catch {
    return '';
  }
};

const getConfiguredAllowedOrigins = () =>
  (process.env.NEXT_PUBLIC_INTERNAL_OPS_ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
    .map(getOrigin)
    .filter(Boolean);

const getAllowedInternalOpsOrigins = () =>
  new Set(
    [
      getOrigin(PUBLIC_API_URL),
      getOrigin(DEFAULT_INTERNAL_OPS_API_URL),
      ...getConfiguredAllowedOrigins(),
    ].filter(Boolean),
  );

export const getDefaultInternalOpsBaseUrl = () => normalizeBaseUrl(DEFAULT_INTERNAL_OPS_API_URL);

export const isInternalOpsOriginAllowed = (baseUrl: string) => {
  const origin = getOrigin(baseUrl);
  return Boolean(origin && getAllowedInternalOpsOrigins().has(origin));
};

export const configureInternalOpsAccess = ({ baseUrl, token }: InternalOpsAccess) => {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
  const normalizedToken = token.trim();
  if (!normalizedBaseUrl || !normalizedToken) {
    throw new Error('Configura URL base y token interno primero.');
  }
  if (!isInternalOpsOriginAllowed(normalizedBaseUrl)) {
    throw new Error('URL interna no permitida por configuracion del frontend.');
  }
  internalOpsAccess = {
    baseUrl: normalizedBaseUrl,
    token: normalizedToken,
  };
};

export const clearInternalOpsAccess = () => {
  internalOpsAccess = {
    baseUrl: '',
    token: '',
  };
};

export const hasInternalOpsAccess = () =>
  Boolean(internalOpsAccess.baseUrl && internalOpsAccess.token);

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

const getBaseUrl = () => internalOpsAccess.baseUrl;

const getToken = () => internalOpsAccess.token;

const opsFetch = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const baseUrl = getBaseUrl();
  const token = getToken();
  if (!baseUrl || !token) throw new Error('Configurá URL base y token interno primero.');
  if (!isInternalOpsOriginAllowed(baseUrl)) {
    throw new Error('URL interna no permitida por configuracion del frontend.');
  }
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

// ── App Error Ops ──

type InternalAppErrorListItem = {
  id: number;
  source: string;
  severity: string;
  errorType: string | null;
  message: string | null;
  route: string | null;
  httpMethod: string | null;
  httpStatus: number | null;
  traceId: string | null;
  occurrenceCount: number;
  firstSeenAt: string;
  lastSeenAt: string;
  resolvedAt: string | null;
};

type InternalAppErrorDetail = InternalAppErrorListItem & {
  fingerprint: string;
  stackTrace: string | null;
  clientSessionId: string | null;
  contextJson: string | null;
};

type InternalAppErrorAnalytics = {
  totalIncidents: number;
  openIncidents: number;
  incidentsSeenInRange: number;
  countBySource: Record<string, number>;
  countBySeverity: Record<string, number>;
};

type InternalAppErrorListPage = {
  content: InternalAppErrorListItem[];
  totalElements: number;
  totalPages: number;
  number: number;
  first: boolean;
  last: boolean;
  empty: boolean;
};

export type {
  InternalAppErrorListItem,
  InternalAppErrorDetail,
  InternalAppErrorAnalytics,
  InternalAppErrorListPage,
};

export const fetchAppErrorList = (params: Record<string, string | number | boolean | undefined>) => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v != null && v !== '') searchParams.set(k, String(v));
  });
  return opsFetch<InternalAppErrorListPage>(`/internal/ops/app-errors?${searchParams.toString()}`);
};

export const fetchAppErrorDetail = (id: number) =>
  opsFetch<InternalAppErrorDetail>(`/internal/ops/app-errors/${id}`);

export const fetchAppErrorAnalytics = (from?: string, to?: string) => {
  const searchParams = new URLSearchParams();
  if (from) searchParams.set('from', from);
  if (to) searchParams.set('to', to);
  const qs = searchParams.toString();
  return opsFetch<InternalAppErrorAnalytics>(`/internal/ops/app-errors/analytics${qs ? `?${qs}` : ''}`);
};
