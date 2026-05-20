const LEGACY_ACCESS_TOKEN_STORAGE_KEY = 'plura_access_token_fallback';
const SESSION_HINT_STORAGE_KEY = 'plura_auth_session_hint';
const SESSION_ROLE_STORAGE_KEY = 'plura_auth_session_role';
const CONTEXT_SELECTION_PENDING_STORAGE_KEY = 'plura_auth_context_selection_pending';
const SESSION_SYNC_STORAGE_KEY = 'plura_auth_session_sync_event';
const SESSION_SYNC_CHANNEL_NAME = 'plura_auth_session_sync';

export type KnownAuthSessionRole = 'CLIENT' | 'PROFESSIONAL' | 'WORKER';

type AuthSessionChangeReason = 'login' | 'logout' | 'context' | 'pending' | 'session';

export type AuthSessionSnapshot = {
  accessToken: string | null;
  hasSessionHint: boolean;
  role: KnownAuthSessionRole | null;
  contextSelectionPending: boolean;
};

export type AuthSessionChangeEvent = {
  reason: AuthSessionChangeReason;
  snapshot: AuthSessionSnapshot;
  isExternal?: boolean;
};

type AuthSessionSyncMessage = AuthSessionChangeEvent & {
  sourceId: string;
  version: number;
};

type AuthSessionChangeListener = (event: AuthSessionChangeEvent) => void;

let inMemoryAccessToken: string | null = null;
let inMemorySessionHint: boolean | null = null;
let inMemorySessionRole: KnownAuthSessionRole | null | undefined;
let inMemoryContextSelectionPending: boolean | null = null;
const ACCESS_TOKEN_EXPIRY_SKEW_MS = 30_000;
const TAB_ID = Math.random().toString(36).slice(2);
const sessionChangeListeners = new Set<AuthSessionChangeListener>();
const WATCHED_SESSION_STORAGE_KEYS = new Set([
  SESSION_HINT_STORAGE_KEY,
  SESSION_ROLE_STORAGE_KEY,
  CONTEXT_SELECTION_PENDING_STORAGE_KEY,
]);

let sessionSyncListenersReady = false;
let sessionSyncBroadcastChannel: BroadcastChannel | null = null;
let pendingStorageSnapshotSync: ReturnType<typeof setTimeout> | null = null;

const normalizeToken = (token?: string | null) => {
  if (typeof token !== 'string') return null;
  const trimmed = token.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeSessionRole = (value?: string | null): KnownAuthSessionRole | null => {
  if (value === 'CLIENT' || value === 'PROFESSIONAL' || value === 'WORKER') {
    return value;
  }
  return null;
};

const decodeBase64Url = (value: string) => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');

  if (typeof window !== 'undefined' && typeof window.atob === 'function') {
    return window.atob(padded);
  }
  return Buffer.from(padded, 'base64').toString('utf8');
};

const parseAccessTokenPayload = (token?: string | null) => {
  try {
    if (!token) return null;
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const payloadRaw = decodeBase64Url(parts[1]);
    return JSON.parse(payloadRaw) as { role?: unknown; ctx?: unknown; exp?: unknown };
  } catch {
    return null;
  }
};

const roleFromAccessToken = (token?: string | null): KnownAuthSessionRole | null => {
  try {
    const payload = parseAccessTokenPayload(token);
    if (!payload) return null;
    if (payload.ctx === 'WORKER') return 'WORKER';
    if (payload.ctx === 'PROFESSIONAL') return 'PROFESSIONAL';
    if (payload.ctx === 'CLIENT') return 'CLIENT';
    // Compatibilidad para tokens legacy sin ctx.
    if (payload.role === 'USER') return 'CLIENT';
    if (payload.role === 'PROFESSIONAL') return 'PROFESSIONAL';
    return null;
  } catch {
    return null;
  }
};

const isAccessTokenExpired = (token?: string | null) => {
  const payload = parseAccessTokenPayload(token);
  if (!payload || typeof payload.exp !== 'number' || !Number.isFinite(payload.exp)) {
    return false;
  }
  return payload.exp * 1000 <= Date.now() + ACCESS_TOKEN_EXPIRY_SKEW_MS;
};

const clearLegacyStoredAccessToken = () => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(LEGACY_ACCESS_TOKEN_STORAGE_KEY);
};

