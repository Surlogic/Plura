const STORAGE_KEY = 'plura:web:mercadopago-connection-attempt';
const MAX_ATTEMPT_AGE_MS = 15 * 60 * 1000;

export const readMercadoPagoConnectionAttempt = () => {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { startedAt?: number } | null;
    if (!parsed?.startedAt || Date.now() - parsed.startedAt > MAX_ATTEMPT_AGE_MS) {
      window.sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    window.sessionStorage.removeItem(STORAGE_KEY);
    return null;
  }
};

export const hasMercadoPagoConnectionAttempt = () => readMercadoPagoConnectionAttempt() !== null;

export const writeMercadoPagoConnectionAttempt = () => {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ startedAt: Date.now() }));
};

export const clearMercadoPagoConnectionAttempt = () => {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(STORAGE_KEY);
};
