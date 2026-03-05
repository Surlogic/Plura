import { useEffect } from 'react';
import {
  GOOGLE_OAUTH_CHANNEL,
  type GoogleOAuthResultPayload,
} from '@/lib/auth/googleOAuth';

export default function OAuthCallbackPage() {
  useEffect(() => {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const idToken = params.get('id_token');
    const state = params.get('state');
    const error = params.get('error');
    const payload: GoogleOAuthResultPayload = {
      type: 'GOOGLE_OAUTH_RESULT',
      idToken,
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

    // Elimina tokens del hash para reducir exposición en history/referrer.
    if (window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }

    window.close();
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-sm text-[#64748B]">Completando autenticacion...</p>
    </div>
  );
}
