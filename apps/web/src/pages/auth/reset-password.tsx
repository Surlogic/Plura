import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';
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

export default function ResetPasswordPage() {
  const router = useRouter();
  const initialToken = useMemo(() => {
    const rawToken = router.query.token;
    if (Array.isArray(rawToken)) return rawToken[0] ?? '';
    return rawToken ?? '';
  }, [router.query.token]);

  const [token, setToken] = useState(initialToken);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!router.isReady || !initialToken) return;
    setToken((currentValue) => {
      if (currentValue.trim()) {
        return currentValue;
      }
      return initialToken;
    });
  }, [initialToken, router.isReady]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    setErrorMessage(null);
    if (password.length < 8) {
      setErrorMessage('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Las contraseñas no coinciden.');
      return;
    }
    try {
      setIsSubmitting(true);
      await api.post('/auth/password/reset', {
        token: token.trim(),
        newPassword: password,
      });
      setMessage('La contraseña fue actualizada. Iniciá sesión nuevamente.');
      setPassword('');
      setConfirmPassword('');
    } catch (error) {
      setErrorMessage(resolveMessage(error, 'No se pudo restablecer la contraseña.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(1100px_620px_at_95%_-10%,rgba(14,42,71,0.18),transparent_55%),linear-gradient(180deg,#f8fcfb_0%,#eef4f2_100%)] text-[color:var(--ink)]">
      <AuthTopBar tone="professional" />
      <main className="mx-auto flex w-full max-w-4xl items-center justify-center px-4 py-12 sm:px-6">
        <Card tone="default" padding="lg" className="w-full max-w-md rounded-[32px]">
          <div className="space-y-3">
            <Badge variant="warm">Token único</Badge>
            <h1 className="text-3xl font-semibold text-[color:var(--ink)]">Nueva contraseña</h1>
            <p className="text-sm text-[color:var(--ink-muted)]">
              El enlace es de un solo uso. Elegí una nueva contraseña para volver a entrar.
            </p>
          </div>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-medium text-[color:var(--ink)]">Token</label>
              <input
                className="h-12 w-full rounded-[18px] border border-[color:var(--border-soft)] bg-white/90 px-4 text-sm text-[color:var(--ink)] focus:border-[color:var(--accent)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-soft)]"
                value={token}
                onChange={(event) => setToken(event.target.value)}
                placeholder="Pegá el token o abrí el enlace completo"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[color:var(--ink)]">Nueva contraseña</label>
              <input
                className="h-12 w-full rounded-[18px] border border-[color:var(--border-soft)] bg-white/90 px-4 text-sm text-[color:var(--ink)] focus:border-[color:var(--accent)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-soft)]"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Al menos 8 caracteres"
                minLength={8}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[color:var(--ink)]">Confirmar contraseña</label>
              <input
                className="h-12 w-full rounded-[18px] border border-[color:var(--border-soft)] bg-white/90 px-4 text-sm text-[color:var(--ink)] focus:border-[color:var(--accent)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-soft)]"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Repetí la contraseña"
                minLength={8}
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
              {isSubmitting ? 'Actualizando...' : 'Guardar nueva contraseña'}
            </button>
          </form>

          <div className="mt-6 flex flex-col gap-2 text-sm">
            <Link href="/cliente/auth/login" className="font-semibold text-[color:var(--accent-strong)] underline underline-offset-4">
              Ir a acceso cliente
            </Link>
            <Link href="/profesional/auth/login" className="font-semibold text-[#0f766e] underline underline-offset-4">
              Ir a acceso profesional
            </Link>
          </div>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
