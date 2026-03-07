import Image from 'next/image';
import Link from 'next/link';
import ClientShell from '@/components/cliente/ClientShell';
import FavoriteToggleButton from '@/components/shared/FavoriteToggleButton';
import { useFavoriteProfessionals } from '@/hooks/useFavoriteProfessionals';
import { useClientProfile } from '@/hooks/useClientProfile';

export default function ClienteFavoritosPage() {
  const { profile } = useClientProfile();
  const { favorites, hasHydrated, removeFavorite } = useFavoriteProfessionals();
  const displayName = profile?.fullName || 'Cliente';

  return (
    <ClientShell name={displayName} active="favoritos">
      <section className="space-y-2 rounded-[28px] border border-white/70 bg-white/95 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.1)]">
        <p className="text-xs uppercase tracking-[0.35em] text-[#94A3B8]">Favoritos</p>
        <h1 className="text-3xl font-semibold text-[#0E2A47]">Tus favoritos</h1>
        <p className="text-sm text-[#64748B]">
          Guarda profesionales para volver mas rapido a reservar.
        </p>
      </section>

      {!hasHydrated ? (
        <section className="rounded-[24px] border border-dashed border-[#E2E7EC] bg-white p-6 text-sm text-[#64748B]">
          Cargando favoritos...
        </section>
      ) : favorites.length === 0 ? (
        <section className="rounded-[24px] border border-dashed border-[#E2E7EC] bg-white p-6 text-sm text-[#64748B]">
          Todavia no marcaste profesionales como favoritos.
          <div className="mt-4">
            <Link
              href="/explorar"
              className="inline-flex rounded-full bg-[#F59E0B] px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              Explorar profesionales
            </Link>
          </div>
        </section>
      ) : (
        <section className="grid gap-5 lg:grid-cols-2">
          {favorites.map((favorite) => {
            const profileHref = `/profesional/pagina/${encodeURIComponent(favorite.slug)}`;
            const initials = favorite.name
              .split(' ')
              .filter(Boolean)
              .map((part) => part[0])
              .join('')
              .slice(0, 2)
              .toUpperCase();

            return (
              <article
                key={favorite.slug}
                className="overflow-hidden rounded-[28px] border border-white/70 bg-white/95 shadow-[0_20px_50px_rgba(15,23,42,0.1)]"
              >
                <div className="relative h-52 bg-[linear-gradient(135deg,#0E2A47,#155E75,#1FB6A6)]">
                  {favorite.imageUrl ? (
                    <Image
                      src={favorite.imageUrl}
                      alt={favorite.name}
                      fill
                      sizes="(max-width: 1024px) 100vw, 50vw"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-4xl font-semibold text-white/90">
                      {initials || 'PR'}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0E2A47]/70 via-[#0E2A47]/10 to-transparent" />
                  <div className="absolute right-4 top-4">
                    <FavoriteToggleButton
                      isActive
                      onClick={() => {
                        void removeFavorite(favorite.slug);
                      }}
                      tone="light"
                      activeLabel={`Quitar a ${favorite.name} de favoritos`}
                    />
                  </div>
                  <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                    <p className="text-xs uppercase tracking-[0.24em] text-white/75">
                      {favorite.category}
                    </p>
                    <Link href={profileHref} className="mt-1 block text-2xl font-semibold hover:underline">
                      {favorite.name}
                    </Link>
                    {favorite.location ? (
                      <p className="mt-1 text-sm text-white/80">{favorite.location}</p>
                    ) : null}
                  </div>
                </div>

                <div className="space-y-4 p-5">
                  <p className="min-h-[2.5rem] text-sm text-[#64748B]">
                    {favorite.headline || 'Guardado para volver a reservar más rápido.'}
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    <Link
                      href={profileHref}
                      className="inline-flex rounded-full bg-[#0E2A47] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                    >
                      Ver perfil
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        void removeFavorite(favorite.slug);
                      }}
                      className="inline-flex rounded-full border border-[#DCE4EC] bg-white px-4 py-2 text-sm font-semibold text-[#0E2A47] transition hover:-translate-y-0.5 hover:shadow-md"
                    >
                      Quitar
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </ClientShell>
  );
}
