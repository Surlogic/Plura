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
        <h2 className="text-2xl font-semibold text-[#0E2A47]">Nuestras reseñas</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {reviews.map((review) => (
            <div
              key={review.name}
              className="rounded-[24px] bg-white p-5 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-[linear-gradient(135deg,#1FB6A6,#0E2A47)]" />
                <div>
                  <p className="font-semibold text-[#0E2A47]">{review.name}</p>
                  <p className="text-sm text-[#6B7280]">★ {review.rating}</p>
                </div>
              </div>
              <p className="mt-4 text-sm text-[#6B7280]">{review.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
