let analyticsSessionId: string | null = null;

const createAnalyticsSessionId = () =>
  `mobile_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

export const getAnalyticsSessionId = () => {
  if (!analyticsSessionId) {
    analyticsSessionId = createAnalyticsSessionId();
  }
  return analyticsSessionId;
};
