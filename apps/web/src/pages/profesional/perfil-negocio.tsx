'use client';

import { useEffect, useMemo, useState } from 'react';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';
import ProfesionalSidebar from '@/components/profesional/Sidebar';
import { useProfessionalProfile } from '@/hooks/useProfessionalProfile';

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

export default function ProfesionalBusinessProfilePage() {
  const { profile, isLoading, hasLoaded } = useProfessionalProfile();
  const [origin, setOrigin] = useState('https://plura.com');
  const [hasInitialized, setHasInitialized] = useState(false);
  const [form, setForm] = useState({
    businessName: '',
    category: '',
    location: '',
    email: '',
    phone: '',
  });

  useEffect(() => {
    if (!profile || hasInitialized) return;
    setForm((prev) => ({
      ...prev,
      businessName: profile.fullName || prev.businessName,
      category: profile.rubro || prev.category,
      location: profile.location || prev.location,
      email: profile.email || prev.email,
      phone: profile.phoneNumber || prev.phone,
    }));
    setHasInitialized(true);
  }, [profile, hasInitialized]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setOrigin(window.location.origin);
  }, []);

  const slug = useMemo(
    () => slugify(form.businessName || 'profesional'),
    [form.businessName],
  );
  const publicUrl = `${origin}/profesional/pagina/${slug || 'profesional'}`;
  const showSkeleton = !hasLoaded || (isLoading && !profile);

  const inputClassName =
    'h-11 w-full rounded-[14px] border border-[#E2E7EC] bg-white px-3 text-sm text-[#0E2A47] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#1FB6A6]/30';

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#FFFFFF_0%,#EEF2F6_45%,#D3D7DC_100%)] text-[#0E2A47]">
      <Navbar />
      <main className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-10 pb-24 pt-10">
        <section className="flex flex-row items-start gap-6">
          <ProfesionalSidebar profile={profile} active="Perfil del negocio" />

          <div className="min-w-0 flex-1 space-y-6">
            <div className="rounded-[28px] border border-white/70 bg-white/95 p-6 shadow-[0_28px_70px_rgba(15,23,42,0.18)]">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-[0.65rem] uppercase tracking-[0.35em] text-[#94A3B8]">
                    Configuración
                  </p>
                  <h1 className="mt-2 text-2xl font-semibold text-[#0E2A47]">
                    Perfil del negocio
                  </h1>
                  <p className="mt-1 text-sm text-[#64748B]">
                    Datos que se muestran en tu página pública.
                  </p>
                </div>
                <button
                  type="button"
                  className="rounded-full bg-[#0B1D2A] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  Guardar cambios
                </button>
              </div>
            </div>

            {showSkeleton ? (
              <div className="rounded-[28px] border border-white/70 bg-white/95 p-6 shadow-[0_18px_40px_rgba(15,23,42,0.12)]">
                <div className="h-5 w-40 rounded-full bg-[#E2E7EC]" />
                <div className="mt-4 space-y-3">
                  <div className="h-10 w-full rounded-[14px] bg-[#F1F5F9]" />
                  <div className="h-10 w-full rounded-[14px] bg-[#F1F5F9]" />
                  <div className="h-10 w-full rounded-[14px] bg-[#F1F5F9]" />
                </div>
              </div>
            ) : (
              <div className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
                <div className="space-y-6">
                  <div className="rounded-[24px] border border-white/70 bg-white/95 p-5 shadow-[0_16px_36px_rgba(15,23,42,0.12)]">
                    <h2 className="text-lg font-semibold text-[#0E2A47]">
                      Identidad
                    </h2>
                    <div className="mt-4 grid gap-4">
                      <div>
                        <label className="text-sm font-medium text-[#0E2A47]">
                          Nombre
                        </label>
                        <input
                          className={inputClassName}
                          name="businessName"
                          value={form.businessName}
                          onChange={handleChange}
                          placeholder="Ej: Atelier Glow"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-[#0E2A47]">
                          Rubro
                        </label>
                        <input
                          className={inputClassName}
                          name="category"
                          value={form.category}
                          onChange={handleChange}
                          placeholder="Ej: Salón de belleza"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-white/70 bg-white/95 p-5 shadow-[0_16px_36px_rgba(15,23,42,0.12)]">
                    <h2 className="text-lg font-semibold text-[#0E2A47]">
                      Contacto
                    </h2>
                    <div className="mt-4 grid gap-4">
                      <div>
                        <label className="text-sm font-medium text-[#0E2A47]">
                          Ubicación
                        </label>
                        <input
                          className={inputClassName}
                          name="location"
                          value={form.location}
                          onChange={handleChange}
                          placeholder="Ej: Palermo, Buenos Aires"
                        />
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <label className="text-sm font-medium text-[#0E2A47]">
                            Email
                          </label>
                          <input
                            className={inputClassName}
                            name="email"
                            value={form.email}
                            onChange={handleChange}
                            placeholder="Ej: hola@plura.com"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-[#0E2A47]">
                            Teléfono
                          </label>
                          <input
                            className={inputClassName}
                            name="phone"
                            value={form.phone}
                            onChange={handleChange}
                            placeholder="Ej: +54 11 5555 4444"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="rounded-[24px] border border-white/70 bg-white/95 p-5 shadow-[0_16px_36px_rgba(15,23,42,0.12)]">
                    <h2 className="text-lg font-semibold text-[#0E2A47]">
                      URL pública
                    </h2>
                    <div className="mt-4 grid gap-4">
                      <div>
                        <label className="text-sm font-medium text-[#0E2A47]">
                          Slug
                        </label>
                        <input className={inputClassName} value={slug} readOnly />
                        <p className="mt-1 text-xs text-[#94A3B8]">
                          Se genera automáticamente según el nombre.
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-[#0E2A47]">
                          Link
                        </label>
                        <input
                          className={inputClassName}
                          value={publicUrl}
                          readOnly
                        />
                      </div>
                      <div className="flex flex-col items-center justify-center rounded-[18px] border border-[#E2E7EC] bg-white p-4">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                            publicUrl,
                          )}`}
                          alt="QR de la página pública"
                          className="h-36 w-36"
                        />
                        <p className="mt-2 text-xs text-[#94A3B8]">
                          QR de tu página
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
