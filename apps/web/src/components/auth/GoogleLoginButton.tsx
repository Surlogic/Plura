'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { isAxiosError } from 'axios';
import type {
  OAuthAuthAction,
  OAuthDesiredRole,
  OAuthLoginResult,
} from '@/lib/auth/oauthLogin';
import { oauthLogin } from '@/lib/auth/oauthLogin';
import type { AuthContextType } from '@/lib/auth/contexts';
import {
  GOOGLE_AUTH_URL,
  GOOGLE_OAUTH_CHANNEL,
  buildGoogleOAuthReturnTo,
  clearGoogleOAuthRedirectResult,
  clearGoogleOAuthRequest,
  createCodeChallenge,
  createGoogleOAuthRequest,
  getGoogleOAuthAppOrigin,
  getGoogleOAuthRedirectResult,
  getGoogleOAuthRedirectUri,
  getGoogleOAuthRequest,
  saveGoogleOAuthRequest,
  type GoogleOAuthMode,
  type GoogleOAuthResultPayload,
} from '@/lib/auth/googleOAuth';

type GoogleLoginButtonProps = {
  onAuthenticated: (result: OAuthLoginResult) => Promise<void> | void;
  onError: (message: string) => void;
  intendedRole?: OAuthDesiredRole;
  authAction?: OAuthAuthAction;
  desiredContext?: AuthContextType;
  buttonLabel?: string;
  loadingLabel?: string;
  onLoadingChange?: (isLoading: boolean) => void;
  mode?: GoogleOAuthMode;
};

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
const OAUTH_RESULT_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutos
const OAUTH_EXCHANGE_TIMEOUT_MS = 35 * 1000;
const OAUTH_AUTHENTICATED_CALLBACK_TIMEOUT_MS = 20 * 1000;

const normalizeOrigin = (value: string) => value.trim().replace(/\/+$/, '');

const resolveApiErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message.trim()) {
    if (error.message === 'OAUTH_EXCHANGE_TIMEOUT') {
      return 'Google respondió, pero el servidor tardó demasiado en completar el acceso. Intentá nuevamente.';
    }
    if (error.message === 'OAUTH_CALLBACK_TIMEOUT') {
      return 'Google inició sesión, pero la pantalla tardó demasiado en continuar. Recargá e intentá nuevamente.';
    }
  }

  if (isAxiosError(error)) {
    const responseData = error.response?.data;

    if (typeof responseData === 'string' && responseData.trim()) {
      return responseData.trim();
    }

    if (responseData && typeof responseData === 'object') {
      const payload = responseData as {
        message?: unknown;
        detail?: unknown;
        error?: unknown;
      };

      if (typeof payload.message === 'string' && payload.message.trim()) {
        return payload.message.trim();
      }
      if (typeof payload.detail === 'string' && payload.detail.trim()) {
        return payload.detail.trim();
      }
      if (typeof payload.error === 'string' && payload.error.trim()) {
        return payload.error.trim();
      }
    }
  }

  return fallback;
};

const withTimeout = async <T,>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string,
): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(errorMessage)), timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};

