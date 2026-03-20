'use client';

import { isAxiosError } from 'axios';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import {
  clearMercadoPagoConnectionAttempt,
  hasMercadoPagoConnectionAttempt,
} from '@/lib/billing/mercadoPagoConnectionAttempt';
import { getMercadoPagoConnectionStatusCopy } from '@/lib/billing/professionalMercadoPagoConnection';
import {
  completeProfessionalMercadoPagoOAuthCallback,
  getProfessionalMercadoPagoConnection,
} from '@/services/professionalMercadoPagoConnection';
import type { ProfessionalMercadoPagoConnection } from '@/types/professionalPaymentProviderConnection';

type ReturnState = 'loading' | 'success' | 'info' | 'error';

const BILLING_DASHBOARD_PATH = '/profesional/dashboard/billing';

const resolveProviderReturnMessage = (params: {
  error?: string | null;
  errorDescription?: string | null;
}) => {
  const providerError = params.error?.trim().toLowerCase();
  const providerDescription = params.errorDescription?.trim();

  if (providerError === 'access_denied') {
    return providerDescription || 'Cancelaste la autorización en Mercado Pago antes de terminar la conexión.';
  }

  if (providerError === 'invalid_request') {
    return providerDescription || 'Mercado Pago devolvió una respuesta incompleta. Volvé a intentar la conexión.';
  }

  return providerDescription || 'Mercado Pago no confirmó la conexión. Volvé al dashboard para intentar otra vez.';
};

