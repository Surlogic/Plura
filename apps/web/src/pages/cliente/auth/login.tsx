import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { isAxiosError } from 'axios';
import AuthTopBar from '@/components/auth/AuthTopBar';
import Footer from '@/components/shared/Footer';
import api from '@/services/api';
import { useClientProfileContext } from '@/context/ClientProfileContext';
import { createPublicReservation } from '@/services/publicBookings';
import {
  clearPendingReservation,
  getPendingReservation,
} from '@/services/pendingReservation';

const resolveQueryValue = (value: string | string[] | undefined) => {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
};

const extractApiMessage = (error: unknown, fallback: string) => {
  if (isAxiosError(error)) {
    const responseData = error.response?.data;
    if (typeof responseData === 'string' && responseData.trim()) {
      return responseData.trim();
    }
    if (responseData && typeof responseData === 'object') {
      const message = (responseData as { message?: unknown }).message;
      if (typeof message === 'string' && message.trim()) {
        return message.trim();
      }
    }
  }
  return fallback;
};

export default function ClienteLoginPage() {
  const router = useRouter();
  const { refreshProfile } = useClientProfileContext();
  const redirectIntent = resolveQueryValue(router.query.redirect).trim();
  const shouldConfirmReservationAfterLogin = redirectIntent === 'confirm-reservation';
  const registerHref = shouldConfirmReservationAfterLogin
    ? '/cliente/auth/register?redirect=confirm-reservation'
    : '/cliente/auth/register';
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
      await api.post('/auth/login/cliente', {
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });
      await refreshProfile();

      if (shouldConfirmReservationAfterLogin) {
        const pendingReservation = getPendingReservation();
        if (pendingReservation) {
          try {
            const payload = {
              serviceId: pendingReservation.serviceId,
              startDateTime: `${pendingReservation.date}T${pendingReservation.time}`,
            };
            const created = await createPublicReservation(
              pendingReservation.professionalSlug,
              payload,
            );
            clearPendingReservation();
            router.push({
              pathname: '/reserva-confirmada',
              query: {
                id: String(created.id),
                professional: pendingReservation.professionalName || 'Profesional',
                service: pendingReservation.serviceName || 'Servicio',
                date: pendingReservation.date,
                time: pendingReservation.time,
                status: created.status,
              },
            });
            return;
          } catch (reservationError) {
            router.push({
              pathname: '/reservar',
              query: {
                profesional: pendingReservation.professionalSlug,
                serviceId: pendingReservation.serviceId,
                resume: '1',
              },
            });
            return;
          }
        }
      }

      router.push('/cliente/inicio');
    } catch (error) {
      setErrorMessage(
        extractApiMessage(error, 'Credenciales inválidas o error de servidor.'),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClassName =
    'h-12 w-full rounded-[16px] border border-[#0E2A47]/12 bg-[#F8FAFC] px-4 text-sm text-[#0E2A47] placeholder:text-[#64748B] transition focus:border-[#0EA5A4] focus:outline-none focus:ring-2 focus:ring-[#0EA5A4]/35';

  return (
    <div className="min-h-screen bg-[radial-gradient(1100px_620px_at_5%_-10%,rgba(14,165,164,0.16),transparent_55%),radial-gradient(900px_700px_at_95%_0%,rgba(249,115,22,0.16),transparent_50%),linear-gradient(180deg,#F8FCFB_0%,#F5F8F7_100%)] text-[#0E2A47]">
      <AuthTopBar tone="client" />
      <main className="mx-auto flex w-full max-w-5xl items-center justify-center px-4 py-10 sm:px-6 sm:py-14">
        <div className="w-full max-w-md space-y-5">
          <section className="relative overflow-hidden rounded-[28px] border border-[#0EA5A4]/20 bg-[linear-gradient(140deg,rgba(236,254,255,0.94)_0%,rgba(255,247,237,0.98)_100%)] p-5 shadow-[0_18px_45px_-28px_rgba(15,42,71,0.5)] sm:p-6">
            <div className="pointer-events-none absolute -left-10 -top-12 h-28 w-28 rounded-full bg-[#0EA5A4]/20 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-12 right-0 h-28 w-28 rounded-full bg-[#F97316]/25 blur-2xl" />
            <div className="relative space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0E7490]">
                Reservar y descubrir
              </p>
              <h2 className="text-xl font-semibold leading-tight text-[#0E2A47]">
                Encontrá tu próximo turno en una experiencia simple.
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-[#0EA5A4]/20 bg-white/85 p-3">
                  <p className="text-xs uppercase tracking-[0.14em] text-[#0EA5A4]">Explorar</p>
                  <p className="mt-1 text-sm font-semibold text-[#0E2A47]">Profesionales verificados</p>
                </div>
                <div className="rounded-2xl border border-[#F97316]/20 bg-white/85 p-3">
                  <p className="text-xs uppercase tracking-[0.14em] text-[#EA580C]">Reservar</p>
                  <p className="mt-1 text-sm font-semibold text-[#0E2A47]">Turnos en segundos</p>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[30px] border border-[#0E2A47]/10 bg-white p-7 shadow-[0_24px_65px_-38px_rgba(12,22,35,0.55)] sm:p-8">
            <div className="space-y-3">
              <p className="inline-flex rounded-full border border-[#F97316]/25 bg-[#FFF7ED] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#C2410C]">
                Cuenta Cliente
              </p>
              <h1 className="text-3xl font-semibold leading-tight text-[#0E2A47]">
                Iniciar sesión
              </h1>
              <p className="text-sm text-[#64748B]">
                Descubrí profesionales y reservá tu turno en segundos.
              </p>
              <Link
                href="/profesional/auth/login"
                className="inline-flex text-xs font-semibold text-[#0EA5A4] underline decoration-[#0EA5A4]/35 underline-offset-4 transition hover:text-[#0B7E7B] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0EA5A4]/30"
              >
                Ir a acceso profesional
              </Link>
            </div>

            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#0E2A47]">Gmail</label>
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
                <label className="text-sm font-medium text-[#0E2A47]">Contraseña</label>
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
                className="h-12 w-full rounded-full bg-[linear-gradient(135deg,#F97316,#0EA5A4)] text-sm font-semibold text-white shadow-[0_18px_35px_-20px_rgba(249,115,22,0.7)] transition hover:-translate-y-0.5 hover:brightness-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316]/35 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Ingresando...' : 'Iniciar sesión'}
              </button>
            </form>

            <p className="mt-6 text-center text-xs text-[#64748B]">
              ¿No tenés cuenta?{' '}
              <Link
                href={registerHref}
                className="font-semibold text-[#0EA5A4] underline decoration-[#0EA5A4]/30 underline-offset-4"
              >
                Crear cuenta
              </Link>
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
