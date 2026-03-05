'use client';

import { useEffect, useRef, useState } from 'react';
import type { OAuthLoginResult } from '@/lib/auth/oauthLogin';
import { oauthLogin } from '@/lib/auth/oauthLogin';

type GoogleLoginButtonProps = {
  onAuthenticated: (result: OAuthLoginResult) => Promise<void> | void;
  onError: (message: string) => void;
};

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_OAUTH_STORAGE_KEY = 'plura_google_oauth_result';

export default function GoogleLoginButton({
  onAuthenticated,
  onError,
}: GoogleLoginButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const popupRef = useRef<Window | null>(null);
  const handledResultRef = useRef(false);

  useEffect(() => {
    const handleOAuthResult = async (accessToken?: string | null, error?: string | null) => {
      if (handledResultRef.current) return;
      handledResultRef.current = true;
      localStorage.removeItem(GOOGLE_OAUTH_STORAGE_KEY);

      if (error || !accessToken) {
        onError(error === 'access_denied'
          ? 'Acceso denegado por el usuario.'
          : 'No se recibió token de Google.');
        setIsLoading(false);
        return;
      }

      try {
        const result = await oauthLogin('google', accessToken);
        await onAuthenticated(result);
      } catch {
        onError('No se pudo iniciar sesion con Google.');
      } finally {
        setIsLoading(false);
      }
    };

    const handleMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== 'GOOGLE_OAUTH_RESULT') return;
      await handleOAuthResult(event.data?.accessToken, event.data?.error);
    };

    const handleStorage = async (event: StorageEvent) => {
      if (event.key !== GOOGLE_OAUTH_STORAGE_KEY || !event.newValue) return;
      try {
        const payload = JSON.parse(event.newValue) as {
          type?: string;
          accessToken?: string | null;
          error?: string | null;
        };
        if (payload.type !== 'GOOGLE_OAUTH_RESULT') return;
        await handleOAuthResult(payload.accessToken, payload.error);
      } catch {
        // Ignore malformed storage payloads.
      }
    };

    window.addEventListener('message', handleMessage);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('storage', handleStorage);
    };
  }, [onAuthenticated, onError]);

  if (!GOOGLE_CLIENT_ID) {
    return (
      <button
        type="button"
        disabled
        className="h-11 w-full rounded-full border border-[#CBD5E1] bg-[#F8FAFC] px-4 text-sm font-medium text-[#64748B]"
      >
        Google no configurado
      </button>
    );
  }

  const handleClick = () => {
    setIsLoading(true);
    handledResultRef.current = false;
    localStorage.removeItem(GOOGLE_OAUTH_STORAGE_KEY);

    const redirectUri = `${window.location.origin}/oauth/callback`;
    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: 'token',
      scope: 'openid email profile',
      include_granted_scopes: 'true',
      prompt: 'select_account',
    });

    const width = 500;
    const height = 600;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const popup = window.open(
      `${GOOGLE_AUTH_URL}?${params.toString()}`,
      'google-oauth',
      `width=${width},height=${height},left=${left},top=${top},scrollbars=yes`,
    );

    if (!popup) {
      onError('El navegador bloqueó la ventana emergente. Permití popups para este sitio.');
      setIsLoading(false);
      return;
    }

    popupRef.current = popup;

    // Reset loading if popup is closed without completing
    const checkClosed = setInterval(() => {
      try {
        if (popup.closed) {
          clearInterval(checkClosed);
          if (!handledResultRef.current) {
            setIsLoading(false);
          }
        }
      } catch {
        // COOP may block window.closed while popup is cross-origin. Ignore and wait for callback.
      }
    }, 500);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isLoading}
      className="flex h-11 w-full items-center justify-center gap-3 rounded-full border border-[#CBD5E1] bg-white px-4 text-sm font-medium text-[#3c4043] shadow-sm transition hover:bg-[#F8FAFC] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4285f4]/35 disabled:cursor-not-allowed disabled:opacity-70"
    >
      <svg width="18" height="18" viewBox="0 0 48 48">
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
      {isLoading ? 'Conectando...' : 'Iniciar sesion con Google'}
    </button>
  );
}
