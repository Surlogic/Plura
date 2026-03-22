type WebVitalMetric = {
  id: string;
  name: string;
  value: number;
  rating?: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  navigationType?: string;
};

const ANALYTICS_ENDPOINT = process.env.NEXT_PUBLIC_WEB_VITALS_ENDPOINT;

function sendToAnalytics(metric: WebVitalMetric) {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Web Vital] ${metric.name}:`, {
      value: Math.round(metric.value * 100) / 100,
      rating: metric.rating,
      delta: Math.round(metric.delta * 100) / 100,
      id: metric.id,
    });
    return;
  }

  if (!ANALYTICS_ENDPOINT) return;

  const body = JSON.stringify({
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    delta: metric.delta,
    id: metric.id,
    page: window.location.pathname,
    timestamp: Date.now(),
  });

  if (typeof navigator.sendBeacon === 'function') {
    navigator.sendBeacon(ANALYTICS_ENDPOINT, body);
  } else {
    fetch(ANALYTICS_ENDPOINT, {
      method: 'POST',
      body,
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
    }).catch(() => {});
  }
}

export function reportWebVitals(metric: WebVitalMetric) {
  sendToAnalytics(metric);
}
