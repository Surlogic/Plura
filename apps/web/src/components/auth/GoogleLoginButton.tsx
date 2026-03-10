'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { isAxiosError } from 'axios';
import type {
  OAuthAuthAction,
  OAuthDesiredRole,
  OAuthLoginResult,
} from '@/lib/auth/oauthLogin';
import { oauthLogin } from '@/lib/auth/oauthLogin';
import {
  GOOGLE_AUTH_URL,
  GOOGLE_OAUTH_CHANNEL,
  clearGoogleOAuthRequest,
  createCodeChallenge,
  createGoogleOAuthRequest,
  getGoogleOAuthRequest,
  saveGoogleOAuthRequest,
  type GoogleOAuthResultPayload,
} from '@/lib/auth/googleOAuth';

type GoogleLoginButtonProps = {
  onAuthenticated: (result: OAuthLoginResult) => Promise<void> | void;
  onError: (message: string) => void;
  intendedRole?: OAuthDesiredRole;
  authAction?: OAuthAuthAction;
};

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
const OAUTH_RESULT_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutos

const resolveApiErrorMessage = (error: unknown, fallback: string) => {
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

export default function GoogleLoginButton({
  onAuthenticated,
  onError,
  intendedRole,
  authAction = 'LOGIN',
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

  const resetPendingFlow = useCallback(() => {
    clearResultTimeout();
    popupRef.current = null;
    setIsLoading(false);
  }, [clearResultTimeout]);

  useEffect(() => {
    const handleOAuthResult = async (payload: GoogleOAuthResultPayload) => {
      if (handledResultRef.current) return;
      handledResultRef.current = true;

      clearResultTimeout();
      popupRef.current = null;

      const pendingRequest = getGoogleOAuthRequest();
      clearGoogleOAuthRequest();

      if (!pendingRequest) {
        onError('La sesión OAuth expiró o no es válida. Intentá nuevamente.');
        setIsLoading(false);
        return;
      }

      if (payload.error || !payload.code) {
        onError(
          payload.error === 'access_denied'
            ? 'Acceso denegado por el usuario.'
            : 'No se recibió autorización de Google.',
        );
        setIsLoading(false);
        return;
      }

      if (!payload.state || payload.state !== pendingRequest.state) {
        onError('No se pudo validar el estado de seguridad OAuth.');
        setIsLoading(false);
        return;
      }

      try {
        const redirectUri = `${window.location.origin}/oauth/callback`;

        const result = await oauthLogin('google', payload.code, {
          grantType: 'authorization_code',
          codeVerifier: pendingRequest.codeVerifier,
          redirectUri,
          intendedRole,
          authAction,
        });

        await onAuthenticated(result);
      } catch (error) {
        onError(resolveApiErrorMessage(error, 'No se pudo iniciar sesión con Google.'));
      } finally {
        setIsLoading(false);
      }
    };

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
  }, [authAction, intendedRole, onAuthenticated, onError, clearResultTimeout]);

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

    setIsLoading(true);
    handledResultRef.current = false;
    clearResultTimeout();

    const oauthRequest = createGoogleOAuthRequest();
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

    const redirectUri = `${window.location.origin}/oauth/callback`;

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

    const width = 500;
    const height = 600;
    const left = window.screenX + Math.max(0, (window.outerWidth - width) / 2);
    const top = window.screenY + Math.max(0, (window.outerHeight - height) / 2);

    const popup = window.open(
      `${GOOGLE_AUTH_URL}?${params.toString()}`,
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
      {isLoading ? 'Conectando...' : 'Iniciar sesión con Google'}
    </button>
  );
}