const readAuthSessionSnapshotFromStorage = (): AuthSessionSnapshot => {
  if (typeof window === 'undefined') {
    return {
      accessToken: inMemoryAccessToken,
      hasSessionHint: Boolean(inMemorySessionHint),
      role: typeof inMemorySessionRole === 'undefined' ? null : inMemorySessionRole,
      contextSelectionPending: Boolean(inMemoryContextSelectionPending),
    };
  }

  const legacyAccessToken = normalizeToken(
    window.localStorage.getItem(LEGACY_ACCESS_TOKEN_STORAGE_KEY),
  );
  const contextSelectionPending =
    window.localStorage.getItem(CONTEXT_SELECTION_PENDING_STORAGE_KEY) === '1';
  const storedRole = normalizeSessionRole(window.localStorage.getItem(SESSION_ROLE_STORAGE_KEY));
  const legacyRole = roleFromAccessToken(legacyAccessToken);
  const role = contextSelectionPending
    ? null
    : storedRole ?? roleFromAccessToken(inMemoryAccessToken) ?? legacyRole;
  const hasSessionHint =
    window.localStorage.getItem(SESSION_HINT_STORAGE_KEY) === '1' ||
    Boolean(inMemoryAccessToken) ||
    Boolean(legacyAccessToken) ||
    Boolean(role) ||
    contextSelectionPending;

  if (legacyAccessToken) {
    clearLegacyStoredAccessToken();
    window.localStorage.setItem(SESSION_HINT_STORAGE_KEY, '1');
    if (!storedRole && legacyRole && !contextSelectionPending) {
      window.localStorage.setItem(SESSION_ROLE_STORAGE_KEY, legacyRole);
    }
  }

  return {
    accessToken: inMemoryAccessToken,
    hasSessionHint,
    role,
    contextSelectionPending,
  };
};

const applyAuthSessionSnapshotToMemory = (snapshot: AuthSessionSnapshot) => {
  inMemoryAccessToken = snapshot.accessToken;
  inMemorySessionHint = snapshot.hasSessionHint;
  inMemorySessionRole = snapshot.contextSelectionPending ? null : snapshot.role;
  inMemoryContextSelectionPending = snapshot.contextSelectionPending;
};

export const getCurrentAuthSessionSnapshot = (): AuthSessionSnapshot => {
  const snapshot = readAuthSessionSnapshotFromStorage();
  applyAuthSessionSnapshotToMemory(snapshot);
  return snapshot;
};

const notifyAuthSessionListeners = (event: AuthSessionChangeEvent) => {
  sessionChangeListeners.forEach((listener) => {
    listener(event);
  });
};

const sanitizeAuthSessionSnapshotForSync = (
  snapshot: AuthSessionSnapshot,
): AuthSessionSnapshot => ({
  ...snapshot,
  accessToken: null,
});

const getSessionSyncBroadcastChannel = () => {
  if (
    typeof window === 'undefined' ||
    typeof window.BroadcastChannel !== 'function'
  ) {
    return null;
  }
  if (!sessionSyncBroadcastChannel) {
    sessionSyncBroadcastChannel = new window.BroadcastChannel(SESSION_SYNC_CHANNEL_NAME);
  }
  return sessionSyncBroadcastChannel;
};

const emitAuthSessionChange = (reason: AuthSessionChangeReason) => {
  if (typeof window === 'undefined') return;
  const snapshot = getCurrentAuthSessionSnapshot();
  const syncSnapshot = sanitizeAuthSessionSnapshotForSync(snapshot);
  const message: AuthSessionSyncMessage = {
    reason,
    snapshot: syncSnapshot,
    sourceId: TAB_ID,
    version: Date.now(),
  };

  notifyAuthSessionListeners({ reason, snapshot, isExternal: false });

  try {
    getSessionSyncBroadcastChannel()?.postMessage(message);
  } catch {
    // BroadcastChannel es optimización; localStorage mantiene el fallback.
  }

  try {
    window.localStorage.setItem(SESSION_SYNC_STORAGE_KEY, JSON.stringify(message));
  } catch {
    // Si localStorage falla, la pestaña actual ya fue notificada.
  }
};

const isAuthSessionSyncMessage = (value: unknown): value is AuthSessionSyncMessage => {
  if (!value || typeof value !== 'object') return false;
  const message = value as Partial<AuthSessionSyncMessage>;
  return (
    typeof message.sourceId === 'string' &&
    typeof message.version === 'number' &&
    typeof message.reason === 'string' &&
    Boolean(message.snapshot) &&
    typeof message.snapshot === 'object'
  );
};

