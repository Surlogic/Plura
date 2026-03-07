import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import AuthTopBar from '@/components/auth/AuthTopBar';
import AppleLoginButton from '@/components/auth/AppleLoginButton';
import GoogleLoginButton from '@/components/auth/GoogleLoginButton';
import Footer from '@/components/shared/Footer';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import api from '@/services/api';
import type { OAuthLoginResult } from '@/lib/auth/oauthLogin';
import { useProfessionalProfileContext } from '@/context/ProfessionalProfileContext';
import { setAuthAccessToken } from '@/services/session';

export default function ProfesionalLoginPage() {
  const router = useRouter();
  const { refreshProfile } = useProfessionalProfileContext();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    try {
      setIsSubmitting(true);
      const response = await api.post<{ accessToken?: string | null }>('/auth/login/profesional', {
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });
      setAuthAccessToken(response.data?.accessToken ?? null);
      await completeProfessionalLoginFlow();
    } catch {
      setErrorMessage('Credenciales inválidas o error de servidor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const completeProfessionalLoginFlow = async () => {
    await api.get('/auth/me/profesional');
    await refreshProfile();
    router.push('/profesional/dashboard');
  };

  const handleOAuthAuthenticated = async (result: OAuthLoginResult) => {
    setErrorMessage(null);

    if (result.role !== 'PROFESSIONAL') {
      setErrorMessage('Esta cuenta no quedó asociada como profesional. Usá acceso cliente o volvé a registrarte como profesional.');
      return;
    }

    await completeProfessionalLoginFlow();
  };

  const inputClassName =
    'h-12 w-full rounded-[18px] border border-[color:var(--border-soft)] bg-white/90 px-4 text-sm text-[color:var(--ink)] placeholder:text-[color:var(--ink-muted)] transition focus:border-[#0f766e] focus:outline-none focus:ring-2 focus:ring-[rgba(15,118,110,0.18)]';

  return (
    <div className="min-h-screen bg-[radial-gradient(1200px_700px_at_15%_-10%,rgba(42,165,160,0.18),transparent_55%),radial-gradient(950px_650px_at_100%_0%,rgba(16,42,75,0.32),transparent_50%),linear-gradient(180deg,#091223_0%,#0A1424_100%)] text-[#E8EEF7]">
      <AuthTopBar tone="professional" />
      <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr] lg:gap-8">
          <Card tone="dark" padding="lg" className="relative overflow-hidden rounded-[34px] border-white/10 bg-[linear-gradient(140deg,rgba(14,42,71,0.98)_0%,rgba(10,24,42,0.98)_55%,rgba(13,42,57,0.95)_100%)]">
            <div className="pointer-events-none absolute -right-14 top-8 h-36 w-36 rounded-full bg-[#2AA5A0]/20 blur-2xl" />
            <div className="pointer-events-none absolute -left-16 bottom-6 h-40 w-40 rounded-full bg-[#0E2A47]/50 blur-3xl" />
            <div className="relative space-y-8">
              <div className="space-y-4">
                <Badge variant="contrast" className="border-[#2aa5a0]/35 bg-[#2aa5a0]/14 text-[#9ef7f0]">Agenda y gestión</Badge>
                <h2 className="max-w-sm text-2xl font-semibold leading-tight text-white sm:text-[2rem]">
                  Centralizá tu operación diaria sin cambiar de contexto.
                </h2>
                <p className="max-w-md text-sm text-[#B9C8DC]">
                  Seguimiento de reservas, control de servicios y una agenda con mejor jerarquía visual para tu negocio.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <Card tone="dark" padding="sm" className="rounded-[22px] border-white/12 bg-white/6">
                  <p className="text-xs uppercase tracking-[0.16em] text-[#9FB1C8]">Agenda</p>
                  <p className="mt-2 text-xl font-semibold text-white">Hoy</p>
                  <p className="text-sm text-[#8AF0E8]">12 turnos activos</p>
                </Card>
                <Card tone="dark" padding="sm" className="rounded-[22px] border-white/12 bg-white/6">
                  <p className="text-xs uppercase tracking-[0.16em] text-[#9FB1C8]">Reservas</p>
                  <p className="mt-2 text-xl font-semibold text-white">+6</p>
                  <p className="text-sm text-[#8AF0E8]">Nuevas en 24h</p>
                </Card>
                <Card tone="dark" padding="sm" className="rounded-[22px] border-white/12 bg-white/6">
                  <p className="text-xs uppercase tracking-[0.16em] text-[#9FB1C8]">Servicios</p>
                  <p className="mt-2 text-xl font-semibold text-white">18</p>
                  <p className="text-sm text-[#8AF0E8]">Publicados</p>
                </Card>
              </div>

              <Card tone="dark" padding="sm" className="rounded-[22px] border-white/12 bg-[#0c1d34]/88">
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.14em] text-[#9FB1C8]">
                  <span>Panel Profesional</span>
                  <span className="text-[#8AF0E8]">En línea</span>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#8AF0E8]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#5FD6CF]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#2AA5A0]" />
                  <div className="h-1.5 flex-1 rounded-full bg-gradient-to-r from-[#2AA5A0] via-[#6EDFD6] to-[#9EF7F0]" />
                </div>
              </Card>
            </div>
          </Card>

          <section className="flex items-center">
            <Card tone="default" padding="lg" className="w-full rounded-[32px] text-[color:var(--ink)]">
              <div className="space-y-3">
                <Badge variant="accent" className="border-[#0f766e]/20 bg-[#ecfdf5] text-[#0f766e]">Panel profesional</Badge>
                <h1 className="text-3xl font-semibold leading-tight text-[color:var(--ink)]">
                  Iniciar sesión
                </h1>
                <p className="text-sm text-[color:var(--ink-muted)]">
                  Administrá tu negocio, servicios y reservas desde Plura.
                </p>
                <Link
                  href="/cliente/auth/login"
                  className="inline-flex text-xs font-semibold text-[#0f766e] underline decoration-[#0f766e]/30 underline-offset-4 transition hover:text-[#0a5d57] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0f766e]/20"
                >
                  Ir a acceso de cliente
                </Link>
              </div>

              <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[color:var(--ink)]">Gmail</label>
                  <input
                    className={inputClassName}
                    placeholder="tucorreo@gmail.com"
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-[color:var(--ink)]">Contraseña</label>
                  <input
                    type="password"
                    className={inputClassName}
                    placeholder="••••••••"
                    name="password"
                    value={form.password}
                    onChange={handleChange}
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
                  className="h-12 w-full rounded-full border border-transparent bg-[linear-gradient(135deg,#0f766e,#0e2a47)] text-sm font-semibold text-white shadow-[var(--shadow-lift)] transition hover:-translate-y-0.5 hover:brightness-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(15,118,110,0.18)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Ingresando...' : 'Iniciar sesión'}
                </button>
              </form>

              <div className="mt-5 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-[color:var(--border-soft)]" />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--ink-faint)]">
                    o continuar con
                  </span>
                  <div className="h-px flex-1 bg-[color:var(--border-soft)]" />
                </div>
                <div className="space-y-2">
                  <GoogleLoginButton
                    intendedRole="PROFESSIONAL"
                    onAuthenticated={handleOAuthAuthenticated}
                    onError={setErrorMessage}
                  />
                  <AppleLoginButton
                    intendedRole="PROFESSIONAL"
                    onAuthenticated={handleOAuthAuthenticated}
                    onError={setErrorMessage}
                  />
                </div>
              </div>

              <p className="mt-6 text-center text-xs text-[color:var(--ink-muted)]">
                ¿No tenés cuenta?{' '}
                <Link
                  href="/profesional/auth/register"
                  className="font-semibold text-[#0f766e] underline decoration-[#0f766e]/30 underline-offset-4"
                >
                  Crear cuenta profesional
                </Link>
              </p>
            </Card>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