const resolveApiMessage = (error: unknown, fallback: string) => {
  if (isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message || fallback;
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return fallback;
};

export default function MercadoPagoOAuthCallbackPage() {
  const router = useRouter();
  const [returnState, setReturnState] = useState<ReturnState>('loading');
  const [title, setTitle] = useState('Conectando Mercado Pago');
  const [description, setDescription] = useState('Estamos validando la conexión de tu cuenta. Esto puede tardar unos segundos.');
  const [connection, setConnection] = useState<ProfessionalMercadoPagoConnection | null>(null);
  const processedSignatureRef = useRef<string | null>(null);

  const queryValues = useMemo(() => ({
    code: Array.isArray(router.query.code) ? router.query.code[0] : router.query.code,
    state: Array.isArray(router.query.state) ? router.query.state[0] : router.query.state,
    error: Array.isArray(router.query.error) ? router.query.error[0] : router.query.error,
    errorDescription: Array.isArray(router.query.error_description)
      ? router.query.error_description[0]
      : router.query.error_description,
  }), [router.query.code, router.query.error, router.query.error_description, router.query.state]);

  useEffect(() => {
    if (!router.isReady) return;

    const querySignature = JSON.stringify(queryValues);
    if (processedSignatureRef.current === querySignature) {
      return;
    }
    processedSignatureRef.current = querySignature;

    let redirectTimer: number | null = null;

    const finalizeAndRedirect = (delayMs: number) => {
      redirectTimer = window.setTimeout(() => {
        void router.replace(BILLING_DASHBOARD_PATH);
      }, delayMs);
    };

    const run = async () => {
      setReturnState('loading');
      setTitle('Conectando Mercado Pago');
      setDescription('Estamos validando la conexión de tu cuenta. Esto puede tardar unos segundos.');
      setConnection(null);

      const hasProviderParams = Boolean(
        queryValues.code || queryValues.state || queryValues.error || queryValues.errorDescription,
      );

      try {
        if (!hasProviderParams && hasMercadoPagoConnectionAttempt()) {
          setDescription('Volviste del flujo externo. Estamos revisando si la conexión ya quedó confirmada.');
        }

        const nextConnection = hasProviderParams
          ? await completeProfessionalMercadoPagoOAuthCallback(queryValues)
          : hasMercadoPagoConnectionAttempt()
            ? await getProfessionalMercadoPagoConnection()
            : null;

        if (window.location.search) {
          window.history.replaceState(null, '', window.location.pathname);
        }

        if (!nextConnection) {
          clearMercadoPagoConnectionAttempt();
          setReturnState('error');
          setTitle('No encontramos una conexión en curso');
          setDescription('No detectamos una autorización pendiente. Volvé al dashboard para iniciar nuevamente la conexión con Mercado Pago.');
          return;
        }

        setConnection(nextConnection);
        const statusCopy = getMercadoPagoConnectionStatusCopy(nextConnection);
        setTitle(statusCopy.title);
        setDescription(statusCopy.description);

        if (nextConnection.connected || nextConnection.status?.toUpperCase() === 'CONNECTED') {
          clearMercadoPagoConnectionAttempt();
          setReturnState('success');
          finalizeAndRedirect(1800);
          return;
        }

        if (nextConnection.status?.toUpperCase() === 'ERROR') {
          clearMercadoPagoConnectionAttempt();
          setReturnState('error');
          setDescription(nextConnection.lastError?.trim() || statusCopy.description);
          return;
        }

        clearMercadoPagoConnectionAttempt();
        setReturnState('info');
        setDescription('Volviste del flujo de Mercado Pago. Revisamos tu cuenta y ahora te devolvemos al dashboard para que continúes desde ahí.');
        finalizeAndRedirect(2200);
      } catch (error) {
        clearMercadoPagoConnectionAttempt();
        setReturnState('error');
        setTitle('No pudimos completar la conexión');
        setDescription(resolveApiMessage(
          error,
          resolveProviderReturnMessage(queryValues),
        ));
      }
    };

    void run();

    return () => {
      if (redirectTimer !== null) {
        window.clearTimeout(redirectTimer);
      }
    };
  }, [queryValues, router, router.isReady]);

  const toneClassName = returnState === 'success'
    ? 'border-[#BFEDE7] bg-[#F0FDFA] text-[#0F766E]'
    : returnState === 'error'
      ? 'border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C]'
      : returnState === 'info'
        ? 'border-[#D9E6F2] bg-[#F8FBFF] text-[#1D4ED8]'
        : 'border-[#E2E7EC] bg-white text-[#0E2A47]';

  return (
    <main className="flex min-h-screen items-center justify-center bg-[color:var(--background)] px-4 py-10">
      <Card className="w-full max-w-[680px] border-white/70 bg-white/95 p-6 shadow-[0_18px_40px_rgba(15,23,42,0.12)] sm:p-8">
        <div className="space-y-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#94A3B8]">
              Mercado Pago
            </p>
            <h1 className="mt-3 text-[2rem] font-semibold tracking-[-0.04em] text-[#0E2A47]">
              {title}
            </h1>
            <p className="mt-3 text-sm text-[#64748B]">
              {description}
            </p>
          </div>

          <div className={`rounded-[20px] border px-4 py-4 ${toneClassName}`}>
            <p className="text-sm font-semibold">
              {returnState === 'loading'
                ? 'Validando conexión...'
                : returnState === 'success'
                  ? 'Cuenta conectada correctamente'
                  : returnState === 'info'
                    ? 'Actualizando estado'
                    : 'Conexión no completada'}
            </p>
            <p className="mt-2 text-sm opacity-90">
              {returnState === 'loading'
                ? 'No cierres esta ventana mientras terminamos de verificar tu cuenta.'
                : returnState === 'success'
                  ? 'En un momento te llevamos de vuelta al dashboard profesional.'
                  : returnState === 'info'
                    ? 'Terminamos de revisar el estado y te vamos a devolver al dashboard.'
                    : 'Podés volver al dashboard profesional para revisar el estado o intentar otra vez.'}
            </p>
          </div>

          {connection?.providerAccountId ? (
            <div className="rounded-[20px] border border-[#E2E7EC] bg-[#F8FAFC] px-4 py-4 text-sm text-[#475569]">
              <p>
                Cuenta conectada:{' '}
                <span className="font-semibold text-[#0E2A47]">
                  {connection.providerAccountId}
                </span>
              </p>
            </div>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              href={BILLING_DASHBOARD_PATH}
              variant="primary"
              size="lg"
            >
              {returnState === 'loading' ? 'Ir al dashboard igualmente' : 'Volver al dashboard'}
            </Button>
            {returnState === 'error' ? (
              <Button
                href={BILLING_DASHBOARD_PATH}
                variant="secondary"
                size="lg"
              >
                Reintentar desde billing
              </Button>
            ) : null}
          </div>

          {returnState !== 'error' ? (
            <p className="text-xs text-[#64748B]">
              Si no te redirigimos automáticamente, podés volver manualmente al dashboard desde este botón.
            </p>
          ) : null}
        </div>
      </Card>
    </main>
  );
}
