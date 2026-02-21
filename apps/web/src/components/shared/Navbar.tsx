import Link from 'next/link';

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-[#0E2A47]/10 bg-[#F4F6F8]/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-[linear-gradient(135deg,#1FB6A6,#0E2A47)]" />
          <span className="text-lg font-semibold text-[#0E2A47]">Plura</span>
        </div>
        <div className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center">
          <button className="rounded-full border border-[#0E2A47]/10 bg-white px-4 py-2 text-[#0E2A47] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            Soy profesional o empresa
          </button>
          <Link
            href="/pages/auth/register"
            className="rounded-full bg-[#0E2A47] px-4 py-2 text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            Soy cliente
          </Link>
        </div>
      </div>
    </header>
  );
}
