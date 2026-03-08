import Link from 'next/link';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { isAxiosError } from 'axios';
import AuthTopBar from '@/components/auth/AuthTopBar';
import Footer from '@/components/shared/Footer';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import api from '@/services/api';

const resolveMessage = (error: unknown, fallback: string) => {
  if (isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message || fallback;
  }
  return fallback;
};

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    setErrorMessage(null);
    try {
      setIsSubmitting(true);
      const response = await api.post<{ message: string }>('/auth/password/forgot', {
        email: email.trim().toLowerCase(),
      });
      setMessage(response.data.message);
    } catch (error) {
      setErrorMessage(resolveMessage(error, 'No se pudo procesar la solicitud.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(1100px_620px_at_5%_-10%,rgba(31,182,166,0.18),transparent_55%),linear-gradient(180deg,#f8fcfb_0%,#eef4f2_100%)] text-[color:var(--ink)]">
      <AuthTopBar tone="client" />
      <main className="mx-auto flex w-full max-w-4xl items-center justify-center px-4 py-12 sm:px-6">
        <Card tone="default" padding="lg" className="w-full max-w-md rounded-[32px]">
          <div className="space-y-3">
            <Badge variant="accent">Recuperar acceso</Badge>
            <h1 className="text-3xl font-semibold text-[color:var(--ink)]">Restablecer contraseña</h1>
            <p className="text-sm text-[color:var(--ink-muted)]">
              Te enviaremos instrucciones al email si existe una cuenta recuperable.
            </p>
          </div>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-medium text-[color:var(--ink)]">Email</label>
              <input
                className="h-12 w-full rounded-[18px] border border-[color:var(--border-soft)] bg-white/90 px-4 text-sm text-[color:var(--ink)] focus:border-[color:var(--accent)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-soft)]"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="tucorreo@gmail.com"
                required
              />
            </div>

            {message ? (
              <p className="rounded-[12px] border border-[#cdeee9] bg-[#f0fffc] px-3 py-2 text-xs text-[#1FB6A6]">
                {message}
              </p>
            ) : null}

            {errorMessage ? (
              <p className="rounded-[12px] border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-600">
                {errorMessage}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="h-12 w-full rounded-full bg-[linear-gradient(135deg,#1FB6A6,#0E2A47)] text-sm font-semibold text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? 'Enviando...' : 'Enviar instrucciones'}
            </button>
          </form>

          <div className="mt-6 flex flex-col gap-2 text-sm">
            <Link href="/cliente/auth/login" className="font-semibold text-[color:var(--accent-strong)] underline underline-offset-4">
              Volver a acceso cliente
            </Link>
            <Link href="/profesional/auth/login" className="font-semibold text-[#0f766e] underline underline-offset-4">
              Volver a acceso profesional
            </Link>
          </div>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
