const ANALYTICS_SESSION_STORAGE_KEY = 'plura_analytics_session_id';

const createAnalyticsSessionId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `web_${crypto.randomUUID()}`;
  }
  return `web_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
};

export const getAnalyticsSessionId = (): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const existing = window.localStorage.getItem(ANALYTICS_SESSION_STORAGE_KEY)?.trim();
    if (existing) {
      return existing;
    }
    const next = createAnalyticsSessionId();
    window.localStorage.setItem(ANALYTICS_SESSION_STORAGE_KEY, next);
    return next;
  } catch {
    return null;
  }
};
