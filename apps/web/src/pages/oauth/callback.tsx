import { useEffect } from 'react';
import {
  GOOGLE_OAUTH_CHANNEL,
  type GoogleOAuthResultPayload,
} from '@/lib/auth/googleOAuth';

export default function OAuthCallbackPage() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    const error = params.get('error');
    const payload: GoogleOAuthResultPayload = {
      type: 'GOOGLE_OAUTH_RESULT',
      code,
      state,
      error,
      ts: Date.now(),
    };

    if (window.opener) {
      window.opener.postMessage(payload, window.location.origin);
    }

    if (typeof window.BroadcastChannel !== 'undefined') {
      const channel = new window.BroadcastChannel(GOOGLE_OAUTH_CHANNEL);
      channel.postMessage(payload);
      channel.close();
    }

    // Elimina parámetros OAuth de la URL para reducir exposición en history/referrer.
    if (window.location.search) {
      window.history.replaceState(null, '', window.location.pathname);
    }

    const closeTimer = window.setTimeout(() => {
      window.close();
    }, 120);

    return () => {
      window.clearTimeout(closeTimer);
    };
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-sm text-[#64748B]">Completando autenticacion...</p>
    </div>
  );
}
