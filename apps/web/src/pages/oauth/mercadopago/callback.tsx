'use client';

import { isAxiosError } from 'axios';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { getMercadoPagoConnectionStatusCopy } from '@/lib/billing/professionalMercadoPagoConnection';
import {
  getProfessionalMercadoPagoConnection,
} from '@/services/professionalMercadoPagoConnection';
import type { ProfessionalMercadoPagoConnection } from '@/types/professionalPaymentProviderConnection';

type ReturnState = 'loading' | 'success' | 'info' | 'error';

const BILLING_DASHBOARD_PATH = '/profesional/dashboard/billing';

const resolveApiMessage = (error: unknown, fallback: string) => {
  if (isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message || fallback;
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return fallback;
};

const isConfigurationError = (error: unknown) =>
  isAxiosError<{ message?: string }>(error)
  && error.response?.status === 503
  && Boolean(error.response?.data?.message?.toLowerCase().includes('falta configurar'));

const resolveReasonCopy = (reason?: string | null) => {
  switch ((reason || '').trim().toLowerCase()) {
    case 'connected':
      return {
        title: 'Cuenta conectada correctamente',
        description: 'Tu cuenta de Mercado Pago ya quedó vinculada y lista para cobrar reservas.',
        tone: 'success' as const,
      };
    case 'access_denied':
      return {
        title: 'Autorización cancelada',
        description: 'Cancelaste la autorización en Mercado Pago antes de terminar la conexión.',
        tone: 'info' as const,
      };
    case 'configuration_error':
      return {
        title: 'Mercado Pago no está configurado todavía',
        description: 'La configuración OAuth del backend o de la app de Mercado Pago no está alineada todavía.',
        tone: 'error' as const,
      };
    case 'state_invalid':
      return {
        title: 'La autorización ya no es válida',
        description: 'El state OAuth es inválido o expiró. Iniciá nuevamente la conexión desde billing.',
        tone: 'error' as const,
      };
    case 'missing_code':
      return {
        title: 'Mercado Pago no devolvió el código de autorización',
        description: 'La autorización volvió incompleta. Volvé a intentar la conexión.',
        tone: 'error' as const,
      };
    case 'auth_required':
      return {
        title: 'Necesitás volver a iniciar sesión',
        description: 'La autorización volvió al backend sin una sesión profesional válida. Iniciá sesión y reintentá.',
        tone: 'error' as const,
      };
    case 'token_exchange_failed':
      return {
        title: 'No pudimos completar la vinculación',
        description: 'Mercado Pago devolvió un error al canjear el código OAuth. Revisá la app OAuth y volvé a intentar.',
        tone: 'error' as const,
      };
    default:
      return {
        title: 'No pudimos completar la conexión',
        description: 'Mercado Pago no confirmó la conexión. Volvé al dashboard para intentar otra vez.',
        tone: 'error' as const,
      };
  }
};

export default function MercadoPagoOAuthCallbackPage() {
  const router = useRouter();
  const [returnState, setReturnState] = useState<ReturnState>('loading');
  const [title, setTitle] = useState('Conectando Mercado Pago');
  const [description, setDescription] = useState('Estamos validando la conexión de tu cuenta. Esto puede tardar unos segundos.');
  const [connection, setConnection] = useState<ProfessionalMercadoPagoConnection | null>(null);
  const processedSignatureRef = useRef<string | null>(null);

  const queryValues = useMemo(() => ({
    result: Array.isArray(router.query.result) ? router.query.result[0] : router.query.result,
    reason: Array.isArray(router.query.reason) ? router.query.reason[0] : router.query.reason,
  }), [router.query.reason, router.query.result]);

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

      const normalizedResult = (queryValues.result || '').trim().toLowerCase();
      const hasCallbackResult = normalizedResult.length > 0;

      try {
        if (!hasCallbackResult) {
          setReturnState('error');
          setTitle('No encontramos una conexión en curso');
          setDescription('Este retorno OAuth no tiene resultado para procesar. Volvé al dashboard y reiniciá la conexión con Mercado Pago.');
          return;
        }

        const nextConnection = await getProfessionalMercadoPagoConnection();

        if (window.location.search) {
          window.history.replaceState(null, '', window.location.pathname);
        }

        setConnection(nextConnection);

        if (nextConnection.connected || nextConnection.status?.toUpperCase() === 'CONNECTED') {
          const statusCopy = getMercadoPagoConnectionStatusCopy(nextConnection);
          setReturnState('success');
          setTitle(statusCopy.title);
          setDescription(statusCopy.description);
          finalizeAndRedirect(1800);
          return;
        }

        const fallbackCopy = resolveReasonCopy(queryValues.reason);
        setReturnState(
          fallbackCopy.tone === 'success'
            ? 'success'
            : fallbackCopy.tone === 'info'
              ? 'info'
              : 'error',
        );
        setTitle(fallbackCopy.title);
        setDescription(nextConnection.lastError?.trim() || fallbackCopy.description);
        if (fallbackCopy.tone === 'info') {
          finalizeAndRedirect(2200);
        }
      } catch (error) {
        const fallbackCopy = resolveReasonCopy(queryValues.reason);
        setReturnState('error');
        setTitle(
          isConfigurationError(error)
            ? 'Mercado Pago no está configurado todavía'
            : fallbackCopy.title,
        );
        setDescription(resolveApiMessage(
          error,
          fallbackCopy.description,
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
