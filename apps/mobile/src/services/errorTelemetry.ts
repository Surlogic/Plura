import { Platform } from 'react-native';
import { getAnalyticsSessionId } from './analyticsSession';

type MobileErrorTelemetryPayload = {
  source: 'MOBILE';
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

const TELEMETRY_PATH = '/api/v1/telemetry/client-errors';
export const TRACE_ID_HEADER = 'X-Plura-Trace-Id';

const getBaseUrl = () => {
  const configuredBaseUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (configuredBaseUrl) return configuredBaseUrl;
  if (Platform.OS === 'web') return 'http://localhost:3000';
  if (__DEV__) {
    if (Platform.OS === 'android') return 'http://10.0.2.2:3000';
    return 'http://localhost:3000';
  }
  return '';
};

export const createTraceId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;

export const reportMobileError = async (
  payload: Omit<MobileErrorTelemetryPayload, 'source' | 'sessionId'>,
) => {
  const baseUrl = getBaseUrl();
  if (!baseUrl) return;
  const body: MobileErrorTelemetryPayload = {
    source: 'MOBILE',
    sessionId: getAnalyticsSessionId(),
    ...payload,
    context: {
      platform: Platform.OS,
      ...(payload.context || {}),
    },
  };
  try {
    await fetch(`${baseUrl}${TELEMETRY_PATH}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Plura-Client-Platform': 'MOBILE',
      },
      body: JSON.stringify(body),
    });
  } catch {
    // La telemetria nunca debe romper el flujo principal.
  }
};
