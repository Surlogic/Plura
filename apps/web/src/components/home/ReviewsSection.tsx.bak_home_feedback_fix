const reviews = [
  {
    name: 'Camila Torres',
    rating: '5.0',
    text: 'Reservar fue simple y encontré un lugar increíble cerca de casa.',
  },
  {
    name: 'Juan Pérez',
    rating: '4.9',
    text: 'La experiencia fue impecable y la atención súper profesional.',
  },
  {
    name: 'Lucía Gómez',
    rating: '5.0',
    text: 'Me encantó poder ver la disponibilidad real antes de reservar.',
  },
];

export default function ReviewsSection() {
  return (
    <section className="px-4">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <h2 className="text-2xl font-semibold text-[color:var(--ink)]">Nuestras reseñas</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {reviews.map((review) => (
            <div
              key={review.name}
              className="rounded-[24px] border border-[color:var(--border-soft)] bg-[color:var(--surface-strong)] p-5 shadow-[var(--shadow-card)]"
            >
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-[linear-gradient(135deg,var(--brand-cyan),var(--brand-navy))]" />
                <div>
                  <p className="font-semibold text-[color:var(--ink)]">{review.name}</p>
                  <p className="text-sm text-[color:var(--ink-muted)]">★ {review.rating}</p>
                </div>
              </div>
              <p className="mt-4 text-sm text-[color:var(--ink-muted)]">{review.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
