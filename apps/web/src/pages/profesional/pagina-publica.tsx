'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';
import ProfesionalSidebar from '@/components/profesional/Sidebar';
import { useProfessionalProfile } from '@/hooks/useProfessionalProfile';

type PhotoItem = {
  id: string;
  url: string;
};

export default function ProfesionalPublicPageBuilder() {
  const { profile } = useProfessionalProfile();
  const [form, setForm] = useState({
    headline: 'Color, cuidado y estilo con agenda online.',
    about:
      'Somos un equipo especializado en bienestar y estética con foco en la experiencia.',
  });
  const [photos, setPhotos] = useState<PhotoItem[]>([
    { id: 'photo-1', url: '' },
    { id: 'photo-2', url: '' },
    { id: 'photo-3', url: '' },
    { id: 'photo-4', url: '' },
  ]);

  useEffect(() => {
    if (!profile) return;
    setForm((prev) => ({
      ...prev,
      headline: prev.headline,
      about: prev.about,
    }));
  }, [profile]);

  const initials = useMemo(() => {
    const name = profile?.fullName || 'Profesional';
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }, [profile?.fullName]);

  const displayName = profile?.fullName || 'Profesional';
  const displayCategory = profile?.rubro || 'Rubro';

  const inputClassName =
    'h-11 w-full rounded-[14px] border border-[#E2E7EC] bg-white px-3 text-sm text-[#0E2A47] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#1FB6A6]/30';

  const handleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePhotoChange = (index: number, value: string) => {
    setPhotos((prev) =>
      prev.map((photo, photoIndex) =>
        photoIndex === index ? { ...photo, url: value } : photo,
      ),
    );
  };

  const addPhoto = () => {
    setPhotos((prev) => [
      ...prev,
      { id: `photo-${prev.length + 1}`, url: '' },
    ]);
  };

  return (
    <div
      className="min-h-screen bg-[radial-gradient(circle_at_top,#FFFFFF_0%,#EEF2F6_45%,#D3D7DC_100%)] text-[#0E2A47]"
      style={{ fontFamily: '"Manrope", "Segoe UI", sans-serif' }}
    >
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap');
      `}</style>
      <Navbar />
      <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-10">
        <section className="flex flex-row items-start gap-6">
          <ProfesionalSidebar profile={profile} active="Página pública" />

          <div className="min-w-0 flex-1 space-y-6">
            <div className="rounded-[28px] border border-white/70 bg-white/95 p-6 shadow-[0_28px_70px_rgba(15,23,42,0.18)]">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-[0.65rem] uppercase tracking-[0.35em] text-[#94A3B8]">
                    Página pública
                  </p>
                  <h1 className="mt-2 text-2xl font-semibold text-[#0E2A47]">
                    Constructor de marketplace
                  </h1>
                  <p className="mt-1 text-sm text-[#64748B]">
                    Configurá la información que verán los clientes.
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

            <div className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
              <div className="space-y-6">
                <div className="rounded-[24px] border border-white/70 bg-white/95 p-5 shadow-[0_16px_36px_rgba(15,23,42,0.12)]">
                  <h2 className="text-lg font-semibold text-[#0E2A47]">
                    Frase principal
                  </h2>
                  <p className="mt-1 text-sm text-[#64748B]">
                    La frase que aparece debajo del nombre en tu página pública.
                  </p>
                  <div className="mt-4">
                    <input
                      className={inputClassName}
                      name="headline"
                      value={form.headline}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="rounded-[24px] border border-white/70 bg-white/95 p-5 shadow-[0_16px_36px_rgba(15,23,42,0.12)]">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-[#0E2A47]">
                      Fotos del negocio o trabajos
                    </h2>
                    <button
                      type="button"
                      onClick={addPhoto}
                      className="rounded-full border border-[#E2E7EC] bg-white px-3 py-1 text-xs font-semibold text-[#0E2A47]"
                    >
                      Agregar foto
                    </button>
                  </div>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    {photos.map((photo, index) => (
                      <div key={photo.id} className="space-y-2">
                        <div
                          className="h-28 rounded-[18px] border border-[#E2E7EC] bg-[#F4F6F8] bg-cover bg-center"
                          style={{
                            backgroundImage: photo.url ? `url(${photo.url})` : undefined,
                          }}
                        />
                        <input
                          className={inputClassName}
                          placeholder="Pegá la URL de la foto"
                          value={photo.url}
                          onChange={(event) => handlePhotoChange(index, event.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[24px] border border-white/70 bg-white/95 p-5 shadow-[0_16px_36px_rgba(15,23,42,0.12)]">
                  <h2 className="text-lg font-semibold text-[#0E2A47]">Sobre mí</h2>
                  <p className="mt-1 text-sm text-[#64748B]">
                    Contá quién sos y qué hacés.
                  </p>
                  <div className="mt-4">
                    <textarea
                      className={`${inputClassName} h-28 resize-none`}
                      name="about"
                      value={form.about}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="rounded-[28px] border border-white/70 bg-white/95 p-6 shadow-[0_18px_40px_rgba(15,23,42,0.12)]">
                  <p className="text-[0.65rem] uppercase tracking-[0.35em] text-[#94A3B8]">
                    Vista previa
                  </p>
                  <h2 className="mt-2 text-lg font-semibold text-[#0E2A47]">
                    Página pública
                  </h2>

                  <div className="mt-5 rounded-[22px] border border-[#E2E7EC] bg-[#F7F9FB] p-4">
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#1FB6A6] bg-white text-sm font-semibold text-[#0E2A47]">
                        {initials}
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.3em] text-[#94A3B8]">
                          Profesional / Empresa
                        </p>
                        <p className="text-lg font-semibold text-[#0E2A47]">
                          {displayName}
                        </p>
                        <p className="text-sm text-[#64748B]">{form.headline}</p>
                        <p className="text-xs text-[#94A3B8]">{displayCategory}</p>
                      </div>
                    </div>

                    <div className="mt-4">
                      <p className="text-[0.65rem] uppercase tracking-[0.35em] text-[#94A3B8]">
                        Galería
                      </p>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        {photos.map((photo) => (
                          <div
                            key={`preview-${photo.id}`}
                            className="h-24 rounded-[16px] border border-[#E2E7EC] bg-[#EEF2F6] bg-cover bg-center"
                            style={{
                              backgroundImage: photo.url ? `url(${photo.url})` : undefined,
                            }}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="mt-4 rounded-[16px] border border-[#E2E7EC] bg-white p-3 text-sm text-[#64748B]">
                      {form.about}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
