import Image from 'next/image';

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-[#0E2A47]/10 bg-[#F4F6F8] text-[#0E2A47]">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-3">
          <div className="flex items-center gap-0">
            <Image
              src="/logo.png"
              alt="Plura"
              width={96}
              height={96}
              className="h-24 w-24 object-contain"
            />
            <span className="-ml-4 logo-type text-3xl">Plura</span>
          </div>
          <p className="text-sm text-[#6B7280]">
            Tu próximo turno, en segundos.
          </p>
        </div>
        <div className="space-y-2 text-sm text-[#6B7280]">
          <p className="font-semibold text-[#0E2A47]">Plataforma</p>
          <p>Cómo funciona</p>
          <p>Planes para negocios</p>
          <p>Ayuda y soporte</p>
        </div>
        <div className="space-y-2 text-sm text-[#6B7280]">
          <p className="font-semibold text-[#0E2A47]">Comunidad</p>
          <p>Profesionales destacados</p>
          <p>Reseñas reales</p>
          <p>Recomendaciones</p>
        </div>
        <div className="space-y-2 text-sm text-[#6B7280]">
          <p className="font-semibold text-[#0E2A47]">Contacto</p>
          <p>hola@plura.com</p>
          <p>Buenos Aires, AR</p>
        </div>
      </div>
      <div className="border-t border-[#0E2A47]/10 px-4 py-6 text-center text-xs text-[#6B7280]">
        © 2026 Plura. Todos los derechos reservados.
      </div>
    </footer>
  );
}
