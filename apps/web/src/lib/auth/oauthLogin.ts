import api from '@/services/api';
import {
  setAuthAccessToken,
  setAuthContextSelectionPending,
  setKnownAuthSessionRole,
  type KnownAuthSessionRole,
} from '@/services/session';
import {
  fetchAuthMe,
  persistAccessTokenForContext,
  type AuthContextDescriptor,
  type AuthContextType,
} from '@/lib/auth/contexts';

export type OAuthProvider = 'google' | 'apple';
export type OAuthRole = 'USER' | 'PROFESSIONAL' | null;
export type OAuthDesiredRole = Exclude<OAuthRole, null>;
export type OAuthAuthAction = 'LOGIN' | 'REGISTER';

type OAuthUser = {
  id: string;
  email: string;
  fullName: string;
  phoneNumber?: string | null;
  phoneVerified?: boolean;
  createdAt: string;
};

type OAuthResponse = {
  accessToken?: string | null;
  oauthRegistrationPending?: boolean;
  oauthRegistrationToken?: string | null;
  user: OAuthUser;
  activeContext?: AuthContextDescriptor | null;
  contexts?: AuthContextDescriptor[];
  contextSelectionRequired?: boolean;
};

export type OAuthLoginResult = OAuthResponse & {
  role: OAuthRole;
  activeContext?: AuthContextDescriptor | null;
  contexts?: AuthContextDescriptor[];
  contextSelectionRequired?: boolean;
};

type OAuthIntentOptions = {
  intendedRole?: OAuthDesiredRole;
  authAction?: OAuthAuthAction;
  desiredContext?: AuthContextType;
};

type OAuthAuthorizationCodeOptions = OAuthIntentOptions & {
  grantType: 'authorization_code';
  codeVerifier: string;
  redirectUri: string;
};

type OAuthTokenOptions = OAuthIntentOptions & {
  grantType?: 'token';
};

type OAuthLoginOptions = OAuthTokenOptions | OAuthAuthorizationCodeOptions;

const decodeBase64Url = (value: string) => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');

  if (typeof window !== 'undefined' && typeof window.atob === 'function') {
    return window.atob(padded);
  }
  return Buffer.from(padded, 'base64').toString('utf8');
};

const extractRoleFromAccessToken = (accessToken: string | null | undefined): OAuthRole => {
  try {
    if (!accessToken) return null;
    const parts = accessToken.split('.');
    if (parts.length < 2) return null;
    const payloadRaw = decodeBase64Url(parts[1]);
    const payload = JSON.parse(payloadRaw) as { role?: unknown; ctx?: unknown };
    if (payload.ctx === 'CLIENT') return 'USER';
    if (payload.ctx === 'PROFESSIONAL') return 'PROFESSIONAL';
    if (payload.ctx === 'WORKER') return 'USER';
    if (payload.role === 'PROFESSIONAL') return 'PROFESSIONAL';
    if (payload.role === 'USER') return 'USER';
    return null;
  } catch {
    return null;
  }
};

const toKnownSessionRole = (role: OAuthRole): KnownAuthSessionRole | undefined => {
  if (role === 'USER') return 'CLIENT';
  if (role === 'PROFESSIONAL') return 'PROFESSIONAL';
  return undefined;
};

const requiresContextSelection = (
  data: Pick<OAuthResponse, 'activeContext' | 'contexts' | 'contextSelectionRequired'>,
) =>
  Boolean(data.contextSelectionRequired) ||
  (!data.activeContext && Array.isArray(data.contexts) && data.contexts.length > 1);

export async function oauthLogin(
  provider: OAuthProvider,
  tokenOrCode: string,
  options: OAuthLoginOptions = { grantType: 'token' },
): Promise<OAuthLoginResult> {
  const payload =
    options.grantType === 'authorization_code'
      ? {
          provider,
          authorizationCode: tokenOrCode,
          codeVerifier: options.codeVerifier,
          redirectUri: options.redirectUri,
          desiredRole: options.intendedRole,
          authAction: options.authAction,
          desiredContext: options.desiredContext,
        }
      : {
          provider,
          token: tokenOrCode,
          desiredRole: options.intendedRole,
          authAction: options.authAction,
          desiredContext: options.desiredContext,
        };

  const response = await api.post<OAuthResponse>('/auth/oauth', payload);

  const data = response.data;
  if (data.oauthRegistrationPending) {
    return {
      ...data,
      accessToken: null,
      role: null,
      activeContext: null,
      contexts: [],
    };
  }
  const hasContextPayload =
    Object.prototype.hasOwnProperty.call(data, 'activeContext') ||
    Array.isArray(data.contexts) ||
    typeof data.contextSelectionRequired === 'boolean';
  let activeContext: AuthContextDescriptor | null | undefined = data.activeContext;
  let contexts: AuthContextDescriptor[] | undefined = Array.isArray(data.contexts)
    ? data.contexts
    : undefined;
  let contextSelectionRequired = requiresContextSelection(data);

  if (hasContextPayload) {
    if (contextSelectionRequired) {
      activeContext = null;
      setKnownAuthSessionRole(null);
      setAuthContextSelectionPending(true);
      setAuthAccessToken(data.accessToken, null);
    } else if (activeContext) {
      setAuthContextSelectionPending(false);
      persistAccessTokenForContext(data.accessToken, activeContext);
    } else {
      setKnownAuthSessionRole(null);
      setAuthContextSelectionPending(false);
      setAuthAccessToken(data.accessToken, null);
    }
  } else {
    const role = extractRoleFromAccessToken(data.accessToken);
    setAuthAccessToken(data.accessToken, toKnownSessionRole(role));
    try {
      const me = await fetchAuthMe();
      activeContext = me.activeContext ?? null;
      contexts = Array.isArray(me.contexts) ? me.contexts : [];
      contextSelectionRequired = requiresContextSelection({
        activeContext,
        contexts,
      });
      if (contextSelectionRequired) {
        activeContext = null;
        setKnownAuthSessionRole(null);
        setAuthContextSelectionPending(true);
        setAuthAccessToken(data.accessToken, null);
      } else if (activeContext) {
        setAuthContextSelectionPending(false);
        persistAccessTokenForContext(data.accessToken, activeContext);
      } else {
        setKnownAuthSessionRole(null);
        setAuthContextSelectionPending(false);
        setAuthAccessToken(data.accessToken, null);
      }
    } catch {
      // Si /auth/me falla por completar datos pendientes, conservamos compatibilidad por JWT.
    }
  }
  const role = contextSelectionRequired ? null : extractRoleFromAccessToken(data.accessToken);
  return {
    ...data,
    role,
    activeContext,
    contexts,
    contextSelectionRequired,
  };
}
