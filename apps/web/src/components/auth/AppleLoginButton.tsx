'use client';

import AppleLogin from 'react-apple-login';
import type { OAuthAuthAction, OAuthDesiredRole, OAuthLoginResult } from '@/lib/auth/oauthLogin';
import { oauthLogin } from '@/lib/auth/oauthLogin';

type AppleAuthorization = {
  id_token?: string;
};

type AppleLoginResponse = {
  authorization?: AppleAuthorization;
  id_token?: string;
};

type AppleLoginButtonProps = {
  onAuthenticated: (result: OAuthLoginResult) => Promise<void> | void;
  onError: (message: string) => void;
  intendedRole?: OAuthDesiredRole;
  authAction?: OAuthAuthAction;
};

export default function AppleLoginButton({
  onAuthenticated,
  onError,
  intendedRole,
  authAction = 'LOGIN',
}: AppleLoginButtonProps) {
  const clientId = process.env.NEXT_PUBLIC_APPLE_CLIENT_ID;
  const redirectUri =
    process.env.NEXT_PUBLIC_APPLE_REDIRECT_URI ||
    process.env.NEXT_PUBLIC_APPLE_REDIRECT;

  const handleCallback = async (response: AppleLoginResponse) => {
    const idToken = response.authorization?.id_token || response.id_token;
    if (!idToken) {
      onError('Apple no devolvio token de identidad.');
      return;
    }

    try {
      const result = await oauthLogin('apple', idToken, { intendedRole, authAction });
      await onAuthenticated(result);
    } catch {
      onError('No se pudo iniciar sesion con Apple.');
    }
  };

  if (!clientId || !redirectUri) {
    return (
      <button
        type="button"
        disabled
        className="h-11 w-full rounded-full border border-[#CBD5E1] bg-[#F8FAFC] px-4 text-sm font-medium text-[#64748B]"
      >
        Apple no configurado
      </button>
    );
  }

  return (
    <AppleLogin
      clientId={clientId}
      redirectURI={redirectUri}
      callback={handleCallback}
      scope="name email"
      responseType="id_token"
      responseMode="form_post"
      usePopup
      render={(props: { onClick?: () => void }) => (
        <button
          type="button"
          onClick={props.onClick}
          className="h-11 w-full rounded-full border border-[#0E2A47]/20 bg-[#0E2A47] px-4 text-sm font-semibold text-white transition hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0E2A47]/40 focus-visible:ring-offset-2"
        >
          Continuar con Apple
        </button>
      )}
    />
  );
}
