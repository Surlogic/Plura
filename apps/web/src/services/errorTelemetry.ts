type ErrorTelemetryPayload = {
  source: 'WEB';
  severity?: 'ERROR' | 'WARN';
  errorType?: string;
  message: string;
  stackTrace?: string;
  route?: string;
  httpMethod?: string;
  httpStatus?: number;
  traceId?: string;
  sessionId?: string;
  context?: Record<string, unknown>;
};

const TRACE_ID_HEADER = 'X-Plura-Trace-Id';
const WEB_SESSION_KEY = 'plura_web_error_session_id';
const TELEMETRY_PATH = '/api/v1/telemetry/client-errors';

const getBaseUrl = () => process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export const createTraceId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
};

export const getOrCreateWebErrorSessionId = () => {
  if (typeof window === 'undefined') return undefined;
  const existing = window.sessionStorage.getItem(WEB_SESSION_KEY);
  if (existing) return existing;
  const created = createTraceId();
  window.sessionStorage.setItem(WEB_SESSION_KEY, created);
  return created;
};

export const readTraceIdFromHeaders = (headers: unknown): string | undefined => {
  if (!headers || typeof headers !== 'object') return undefined;
  const maybeHeaders = headers as Record<string, unknown>;
  const direct = maybeHeaders[TRACE_ID_HEADER] ?? maybeHeaders[TRACE_ID_HEADER.toLowerCase()];
  if (typeof direct === 'string' && direct.trim()) return direct.trim();
  return undefined;
};

export const reportWebError = async (payload: Omit<ErrorTelemetryPayload, 'source' | 'sessionId'>) => {
  if (typeof window === 'undefined') return;
  const body: ErrorTelemetryPayload = {
    source: 'WEB',
    sessionId: getOrCreateWebErrorSessionId(),
    route: window.location.pathname,
    ...payload,
  };
  try {
    await fetch(`${getBaseUrl()}${TELEMETRY_PATH}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Plura-Client-Platform': 'WEB',
      },
      body: JSON.stringify(body),
      keepalive: true,
    });
  } catch {
    // La telemetria nunca debe romper el flujo principal.
  }
};

export { TRACE_ID_HEADER };
