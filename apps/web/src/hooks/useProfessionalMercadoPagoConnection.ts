'use client';

import { isAxiosError } from 'axios';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getMercadoPagoConnectionStatusCopy } from '@/lib/billing/professionalMercadoPagoConnection';
import {
  clearMercadoPagoConnectionAttempt,
  readMercadoPagoConnectionAttempt,
  writeMercadoPagoConnectionAttempt,
} from '@/lib/billing/mercadoPagoConnectionAttempt';
import {
  disconnectProfessionalMercadoPagoConnection,
  getProfessionalMercadoPagoConnection,
  startProfessionalMercadoPagoOAuth,
} from '@/services/professionalMercadoPagoConnection';
import type { ProfessionalMercadoPagoConnection } from '@/types/professionalPaymentProviderConnection';

export type MercadoPagoConnectionBanner = {
  tone: 'info' | 'success' | 'error';
  title: string;
  description: string;
};

const isConfigurationError = (error: unknown) =>
  isAxiosError<{ message?: string }>(error)
  && error.response?.status === 503
  && Boolean(error.response?.data?.message?.toLowerCase().includes('falta configurar'));

const resolveApiMessage = (error: unknown, fallback: string) => {
  if (isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message || fallback;
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return fallback;
};

export function useProfessionalMercadoPagoConnection(enabled: boolean) {
  const [connection, setConnection] = useState<ProfessionalMercadoPagoConnection | null>(null);
  const [banner, setBanner] = useState<MercadoPagoConnectionBanner | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isStartingOAuth, setIsStartingOAuth] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const loadRequestIdRef = useRef(0);
  const isStartingOAuthRef = useRef(false);
  const isDisconnectingRef = useRef(false);

  useEffect(() => {
    if (enabled) return;
    clearMercadoPagoConnectionAttempt();
    loadRequestIdRef.current += 1;
    isStartingOAuthRef.current = false;
    isDisconnectingRef.current = false;
    setConnection(null);
    setBanner(null);
    setIsLoading(false);
    setIsStartingOAuth(false);
    setIsDisconnecting(false);
  }, [enabled]);

  const loadConnection = useCallback(async (options?: { silent?: boolean; fromOAuthAttempt?: boolean }) => {
    const { silent = false, fromOAuthAttempt = false } = options || {};
    const requestId = loadRequestIdRef.current + 1;
    loadRequestIdRef.current = requestId;

    if (!silent) {
      setIsLoading(true);
    }

    try {
      const nextConnection = await getProfessionalMercadoPagoConnection();
      if (loadRequestIdRef.current !== requestId) {
        return null;
      }
      setConnection(nextConnection);

      if (fromOAuthAttempt) {
        const statusCopy = getMercadoPagoConnectionStatusCopy(nextConnection);

        if (nextConnection.connected || nextConnection.status?.toUpperCase() === 'CONNECTED') {
          clearMercadoPagoConnectionAttempt();
          setBanner({
            tone: 'success',
            title: 'Cuenta conectada',
            description: 'Tu cuenta de Mercado Pago ya está lista para cobrar reservas online.',
          });
        } else if (nextConnection.status?.toUpperCase() === 'ERROR') {
          clearMercadoPagoConnectionAttempt();
          setBanner({
            tone: 'error',
            title: 'No pudimos completar la conexión',
            description: nextConnection.lastError?.trim()
              || 'Volvé a intentar la conexión desde esta pantalla.',
          });
        } else {
          setBanner({
            tone: 'info',
            title: statusCopy.title,
            description: 'Volviste del flujo externo. Revisá este estado antes de intentar conectar de nuevo.',
          });
        }
      }

      return nextConnection;
    } catch (error) {
      if (loadRequestIdRef.current !== requestId) {
        return null;
      }
      if (!silent) {
        setBanner({
          tone: 'error',
          title: 'No pudimos cargar tu conexión',
          description: resolveApiMessage(
            error,
            'Intentá nuevamente en unos segundos.',
          ),
        });
      }
      return null;
    } finally {
      if (!silent && loadRequestIdRef.current === requestId) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    void loadConnection();
  }, [enabled, loadConnection]);

  useEffect(() => {
    if (!enabled || !readMercadoPagoConnectionAttempt()) return undefined;

    const handleResume = () => {
      if (typeof document !== 'undefined' && document.hidden) {
        return;
      }
      void loadConnection({ silent: true, fromOAuthAttempt: true });
    };

    void loadConnection({ silent: true, fromOAuthAttempt: true });

    window.addEventListener('focus', handleResume);
    window.addEventListener('pageshow', handleResume);
    document.addEventListener('visibilitychange', handleResume);

    return () => {
      window.removeEventListener('focus', handleResume);
      window.removeEventListener('pageshow', handleResume);
      document.removeEventListener('visibilitychange', handleResume);
    };
  }, [enabled, loadConnection]);

  const startOAuth = useCallback(async () => {
    if (isStartingOAuthRef.current || isDisconnectingRef.current) {
      return;
    }

    isStartingOAuthRef.current = true;
    setIsStartingOAuth(true);
    setBanner({
      tone: 'info',
      title: 'Redirigiendo a Mercado Pago',
      description: 'En unos segundos te llevamos al flujo seguro para conectar tu cuenta.',
    });

    try {
      const response = await startProfessionalMercadoPagoOAuth();
      if (!response.authorizationUrl) {
        throw new Error('No recibimos la URL de autorización de Mercado Pago.');
      }
      writeMercadoPagoConnectionAttempt();
      window.location.assign(response.authorizationUrl);
    } catch (error) {
      setBanner({
        tone: 'error',
        title: isConfigurationError(error)
          ? 'Mercado Pago no está configurado todavía'
          : 'No pudimos iniciar la conexión',
        description: resolveApiMessage(
          error,
          'Intentá nuevamente en unos segundos.',
        ),
      });
    } finally {
      isStartingOAuthRef.current = false;
      setIsStartingOAuth(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    if (isDisconnectingRef.current || isStartingOAuthRef.current) {
      return;
    }

    isDisconnectingRef.current = true;
    setIsDisconnecting(true);
    setBanner(null);

    try {
      const nextConnection = await disconnectProfessionalMercadoPagoConnection();
      clearMercadoPagoConnectionAttempt();
      setConnection(nextConnection);
      setBanner({
        tone: 'success',
        title: 'Cuenta desconectada',
        description: 'Podés volver a conectar tu cuenta de Mercado Pago cuando quieras.',
      });
    } catch (error) {
      setBanner({
        tone: 'error',
        title: 'No pudimos desconectar la cuenta',
        description: resolveApiMessage(
          error,
          'Intentá nuevamente en unos segundos.',
        ),
      });
    } finally {
      isDisconnectingRef.current = false;
      setIsDisconnecting(false);
    }
  }, []);

  return {
    connection,
    banner,
    isLoading,
    isStartingOAuth,
    isDisconnecting,
    startOAuth,
    disconnect,
    reloadConnection: loadConnection,
    dismissBanner: () => setBanner(null),
  };
}
