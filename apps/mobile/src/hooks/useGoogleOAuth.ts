import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import {
  oauthLoginWithAuthorizationCode,
  oauthLoginWithToken,
  type OAuthAuthAction,
  type OAuthResult,
} from '../services/authBackend';
import { setSession } from '../services/session';

WebBrowser.maybeCompleteAuthSession();

type AuthRole = 'cliente' | 'profesional';

type UseGoogleOAuthOptions = {
  role: AuthRole;
  authAction: OAuthAuthAction;
  refreshProfile: () => Promise<unknown>;
  onSuccess: (result: OAuthResult) => Promise<void>;
  onError: (message: string) => void;
};

const GOOGLE_AUTH_WARMUP_URL = 'https://accounts.google.com/o/oauth2/v2/auth';

const readEnvValue = (...values: Array<string | undefined>) => {
  const resolved = values.find((value) => typeof value === 'string' && value.trim().length > 0);
  return resolved?.trim() || '';
};

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
  const genericClientId = readEnvValue(
    process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
    process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID,
  );
  const androidClientId = readEnvValue(
    process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    genericClientId,
  );
  const iosClientId = readEnvValue(
    process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    genericClientId,
  );
  const webClientId = readEnvValue(
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
    process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID,
  );

  const hasGoogleConfig = Platform.OS === 'web'
    ? Boolean(webClientId || genericClientId)
    : Platform.OS === 'android'
      ? Boolean(webClientId) && !isExpoGo
      : Boolean(Platform.select({
          ios: Boolean(iosClientId) && !isExpoGo,
          default: false,
        }));

  const [googleRequest, googleResponse, promptGoogleAuth] = Google.useAuthRequest({
    clientId: genericClientId || webClientId || 'missing-client-id',
    androidClientId: androidClientId || undefined,
    iosClientId: iosClientId || undefined,
    webClientId: webClientId || undefined,
    scopes: ['openid', 'profile', 'email'],
    selectAccount: true,
    shouldAutoExchangeCode: Platform.OS !== 'web',
  });

  const completeGoogleLogin = async (googleToken: string) => {
    const result = await oauthLoginWithToken('google', googleToken, {
      desiredRole: role === 'profesional' ? 'PROFESSIONAL' : 'USER',
      authAction,
    });

    if (!result.accessToken || !result.refreshToken) {
      onErrorRef.current('Google autentico, pero el backend no devolvio una sesion completa.');
      return;
    }

    await setSession({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
    await refreshProfileRef.current();
    await onSuccessRef.current(result);
  };

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    GoogleSignin.configure({
      webClientId: webClientId || undefined,
    });

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

      const googleToken =
        googleResponse.params?.id_token
        || googleResponse.authentication?.idToken
        || googleResponse.params?.access_token
        || googleResponse.authentication?.accessToken
        || null;
      const authorizationCode = googleResponse.params?.code;
      const codeVerifier = googleRequest?.codeVerifier;
      const redirectUri = googleRequest?.redirectUri;

      if (!googleToken && (!authorizationCode || !codeVerifier || !redirectUri)) {
        onErrorRef.current('No se recibio autorizacion valida de Google.');
        setIsGoogleSubmitting(false);
        return;
      }

      try {
        if (googleToken) {
          await completeGoogleLogin(googleToken);
          return;
        }

        const result = await oauthLoginWithAuthorizationCode(
          'google',
          authorizationCode || '',
          codeVerifier || '',
          redirectUri || '',
          {
            desiredRole: role === 'profesional' ? 'PROFESSIONAL' : 'USER',
            authAction,
          },
        );

        if (!result.accessToken || !result.refreshToken) {
          onErrorRef.current('Google autentico, pero el backend no devolvio una sesion completa.');
          return;
        }

        await setSession({
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        });
        await refreshProfileRef.current();
        await onSuccessRef.current(result);
      } catch (error: any) {
        const responseData = error?.response?.data;
        const backendMessage =
          responseData?.message
          || responseData?.detail
          || responseData?.error
          || (typeof responseData === 'string' ? responseData : null);

        onErrorRef.current(
          backendMessage
            || (authAction === 'REGISTER'
              ? 'No se pudo registrar con Google.'
              : 'No se pudo iniciar sesion con Google.'),
        );
      } finally {
        setIsGoogleSubmitting(false);
      }
    };

    void handleGoogleResponse();
  }, [authAction, googleResponse, googleRequest, role]);

  const handleGoogleAuth = async () => {
    if (Platform.OS !== 'web' && isExpoGo) {
      onErrorRef.current(
        Platform.OS === 'android'
          ? 'Google OAuth no funciona en Expo Go. Usa un development build y configura EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID.'
          : 'Google OAuth no funciona en Expo Go. Usa un development build y configura EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID.',
      );
      return;
    }

    if (!hasGoogleConfig) {
      onErrorRef.current(
        Platform.OS === 'android'
          ? 'Falta EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID para Android.'
          : Platform.OS === 'ios'
            ? 'Falta EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID para iOS.'
            : 'Falta EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID.',
      );
      return;
    }

    if (!googleRequest) {
      onErrorRef.current('Google todavia no esta listo. Intenta nuevamente en unos segundos.');
      return;
    }

    onErrorRef.current('');
    setIsGoogleSubmitting(true);

    try {
      if (Platform.OS === 'android') {
        await GoogleSignin.hasPlayServices({
          showPlayServicesUpdateDialog: true,
        });

        if (GoogleSignin.hasPreviousSignIn()) {
          await GoogleSignin.signOut().catch(() => null);
        }

        const signInResult = await GoogleSignin.signIn();
        if (signInResult.type !== 'success') {
          setIsGoogleSubmitting(false);
          return;
        }

        const googleToken = signInResult.data.idToken || (await GoogleSignin.getTokens()).idToken;
        if (!googleToken) {
          onErrorRef.current('Google no devolvio un token valido.');
          setIsGoogleSubmitting(false);
          return;
        }

        await completeGoogleLogin(googleToken);
        setIsGoogleSubmitting(false);
        return;
      }

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
    } catch (error: any) {
      if (error?.code === statusCodes.SIGN_IN_CANCELLED) {
        setIsGoogleSubmitting(false);
        return;
      }
      if (error?.code === statusCodes.IN_PROGRESS) {
        onErrorRef.current('Google ya esta procesando un inicio de sesion.');
        setIsGoogleSubmitting(false);
        return;
      }
      if (error?.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        onErrorRef.current('Google Play Services no esta disponible en este dispositivo.');
        setIsGoogleSubmitting(false);
        return;
      }
      if (String(error?.code || '') === '10' || /DEVELOPER_ERROR/i.test(String(error?.message || ''))) {
        onErrorRef.current(
          'Google Sign-In quedo rechazado por configuracion de Android. Hay que validar el paquete `com.plura.mobile`, la huella SHA del build y el cliente OAuth de Android en Google Cloud.',
        );
        setIsGoogleSubmitting(false);
        return;
      }

      const errorCode = typeof error?.code === 'string' ? error.code : null;
      const errorMessage = typeof error?.message === 'string' ? error.message.trim() : '';

      if (errorCode === 'ERR_WEB_BROWSER_CLOSED' || /cancel/i.test(errorMessage)) {
        setIsGoogleSubmitting(false);
        return;
      }
      if (errorCode === 'ERR_WEB_BROWSER_BLOCKED') {
        onErrorRef.current('Google fue bloqueado por el navegador del sistema. Intenta nuevamente.');
        setIsGoogleSubmitting(false);
        return;
      }
      if (errorCode === 'ERR_WEB_BROWSER_CRYPTO') {
        onErrorRef.current('El dispositivo no pudo preparar el acceso seguro con Google.');
        setIsGoogleSubmitting(false);
        return;
      }
      if (errorCode === 'ERR_WEB_BROWSER_ACTIVITY') {
        onErrorRef.current('Google ya esta procesando un inicio de sesion.');
        setIsGoogleSubmitting(false);
        return;
      }
      onErrorRef.current(
        errorMessage
          ? `No se pudo abrir el acceso con Google. ${errorMessage}`
          : 'No se pudo abrir el acceso con Google.',
      );
      setIsGoogleSubmitting(false);
    }
  };

  return {
    googleRequest,
    isGoogleSubmitting,
    handleGoogleAuth,
  };
}
