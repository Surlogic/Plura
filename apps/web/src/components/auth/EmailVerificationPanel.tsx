'use client';

import { useEffect, useState } from 'react';
import { isAxiosError } from 'axios';
import api from '@/services/api';

type EmailVerificationPanelProps = {
  email?: string | null;
  emailVerified?: boolean;
  onStatusChanged?: () => Promise<void> | void;
  tone?: 'client' | 'professional';
  variant?: 'banner' | 'section';
  title?: string;
  description?: string;
};

const resolveBackendMessage = (error: unknown, fallback: string) => {
  if (isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message || fallback;
  }
  return fallback;
};

export default function EmailVerificationPanel({
  email,
  emailVerified = false,
  onStatusChanged,
  tone = 'client',
  variant = 'section',
  title,
  description,
}: EmailVerificationPanelProps) {
  const [verificationCode, setVerificationCode] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timeoutId = window.setTimeout(() => {
      setCooldownSeconds((current) => Math.max(current - 1, 0));
    }, 1000);
    return () => window.clearTimeout(timeoutId);
  }, [cooldownSeconds]);

  const isProfessionalTone = tone === 'professional';
  const isBanner = variant === 'banner';
  const surfaceClassName = isBanner
    ? isProfessionalTone
      ? 'rounded-[28px] border border-[#D9E4EC] bg-[linear-gradient(135deg,#fffdf7_0%,#f7fbfb_100%)] p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)]'
      : 'rounded-[28px] border border-[color:var(--border-soft)] bg-[linear-gradient(135deg,rgba(255,249,237,0.95),rgba(255,255,255,0.98))] p-6 shadow-[var(--shadow-card)]'
    : 'rounded-[24px] border border-[#E2E7EC] bg-white p-5 shadow-sm';

  const primaryButtonClassName = isProfessionalTone
    ? 'rounded-full bg-[#0E2A47] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#12385f] disabled:cursor-not-allowed disabled:opacity-60'
    : 'rounded-full bg-[#0E2A47] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#12385f] disabled:cursor-not-allowed disabled:opacity-60';

  const secondaryButtonClassName = isProfessionalTone
    ? 'rounded-full border border-[#0E2A47]/10 bg-[#F8FAFC] px-4 py-2 text-sm font-semibold text-[#0E2A47] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60'
    : 'rounded-full border border-[#0E2A47]/10 bg-[#F8FAFC] px-4 py-2 text-sm font-semibold text-[#0E2A47] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60';

  const handleSend = async () => {
    if (isSending || !email || cooldownSeconds > 0) return;
    setMessage(null);
    setError(null);

    try {
      setIsSending(true);
      const response = await api.post<{ message: string; cooldownSeconds?: number | null }>(
        '/auth/verify/email/send',
        {},
      );
      const nextCooldown = Math.max(response.data.cooldownSeconds ?? 0, 0);
      setCooldownSeconds(nextCooldown);
      setMessage(
        nextCooldown > 0
          ? `${response.data.message} Podés reenviar en ${nextCooldown}s.`
          : response.data.message,
      );
      await onStatusChanged?.();
    } catch (requestError) {
      setError(resolveBackendMessage(requestError, 'No se pudo enviar el código.'));
    } finally {
      setIsSending(false);
    }
  };

  const handleConfirm = async () => {
    if (isConfirming || !email) return;
    setMessage(null);
    setError(null);

    try {
      setIsConfirming(true);
      await api.post('/auth/verify/email/confirm', {
        code: verificationCode.trim(),
      });
      setVerificationCode('');
      setCooldownSeconds(0);
      setMessage('Email verificado correctamente.');
      await onStatusChanged?.();
    } catch (requestError) {
      setError(resolveBackendMessage(requestError, 'No se pudo verificar el código.'));
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <section className={surfaceClassName}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className={`text-xs uppercase tracking-[0.24em] ${isProfessionalTone ? 'text-[#64748B]' : 'text-[color:var(--ink-faint)]'}`}>
            Verificación
          </p>
          <h2 className={`text-lg font-semibold ${isProfessionalTone ? 'text-[#0E2A47]' : 'text-[color:var(--ink)]'}`}>
            {title || 'Verificá tu email'}
          </h2>
          <p className={`max-w-2xl text-sm ${isProfessionalTone ? 'text-[#64748B]' : 'text-[color:var(--ink-muted)]'}`}>
            {description || 'Confirmá tu email principal para reforzar la seguridad de tu cuenta y mantener recuperaciones y notificaciones funcionando correctamente.'}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            emailVerified
              ? 'bg-[#1FB6A6]/10 text-[#1FB6A6]'
              : 'bg-[#FFF7ED] text-[#B45309]'
          }`}
        >
          {emailVerified ? 'Verificado' : 'Pendiente'}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className={`text-sm font-semibold ${isProfessionalTone ? 'text-[#0E2A47]' : 'text-[color:var(--ink)]'}`}>
            {email || 'No hay email disponible'}
          </p>
          <p className={`mt-1 text-xs ${isProfessionalTone ? 'text-[#64748B]' : 'text-[color:var(--ink-muted)]'}`}>
            {emailVerified
              ? 'Tu email ya está verificado.'
              : 'Te enviaremos un código de 6 dígitos al email actual de tu cuenta.'}
          </p>
        </div>
      </div>

      {!emailVerified && email ? (
        <div className="mt-5 space-y-4">
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                void handleSend();
              }}
              disabled={isSending || cooldownSeconds > 0}
              className={secondaryButtonClassName}
            >
              {isSending
                ? 'Enviando...'
                : cooldownSeconds > 0
                  ? `Reenviar en ${cooldownSeconds}s`
                  : 'Enviar código'}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={verificationCode}
              onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="Código de 6 dígitos"
              className={`h-11 min-w-[220px] rounded-[16px] border border-[#E2E7EC] bg-[#F8FAFC] px-4 text-sm ${
                isProfessionalTone ? 'text-[#0E2A47] focus:border-[#1FB6A6]' : 'text-[color:var(--ink)] focus:border-[color:var(--accent)]'
              } focus:outline-none`}
            />
            <button
              type="button"
              onClick={() => {
                void handleConfirm();
              }}
              disabled={isConfirming || verificationCode.trim().length === 0}
              className={primaryButtonClassName}
            >
              {isConfirming ? 'Verificando...' : 'Confirmar código'}
            </button>
          </div>
        </div>
      ) : null}

      {message ? (
        <p className={`mt-4 text-xs font-semibold ${isProfessionalTone ? 'text-[#1FB6A6]' : 'text-[color:var(--accent-strong)]'}`}>
          {message}
        </p>
      ) : null}

      {error ? (
        <p className="mt-4 text-xs font-semibold text-[#B91C1C]">{error}</p>
      ) : null}
    </section>
  );
}
