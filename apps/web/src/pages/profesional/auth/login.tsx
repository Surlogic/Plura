import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';
import api from '@/services/api';
import { useProfessionalProfileContext } from '@/context/ProfessionalProfileContext';

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
      await api.post('/auth/login/profesional', {
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });
      await refreshProfile();
      router.push('/profesional/dashboard');
    } catch (error) {
      setErrorMessage('Credenciales inválidas o error de servidor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F6F8] text-[#0E2A47]">
      <Navbar />
      <main className="mx-auto flex w-full max-w-6xl flex-1 items-center justify-center px-4 py-16">
        <div className="w-full max-w-md space-y-6 rounded-[24px] bg-white p-8 shadow-sm">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.35em] text-[#6B7280]">
              Login
            </p>
            <h1 className="text-2xl font-semibold text-[#0E2A47]">
              Acceso para profesionales
            </h1>
            <p className="text-sm text-[#6B7280]">
              Gestioná tu agenda y tus clientes desde Plura.
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#0E2A47]">Gmail</label>
              <input
                className="h-12 w-full rounded-[16px] border border-[#0E2A47]/10 bg-[#F4F6F8] px-4 text-sm text-[#0E2A47] placeholder:text-[#6B7280] focus:outline-none focus:ring-2 focus:ring-[#1FB6A6]/40"
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
                className="h-12 w-full rounded-[16px] border border-[#0E2A47]/10 bg-[#F4F6F8] px-4 text-sm text-[#0E2A47] placeholder:text-[#6B7280] focus:outline-none focus:ring-2 focus:ring-[#1FB6A6]/40"
                placeholder="••••••••"
                name="password"
                value={form.password}
                onChange={handleChange}
                required
              />
            </div>

            {errorMessage ? (
              <p className="rounded-[12px] bg-red-50 px-3 py-2 text-xs text-red-600">
                {errorMessage}
              </p>
            ) : null}

            <button
              type="submit"
              className="h-12 w-full rounded-full bg-[linear-gradient(135deg,#1FB6A6,#0E2A47)] text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Ingresando...' : 'Iniciar sesión'}
            </button>
          </form>

          <p className="text-center text-xs text-[#6B7280]">
            ¿No tenés cuenta?{' '}
            <Link
              href="/profesional/auth/register"
              className="font-semibold text-[#1FB6A6]"
            >
              Crear cuenta profesional
            </Link>
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
