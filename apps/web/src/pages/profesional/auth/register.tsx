'use client';

import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import Link from 'next/link';
import axios from 'axios';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';
import api from '@/services/api';

export default function ProfesionalRegisterPage() {
  const inputClassName =
    'h-12 w-full rounded-[16px] border border-[#0E2A47]/10 bg-[#F4F6F8] px-4 text-sm text-[#0E2A47] placeholder:text-[#6B7280] focus:outline-none focus:ring-2 focus:ring-[#1FB6A6]/40';
  const [form, setForm] = useState({
    fullName: '',
    rubro: '',
    email: '',
    confirmEmail: '',
    phoneNumber: '',
    tipoCliente: 'LOCAL',
    location: '',
    password: '',
    confirmPassword: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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

    if (form.password.length < 10) {
      setErrorMessage('La contraseña debe tener al menos 10 caracteres.');
      return;
    }

    const requiresLocation = form.tipoCliente === 'LOCAL' || form.tipoCliente === 'PROF';
    if (requiresLocation && !form.location.trim()) {
      setErrorMessage('Indicá la ubicación del local.');
      return;
    }

    const payload = {
      fullName: form.fullName.trim(),
      rubro: form.rubro.trim(),
      email: form.email.trim().toLowerCase(),
      phoneNumber: form.phoneNumber.trim(),
      location: requiresLocation ? form.location.trim() : null,
      tipoCliente: form.tipoCliente,
      password: form.password,
    };

    try {
      setIsSubmitting(true);
      await api.post('/auth/register/profesional', payload);
      setSuccessMessage('Cuenta profesional creada. Ya podés iniciar sesión.');
      setForm({
        fullName: '',
        rubro: '',
        email: '',
        confirmEmail: '',
        phoneNumber: '',
        tipoCliente: 'LOCAL',
        location: '',
        password: '',
        confirmPassword: '',
      });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (!error.response) {
          setErrorMessage('No se pudo conectar con el servidor.');
        } else {
          const data = error.response.data as { message?: string; error?: string; errors?: Array<{ defaultMessage?: string }> };
          const details =
            data?.message ||
            data?.error ||
            (data?.errors && data.errors.length > 0 ? data.errors.map((item) => item.defaultMessage).join(' ') : null);
          setErrorMessage(details || `No se pudo crear la cuenta (HTTP ${error.response.status}).`);
        }
      } else {
        setErrorMessage('No se pudo crear la cuenta. Verificá los datos e intentá de nuevo.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const requiresLocation = form.tipoCliente === 'LOCAL' || form.tipoCliente === 'PROF';

  return (
    <div className="min-h-screen bg-[#F4F6F8] text-[#0E2A47]">
      <Navbar />
      <main className="mx-auto flex w-full max-w-6xl flex-1 items-center justify-center px-4 py-16">
        <div className="w-full max-w-md space-y-6 rounded-[24px] bg-white p-8 shadow-sm">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.35em] text-[#6B7280]">
              Registro
            </p>
            <h1 className="text-2xl font-semibold text-[#0E2A47]">
              Registro profesional
            </h1>
            <p className="text-sm text-[#6B7280]">
              Completá tus datos para gestionar tu negocio en Plura.
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#0E2A47]">
                Nombre o empresa
              </label>
              <input
                className={inputClassName}
                placeholder="Nombre del profesional o empresa"
                name="fullName"
                value={form.fullName}
                onChange={handleChange}
                required
                minLength={3}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[#0E2A47]">Rubro</label>
              <input
                className={inputClassName}
                placeholder="Ej: peluquería, estética, barbería"
                name="rubro"
                value={form.rubro}
                onChange={handleChange}
                required
                minLength={3}
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
              <label className="text-sm font-medium text-[#0E2A47]">Número</label>
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
              <label className="text-sm font-medium text-[#0E2A47]">
                Tipo de cliente
              </label>
              <select
                className={inputClassName}
                name="tipoCliente"
                value={form.tipoCliente}
                onChange={handleChange}
                required
              >
                <option value="LOCAL">Local</option>
                <option value="PROF">Profesional con local</option>
                <option value="SIN_LOCAL">Profesional sin local</option>
              </select>
            </div>

            {requiresLocation ? (
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#0E2A47]">Ubicación</label>
                <input
                  className={inputClassName}
                  placeholder="Dirección o zona del local"
                  name="location"
                  value={form.location}
                  onChange={handleChange}
                  required={requiresLocation}
                />
              </div>
            ) : null}

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
                minLength={10}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[#0E2A47]">
                Confirmar contraseña
              </label>
              <input
                type="password"
                className={inputClassName}
                placeholder="••••••••"
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
                required
                minLength={10}
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
              href="/profesional/auth/login"
              className="font-semibold text-[#1FB6A6]"
            >
              Iniciar sesión profesional
            </Link>
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
