import Image from 'next/image';
import Link from 'next/link';

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-[#0E2A47]/10 bg-[#F4F6F8]/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/logo.png"
            alt="Plura"
            width={40}
            height={40}
            className="h-10 w-10"
            priority
          />
          <span className="logo-type text-lg text-[#0E2A47]">Plura</span>
        </Link>
        <div className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center">
          <Link
            href="/profesional/auth/login"
            className="rounded-full border border-[#0E2A47]/10 bg-white px-4 py-2 text-[#0E2A47] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            Soy profesional o empresa
          </Link>
          <Link
            href="/cliente/auth/login"
            className="rounded-full bg-[#0E2A47] px-4 py-2 text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            Soy cliente
          </Link>
        </div>
      </div>
    </header>
  );
}
