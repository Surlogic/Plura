import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { isAxiosError } from 'axios';
import AuthTopBar from '@/components/auth/AuthTopBar';
import Footer from '@/components/shared/Footer';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import api from '@/services/api';
import { useClientProfileContext } from '@/context/ClientProfileContext';

const resolveApiMessage = (error: unknown, fallback: string) => {
  if (isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message || fallback;
  }
  return fallback;
};

export default function ClienteCompletePhonePage() {
  const router = useRouter();
  const { refreshProfile } = useClientProfileContext();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    setPhoneNumber(event.target.value);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    try {
      setIsSubmitting(true);
      await api.post('/auth/oauth/complete-phone', {
        phoneNumber,
      });
      await refreshProfile();
      router.push('/cliente/inicio');
    } catch (error) {
      setErrorMessage(resolveApiMessage(error, 'No pudimos guardar tu teléfono.'));
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
            <Badge variant="accent">Último paso</Badge>
            <h1 className="text-3xl font-semibold text-[color:var(--ink)]">Completá tu teléfono</h1>
            <p className="text-sm text-[color:var(--ink-muted)]">
              Antes de entrar necesitamos guardar tu número para poder validar recuperaciones de contraseña.
            </p>
          </div>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-medium text-[color:var(--ink)]">Número de teléfono</label>
              <input
                className="h-12 w-full rounded-[18px] border border-[color:var(--border-soft)] bg-white/90 px-4 text-sm text-[color:var(--ink)] focus:border-[color:var(--accent)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-soft)]"
                type="tel"
                value={phoneNumber}
                onChange={handleChange}
                placeholder="59899123456"
                minLength={8}
                required
              />
            </div>

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
              {isSubmitting ? 'Guardando...' : 'Guardar y continuar'}
            </button>
          </form>

          <div className="mt-6 text-sm">
            <Link href="/cliente/auth/login" className="font-semibold text-[color:var(--accent-strong)] underline underline-offset-4">
              Volver al acceso cliente
            </Link>
          </div>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