const handleExternalAuthSessionMessage = (message: unknown) => {
  if (!isAuthSessionSyncMessage(message) || message.sourceId === TAB_ID) return;
  const snapshot = {
    ...message.snapshot,
    accessToken: message.reason === 'logout' ? null : inMemoryAccessToken,
  };
  applyAuthSessionSnapshotToMemory(snapshot);
  notifyAuthSessionListeners({
    reason: message.reason,
    snapshot,
    isExternal: true,
  });
};

const syncAuthSessionSnapshotFromStorage = () => {
  pendingStorageSnapshotSync = null;
  const snapshot = readAuthSessionSnapshotFromStorage();
  applyAuthSessionSnapshotToMemory(snapshot);
  notifyAuthSessionListeners({
    reason: snapshot.hasSessionHint ? 'session' : 'logout',
    snapshot,
    isExternal: true,
  });
};

const scheduleAuthSessionSnapshotSyncFromStorage = () => {
  if (pendingStorageSnapshotSync) {
    clearTimeout(pendingStorageSnapshotSync);
  }
  pendingStorageSnapshotSync = setTimeout(syncAuthSessionSnapshotFromStorage, 25);
};

const ensureAuthSessionSyncListeners = () => {
  if (sessionSyncListenersReady || typeof window === 'undefined') return;
  sessionSyncListenersReady = true;

  const broadcastChannel = getSessionSyncBroadcastChannel();
  if (broadcastChannel) {
    broadcastChannel.addEventListener('message', (event) => {
      handleExternalAuthSessionMessage(event.data);
    });
  }

  window.addEventListener('storage', (event) => {
    if (event.key === SESSION_SYNC_STORAGE_KEY && event.newValue) {
      try {
        handleExternalAuthSessionMessage(JSON.parse(event.newValue));
      } catch {
        scheduleAuthSessionSnapshotSyncFromStorage();
      }
      return;
    }
    if (event.key && WATCHED_SESSION_STORAGE_KEYS.has(event.key)) {
      scheduleAuthSessionSnapshotSyncFromStorage();
    }
  });
};

export const subscribeAuthSessionChange = (listener: AuthSessionChangeListener) => {
  ensureAuthSessionSyncListeners();
  sessionChangeListeners.add(listener);
  return () => {
    sessionChangeListeners.delete(listener);
  };
};

export const getAuthAccessToken = (): string | null => {
  if (inMemoryAccessToken) return inMemoryAccessToken;
  clearLegacyStoredAccessToken();
  return null;
};

export const getUsableAuthAccessToken = (): string | null => {
  const token = getAuthAccessToken();
  if (!token) return null;
  if (!isAccessTokenExpired(token)) {
    return token;
  }
  clearAuthAccessToken();
  return null;
};

export const getKnownAuthSessionRole = (): KnownAuthSessionRole | null => {
  if (isAuthContextSelectionPending()) {
    inMemorySessionRole = null;
    return null;
  }
  if (typeof inMemorySessionRole !== 'undefined') {
    return inMemorySessionRole;
  }
  if (typeof window === 'undefined') {
    inMemorySessionRole = null;
    return inMemorySessionRole;
  }
  const storedRole = normalizeSessionRole(window.localStorage.getItem(SESSION_ROLE_STORAGE_KEY));
  if (storedRole) {
    inMemorySessionRole = storedRole;
    return storedRole;
  }

  const derivedRole = roleFromAccessToken(getAuthAccessToken());
  inMemorySessionRole = derivedRole;
  if (derivedRole) {
    window.localStorage.setItem(SESSION_ROLE_STORAGE_KEY, derivedRole);
    window.localStorage.setItem(SESSION_HINT_STORAGE_KEY, '1');
  }
  return derivedRole;
};

export const isAuthContextSelectionPending = (): boolean => {
  if (inMemoryContextSelectionPending !== null) {
    return inMemoryContextSelectionPending;
  }
  if (typeof window === 'undefined') {
    inMemoryContextSelectionPending = false;
    return false;
  }
  const stored = window.localStorage.getItem(CONTEXT_SELECTION_PENDING_STORAGE_KEY) === '1';
  inMemoryContextSelectionPending = stored;
  return stored;
};

export const setAuthContextSelectionPending = (value: boolean) => {
  inMemoryContextSelectionPending = value;
  if (value) {
    inMemorySessionRole = null;
    inMemorySessionHint = true;
  }
  if (typeof window === 'undefined') return;
  if (value) {
    window.localStorage.setItem(CONTEXT_SELECTION_PENDING_STORAGE_KEY, '1');
    window.localStorage.removeItem(SESSION_ROLE_STORAGE_KEY);
    window.localStorage.setItem(SESSION_HINT_STORAGE_KEY, '1');
  } else {
    window.localStorage.removeItem(CONTEXT_SELECTION_PENDING_STORAGE_KEY);
  }
  emitAuthSessionChange('pending');
};

