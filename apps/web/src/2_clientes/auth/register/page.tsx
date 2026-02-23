'use client';

import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import Link from 'next/link';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';
import api from '@/services/api';

export default function ClienteRegisterPage() {
  const inputClassName =
    'h-12 w-full rounded-[16px] border border-[#0E2A47]/10 bg-[#F4F6F8] px-4 text-sm text-[#0E2A47] placeholder:text-[#6B7280] focus:outline-none focus:ring-2 focus:ring-[#1FB6A6]/40';
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    confirmEmail: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (form.email !== form.confirmEmail) {
      setErrorMessage('Los correos no coinciden.');
      return;
    }

    if (form.password !== form.confirmPassword) {
      setErrorMessage('Las contraseñas no coinciden.');
      return;
    }

    try {
      setIsSubmitting(true);
      await api.post('/auth/register/cliente', {
        fullName: form.fullName,
        email: form.email,
        phoneNumber: form.phoneNumber,
        password: form.password,
      });
      setSuccessMessage('Cuenta creada. Ya podés iniciar sesión.');
      setForm({
        fullName: '',
        email: '',
        confirmEmail: '',
        phoneNumber: '',
        password: '',
        confirmPassword: '',
      });
    } catch (error) {
      setErrorMessage('No se pudo crear la cuenta. Verificá los datos e intentá de nuevo.');
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
              Registro
            </p>
            <h1 className="text-2xl font-semibold text-[#0E2A47]">Crear cuenta</h1>
            <p className="text-sm text-[#6B7280]">
              Completá tus datos para comenzar en Plura.
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#0E2A47]">Nombre completo</label>
              <input
                className={inputClassName}
                placeholder="Tu nombre y apellido"
                name="fullName"
                value={form.fullName}
                onChange={handleChange}
                required
              />
            </div>

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
              <label className="text-sm font-medium text-[#0E2A47]">Confirmar Gmail</label>
              <input
                className={inputClassName}
                placeholder="tucorreo@gmail.com"
                type="email"
                name="confirmEmail"
                value={form.confirmEmail}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[#0E2A47]">Celular</label>
              <input
                className={inputClassName}
                placeholder="Tu número de celular"
                type="tel"
                name="phoneNumber"
                value={form.phoneNumber}
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

            <div className="space-y-2">
              <label className="text-sm font-medium text-[#0E2A47]">Confirmar contraseña</label>
              <input
                type="password"
                className={inputClassName}
                placeholder="••••••••"
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
                required
              />
            </div>

            {errorMessage ? (
              <p className="rounded-[12px] bg-red-50 px-3 py-2 text-xs text-red-600">
                {errorMessage}
              </p>
            ) : null}
            {successMessage ? (
              <p className="rounded-[12px] bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                {successMessage}
              </p>
            ) : null}

            <button
              type="submit"
              className="h-12 w-full rounded-full bg-[linear-gradient(135deg,#1FB6A6,#0E2A47)] text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creando cuenta...' : 'Crear cuenta'}
            </button>
          </form>

          <p className="text-center text-xs text-[#6B7280]">
            ¿Ya tenés cuenta?{' '}
            <Link
              href="/cliente/login"
              className="font-semibold text-[#1FB6A6]"
            >
              Iniciar sesión
            </Link>
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
