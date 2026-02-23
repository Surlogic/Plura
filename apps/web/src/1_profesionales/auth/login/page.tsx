import Link from 'next/link';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';

export default function ProfesionalLoginPage() {
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

          <form className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#0E2A47]">Gmail</label>
              <input
                className="h-12 w-full rounded-[16px] border border-[#0E2A47]/10 bg-[#F4F6F8] px-4 text-sm text-[#0E2A47] placeholder:text-[#6B7280] focus:outline-none focus:ring-2 focus:ring-[#1FB6A6]/40"
                placeholder="tucorreo@gmail.com"
                type="email"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[#0E2A47]">Contraseña</label>
              <input
                type="password"
                className="h-12 w-full rounded-[16px] border border-[#0E2A47]/10 bg-[#F4F6F8] px-4 text-sm text-[#0E2A47] placeholder:text-[#6B7280] focus:outline-none focus:ring-2 focus:ring-[#1FB6A6]/40"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              className="h-12 w-full rounded-full bg-[linear-gradient(135deg,#1FB6A6,#0E2A47)] text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
            >
              Iniciar sesión
            </button>
          </form>

          <p className="text-center text-xs text-[#6B7280]">
            ¿No tenés cuenta?{' '}
            <Link
              href="/profesional/register"
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