export const hasKnownAuthSession = (): boolean => {
  if (getUsableAuthAccessToken()) return true;
  if (getKnownAuthSessionRole()) return true;
  if (inMemorySessionHint !== null) return inMemorySessionHint;
  if (typeof window === 'undefined') return false;
  const stored = window.localStorage.getItem(SESSION_HINT_STORAGE_KEY) === '1';
  inMemorySessionHint = stored;
  return stored;
};

export const setKnownAuthSession = (
  value: boolean,
  role?: KnownAuthSessionRole | null,
) => {
  inMemorySessionHint = value;
  if (!value) {
    inMemorySessionRole = null;
    inMemoryContextSelectionPending = false;
  } else if (role) {
    inMemorySessionRole = role;
    inMemoryContextSelectionPending = false;
  }
  if (typeof window === 'undefined') return;
  if (value) {
    window.localStorage.setItem(SESSION_HINT_STORAGE_KEY, '1');
  } else {
    window.localStorage.removeItem(SESSION_HINT_STORAGE_KEY);
  }

  if (!value || role === null) {
    window.localStorage.removeItem(SESSION_ROLE_STORAGE_KEY);
  } else if (role) {
    window.localStorage.setItem(SESSION_ROLE_STORAGE_KEY, role);
    window.localStorage.removeItem(CONTEXT_SELECTION_PENDING_STORAGE_KEY);
  }
  if (!value) {
    window.localStorage.removeItem(CONTEXT_SELECTION_PENDING_STORAGE_KEY);
  }
  emitAuthSessionChange(value ? 'session' : 'logout');
};

export const setKnownAuthSessionRole = (role?: KnownAuthSessionRole | null) => {
  inMemorySessionRole = role ?? null;
  if (role) {
    inMemorySessionHint = true;
    inMemoryContextSelectionPending = false;
  }
  if (typeof window === 'undefined') return;
  if (role) {
    window.localStorage.setItem(SESSION_ROLE_STORAGE_KEY, role);
    window.localStorage.setItem(SESSION_HINT_STORAGE_KEY, '1');
    window.localStorage.removeItem(CONTEXT_SELECTION_PENDING_STORAGE_KEY);
  } else {
    window.localStorage.removeItem(SESSION_ROLE_STORAGE_KEY);
  }
  emitAuthSessionChange(role ? 'context' : 'session');
};

export const setAuthAccessToken = (
  token?: string | null,
  role?: KnownAuthSessionRole | null,
) => {
  const previousToken = inMemoryAccessToken;
  const normalized = normalizeToken(token);
  inMemoryAccessToken = normalized;
  if (normalized) {
    inMemorySessionHint = true;
    if (role) {
      inMemorySessionRole = role;
      inMemoryContextSelectionPending = false;
    } else if (role === null) {
      inMemorySessionRole = null;
    }
  }
  if (typeof window === 'undefined') return;
  if (normalized) {
    clearLegacyStoredAccessToken();
    window.localStorage.setItem(SESSION_HINT_STORAGE_KEY, '1');
    if (role) {
      window.localStorage.setItem(SESSION_ROLE_STORAGE_KEY, role);
      window.localStorage.removeItem(CONTEXT_SELECTION_PENDING_STORAGE_KEY);
    } else if (role === null) {
      window.localStorage.removeItem(SESSION_ROLE_STORAGE_KEY);
    }
  } else {
    clearLegacyStoredAccessToken();
    if (role === null) {
      window.localStorage.removeItem(SESSION_ROLE_STORAGE_KEY);
    }
  }
  if (normalized) {
    emitAuthSessionChange(
      role ? (previousToken && previousToken !== normalized ? 'login' : 'context') : 'session',
    );
  }
};

export const clearAuthAccessToken = () => {
  inMemoryAccessToken = null;
  inMemorySessionHint = false;
  inMemorySessionRole = null;
  inMemoryContextSelectionPending = false;
  if (typeof window === 'undefined') return;
  clearLegacyStoredAccessToken();
  window.localStorage.removeItem(SESSION_HINT_STORAGE_KEY);
  window.localStorage.removeItem(SESSION_ROLE_STORAGE_KEY);
  window.localStorage.removeItem(CONTEXT_SELECTION_PENDING_STORAGE_KEY);
  emitAuthSessionChange('logout');
};
