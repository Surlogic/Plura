import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as AuthSession from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import { oauthLoginWithAuthorizationCode, type OAuthAuthAction } from '../services/oauth';
import { setProfessionalSession } from '../services/session';

WebBrowser.maybeCompleteAuthSession();

type AuthRole = 'cliente' | 'profesional';

type UseGoogleOAuthOptions = {
  role: AuthRole;
  authAction: OAuthAuthAction;
  refreshProfile: () => Promise<unknown>;
  onSuccess: () => Promise<void>;
  onError: (message: string) => void;
};

const GOOGLE_AUTH_WARMUP_URL = 'https://accounts.google.com/o/oauth2/v2/auth';

export function useGoogleOAuth({
  role,
  authAction,
  refreshProfile,
  onSuccess,
  onError,
}: UseGoogleOAuthOptions) {
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);

  const refreshProfileRef = useRef(refreshProfile);
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);

  refreshProfileRef.current = refreshProfile;
  onSuccessRef.current = onSuccess;
  onErrorRef.current = onError;

  const isExpoGo = Constants.appOwnership === 'expo';
  const expoClientId = process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID || process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '';
  const androidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '';
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '';
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '';

  const redirectUri = useMemo(
    () => AuthSession.makeRedirectUri({
      scheme: 'plura',
    }),
    [],
  );

  const [googleRequest, googleResponse, promptGoogleAuth] = Google.useAuthRequest({
    clientId: expoClientId,
    androidClientId,
    iosClientId,
    webClientId,
    scopes: ['openid', 'profile', 'email'],
    responseType: AuthSession.ResponseType.Code,
    redirectUri,
  });

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const warmUpBrowser = async () => {
      try {
        await WebBrowser.warmUpAsync();
        await WebBrowser.mayInitWithUrlAsync(GOOGLE_AUTH_WARMUP_URL);
      } catch {
        // Si Custom Tabs no soporta warmup, el flujo sigue funcionando igual.
      }
    };

    void warmUpBrowser();

    return () => {
      void WebBrowser.coolDownAsync().catch(() => undefined);
    };
  }, []);

  useEffect(() => {
    const handleGoogleResponse = async () => {
      if (!googleResponse) return;

      if (googleResponse.type !== 'success') {
        if (googleResponse.type !== 'dismiss' && googleResponse.type !== 'cancel') {
          onErrorRef.current('No se pudo completar el acceso con Google.');
        }
        setIsGoogleSubmitting(false);
        return;
      }

      const authorizationCode = googleResponse.params?.code;
      const codeVerifier = googleRequest?.codeVerifier;

      if (!authorizationCode || !codeVerifier) {
        onErrorRef.current('No se recibió autorización válida de Google.');
        setIsGoogleSubmitting(false);
        return;
      }

      try {
        const result = await oauthLoginWithAuthorizationCode(
          'google',
          authorizationCode,
          codeVerifier,
          redirectUri,
          {
            desiredRole: role === 'profesional' ? 'PROFESSIONAL' : 'USER',
            authAction,
          },
        );

        if (!result.accessToken || !result.refreshToken) {
          onErrorRef.current('Google autenticó, pero el backend no devolvió una sesión completa.');
          return;
        }

        await setProfessionalSession({
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        });
        await refreshProfileRef.current();
        await onSuccessRef.current();
      } catch (error: any) {
        const backendMessage =
          error?.response?.data?.message ||
          (typeof error?.response?.data === 'string' ? error.response.data : null);

        onErrorRef.current(
          backendMessage
            || (authAction === 'REGISTER'
              ? 'No se pudo registrar con Google.'
              : 'No se pudo iniciar sesión con Google.'),
        );
      } finally {
        setIsGoogleSubmitting(false);
      }
    };

    void handleGoogleResponse();
  }, [authAction, googleResponse, googleRequest, redirectUri, role]);

  const handleGoogleAuth = async () => {
    const hasExpoGoConfig = isExpoGo && Boolean(expoClientId);
    const hasNativeConfig = !isExpoGo && Boolean(androidClientId || iosClientId);

    if (!hasExpoGoConfig && !hasNativeConfig) {
      onErrorRef.current(
        isExpoGo
          ? 'Falta EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID para Expo Go.'
          : 'Falta EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID / EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID para build nativa.',
      );
      return;
    }

    onErrorRef.current('');
    setIsGoogleSubmitting(true);

    try {
      const windowFeatures = Platform.OS === 'web' && typeof window !== 'undefined'
        ? {
            width: window.screen.availWidth || window.innerWidth,
            height: window.screen.availHeight || window.innerHeight,
            left: 0,
            top: 0,
            location: 'yes',
            resizable: 'yes',
            scrollbars: 'yes',
            toolbar: 'yes',
          }
        : undefined;

      const result = await promptGoogleAuth({
        createTask: true,
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
        showInRecents: true,
        windowFeatures,
        windowName: 'plura-google-auth',
      });

      if (result.type !== 'success') {
        setIsGoogleSubmitting(false);
      }
    } catch {
      onErrorRef.current('No se pudo abrir el acceso con Google.');
      setIsGoogleSubmitting(false);
    }
  };

  return {
    googleRequest,
    isGoogleSubmitting,
    handleGoogleAuth,
  };
}
