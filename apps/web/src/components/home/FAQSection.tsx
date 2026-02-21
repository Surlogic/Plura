const faqs = [
  '¿Cómo reservo un turno en Plura?',
  '¿Puedo cancelar o reprogramar una reserva?',
  '¿Cómo encuentro profesionales cerca de mí?',
  '¿Qué métodos de pago se aceptan?',
];

export default function FAQSection() {
  return (
    <section className="px-4">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <h2 className="text-2xl font-semibold text-[#0E2A47]">Preguntas frecuentes</h2>
        <div className="space-y-3">
          {faqs.map((question) => (
            <div
              key={question}
              className="rounded-[20px] bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <p className="font-semibold text-[#0E2A47]">{question}</p>
                <span className="text-2xl text-[#1FB6A6]">+</span>
              </div>
              <p className="mt-2 text-sm text-[#6B7280]">
                Respuesta breve para acompañar el acordeón visual.
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