export default function GoogleLoginButton({
  onAuthenticated,
  onError,
  intendedRole,
  authAction = 'LOGIN',
  desiredContext,
  buttonLabel,
  loadingLabel,
  onLoadingChange,
  mode = 'popup',
}: GoogleLoginButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const popupRef = useRef<Window | null>(null);
  const handledResultRef = useRef(false);
  const resultTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearResultTimeout = useCallback(() => {
    if (resultTimeoutRef.current) {
      clearTimeout(resultTimeoutRef.current);
      resultTimeoutRef.current = null;
    }
  }, []);

  const finishLoading = useCallback(() => {
    onLoadingChange?.(false);
    setIsLoading(false);
  }, [onLoadingChange]);

  const resetPendingFlow = useCallback(() => {
    clearResultTimeout();
    popupRef.current = null;
    finishLoading();
  }, [clearResultTimeout, finishLoading]);

  useEffect(() => {
    onLoadingChange?.(isLoading);
  }, [isLoading, onLoadingChange]);

  const handleOAuthResult = useCallback(async (payload: GoogleOAuthResultPayload) => {
    if (handledResultRef.current) return;
    handledResultRef.current = true;

    setIsLoading(true);
    clearResultTimeout();
    popupRef.current = null;

    const pendingRequest = getGoogleOAuthRequest();
    clearGoogleOAuthRedirectResult();
    clearGoogleOAuthRequest();

    if (!pendingRequest) {
      onError('La sesión OAuth expiró o no es válida. Intentá nuevamente.');
      finishLoading();
      return;
    }

    if (payload.error || !payload.code) {
      onError(
        payload.error === 'access_denied'
          ? 'Acceso denegado por el usuario.'
          : 'No se recibió autorización de Google.',
      );
      finishLoading();
      return;
    }

    if (!payload.state || payload.state !== pendingRequest.state) {
      onError('No se pudo validar el estado de seguridad OAuth.');
      finishLoading();
      return;
    }

    const resolvedIntendedRole = pendingRequest.intendedRole ?? intendedRole;
    const resolvedAuthAction = pendingRequest.authAction ?? authAction;

    if (resolvedAuthAction === 'REGISTER' && !resolvedIntendedRole) {
      onError('No se pudo confirmar si el registro es cliente o profesional. Intentá nuevamente.');
      finishLoading();
      return;
    }

    try {
      const redirectUri = pendingRequest.redirectUri || getGoogleOAuthRedirectUri();

      const result = await withTimeout(
        oauthLogin('google', payload.code, {
          grantType: 'authorization_code',
          codeVerifier: pendingRequest.codeVerifier,
          redirectUri,
          intendedRole: resolvedIntendedRole,
          authAction: resolvedAuthAction,
          desiredContext: resolvedAuthAction === 'LOGIN' ? desiredContext : undefined,
        }),
        OAUTH_EXCHANGE_TIMEOUT_MS,
        'OAUTH_EXCHANGE_TIMEOUT',
      );

      await withTimeout(
        Promise.resolve(onAuthenticated(result)),
        OAUTH_AUTHENTICATED_CALLBACK_TIMEOUT_MS,
        'OAUTH_CALLBACK_TIMEOUT',
      );
    } catch (error) {
      onError(resolveApiErrorMessage(error, resolvedAuthAction === 'REGISTER' ? 'No se pudo completar el registro con Google.' : 'No se pudo iniciar sesión con Google.'));
    } finally {
      finishLoading();
    }
  }, [authAction, desiredContext, intendedRole, onAuthenticated, onError, clearResultTimeout, finishLoading]);

  useEffect(() => {
    if (mode !== 'redirect') return;
    const redirectPayload = getGoogleOAuthRedirectResult();
    if (!redirectPayload) return;
    void handleOAuthResult(redirectPayload);
  }, [mode, handleOAuthResult]);

  useEffect(() => {
    if (mode !== 'popup') return;

    const handleMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;

      const payload = event.data as Partial<GoogleOAuthResultPayload> | undefined;
      if (payload?.type !== 'GOOGLE_OAUTH_RESULT') return;

      await handleOAuthResult({
        type: 'GOOGLE_OAUTH_RESULT',
        code: typeof payload.code === 'string' ? payload.code : null,
        state: typeof payload.state === 'string' ? payload.state : null,
        error: typeof payload.error === 'string' ? payload.error : null,
        ts: typeof payload.ts === 'number' ? payload.ts : Date.now(),
      });
    };

    const channel =
      typeof window !== 'undefined' && typeof window.BroadcastChannel !== 'undefined'
        ? new window.BroadcastChannel(GOOGLE_OAUTH_CHANNEL)
        : null;

    const handleChannelMessage = async (event: MessageEvent<GoogleOAuthResultPayload>) => {
      const payload = event.data;
      if (!payload || payload.type !== 'GOOGLE_OAUTH_RESULT') return;
      await handleOAuthResult(payload);
    };

    window.addEventListener('message', handleMessage);
    channel?.addEventListener('message', handleChannelMessage);

    return () => {
      clearResultTimeout();
      window.removeEventListener('message', handleMessage);
      channel?.removeEventListener('message', handleChannelMessage);
      channel?.close();
    };
  }, [mode, handleOAuthResult, clearResultTimeout]);

  if (!GOOGLE_CLIENT_ID) {
    return (
      <button
        type="button"
        disabled
        className="h-11 w-full rounded-full border border-[color:var(--border-soft)] bg-[color:var(--surface-soft)] px-4 text-sm font-medium text-[color:var(--ink-muted)]"
      >
        Google no configurado
      </button>
    );
  }

  const handleClick = async () => {
    if (isLoading) return;
    if (authAction === 'REGISTER' && !intendedRole) {
      onError('No se pudo confirmar si el registro es cliente o profesional. Intentá nuevamente.');
      return;
    }

    const appOrigin = getGoogleOAuthAppOrigin();
    if (mode === 'redirect' && appOrigin && normalizeOrigin(window.location.origin) !== normalizeOrigin(appOrigin)) {
      const returnPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      window.location.assign(buildGoogleOAuthReturnTo(returnPath));
      return;
    }

    setIsLoading(true);
    handledResultRef.current = false;
    clearResultTimeout();

    const returnPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    const returnTo = buildGoogleOAuthReturnTo(returnPath);
    const redirectUri = getGoogleOAuthRedirectUri();
    const oauthRequest = createGoogleOAuthRequest({
      mode,
      returnTo,
      redirectUri,
      intendedRole,
      authAction,
    });
    saveGoogleOAuthRequest(oauthRequest);

    let codeChallenge = '';
    try {
      codeChallenge = await createCodeChallenge(oauthRequest.codeVerifier);
    } catch {
      clearGoogleOAuthRequest();
      setIsLoading(false);
      onError('No se pudo preparar OAuth seguro (PKCE).');
      return;
    }

    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      include_granted_scopes: 'true',
      prompt: 'select_account',
      state: oauthRequest.state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    const oauthUrl = `${GOOGLE_AUTH_URL}?${params.toString()}`;

    if (mode === 'redirect') {
      window.location.assign(oauthUrl);
      return;
    }

    const width = Math.max(960, Math.floor(window.screen.availWidth * 0.92));
    const height = Math.max(720, Math.floor(window.screen.availHeight * 0.9));
    const left = window.screenX + Math.max(0, Math.floor((window.outerWidth - width) / 2));
    const top = window.screenY + Math.max(0, Math.floor((window.outerHeight - height) / 2));

    const popup = window.open(
      oauthUrl,
      'google-oauth',
      `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`,
    );

    if (!popup) {
      clearGoogleOAuthRequest();
      setIsLoading(false);
      onError('El navegador bloqueó la ventana emergente. Permití popups para este sitio.');
      return;
    }

    popupRef.current = popup;

    try {
      popup.focus();
    } catch {
      // No-op
    }

    resultTimeoutRef.current = setTimeout(() => {
      if (handledResultRef.current) return;

      handledResultRef.current = true;
      clearGoogleOAuthRequest();
      resetPendingFlow();
      onError('La autenticación con Google no se completó a tiempo. Intentá nuevamente.');
    }, OAUTH_RESULT_TIMEOUT_MS);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isLoading}
      className="flex h-11 w-full items-center justify-center gap-3 rounded-full border border-[color:var(--border-soft)] bg-white px-4 text-sm font-medium text-[color:var(--ink)] shadow-[var(--shadow-card)] transition hover:bg-[color:var(--surface-soft)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-70"
      aria-busy={isLoading}
    >
      <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
        <path
          fill="#EA4335"
          d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
        />
        <path
          fill="#4285F4"
          d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
        />
        <path
          fill="#FBBC05"
          d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
        />
        <path
          fill="#34A853"
          d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
        />
      </svg>
      {isLoading ? (
        <span
          className="plura-button-spinner -ml-1 inline-block h-4 w-4 shrink-0 rounded-full"
          aria-hidden="true"
        />
      ) : null}
      {isLoading ? (loadingLabel || 'Conectando...') : (buttonLabel || 'Iniciar sesión con Google')}
    </button>
  );
}
