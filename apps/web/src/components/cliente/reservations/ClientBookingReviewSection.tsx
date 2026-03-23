import { useCallback, useEffect, useState } from 'react';
import {
  createBookingReview,
  getBookingReview,
  getReviewEligibility,
} from '@/services/clientReviews';
import type { BookingReviewResponse, ReviewEligibilityResponse } from '@/types/review';

type Props = {
  bookingId: string;
};

const StarSelector = ({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  disabled: boolean;
}) => {
  const [hover, setHover] = useState(0);

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={disabled}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(star)}
          className="text-2xl transition disabled:cursor-not-allowed"
        >
          <span className={star <= (hover || value) ? 'text-[#F59E0B]' : 'text-[#CBD5E1]'}>
            ★
          </span>
        </button>
      ))}
    </div>
  );
};

export default function ClientBookingReviewSection({ bookingId }: Props) {
  const [eligibility, setEligibility] = useState<ReviewEligibilityResponse | null>(null);
  const [existingReview, setExistingReview] = useState<BookingReviewResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const elig = await getReviewEligibility(bookingId);
      setEligibility(elig);
      if (elig.alreadyReviewed) {
        const review = await getBookingReview(bookingId);
        setExistingReview(review);
      }
    } catch {
      // Silently fail - section just won't show
    } finally {
      setIsLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSubmit = async () => {
    if (rating === 0) {
      setError('Elegí una calificación.');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const review = await createBookingReview(bookingId, {
        rating,
        text: text.trim() || null,
      });
      setExistingReview(review);
      setSuccess(true);
    } catch (submitError) {
      const message =
        submitError instanceof Error ? submitError.message : 'No pudimos enviar tu reseña.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return null;
  if (!eligibility) return null;

  // Already reviewed - show existing review
  if (existingReview) {
    return (
      <div className="mt-4 rounded-[18px] border border-[#E2E7EC] bg-white p-4">
        <p className="text-xs uppercase tracking-[0.25em] text-[#94A3B8]">Tu reseña</p>
        <div className="mt-3 flex items-center gap-2">
          <span className="text-lg text-[#F59E0B]">
            {'★'.repeat(existingReview.rating)}
            {'★'.repeat(5 - existingReview.rating).split('').map(() => '').join('')}
          </span>
          <span className="text-sm font-semibold text-[#0E2A47]">{existingReview.rating}/5</span>
        </div>
        {existingReview.text ? (
          <p className="mt-2 text-sm text-[#475569]">{existingReview.text}</p>
        ) : null}
        {success ? (
          <p className="mt-2 text-xs text-[#0F766E]">Reseña enviada correctamente.</p>
        ) : null}
      </div>
    );
  }

  // Not eligible
  if (!eligibility.eligible) return null;

  // Show review form
  return (
    <div className="mt-4 rounded-[18px] border border-[#BFEDE7] bg-[#F0FDFA] p-4">
      <p className="text-xs uppercase tracking-[0.25em] text-[#94A3B8]">Dejá tu reseña</p>
      <p className="mt-1 text-sm text-[#475569]">
        Tu opinión ayuda a otros clientes a elegir mejor.
      </p>

      <div className="mt-3">
        <StarSelector value={rating} onChange={setRating} disabled={isSubmitting} />
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Contanos tu experiencia (opcional)"
        maxLength={2000}
        disabled={isSubmitting}
        className="mt-3 min-h-20 w-full rounded-[14px] border border-[#D9E2EC] bg-white px-3 py-2 text-sm text-[#0E2A47] outline-none transition focus:border-[#1FB6A6] disabled:opacity-60"
      />

      {error ? (
        <p className="mt-2 text-xs text-[#B91C1C]">{error}</p>
      ) : null}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={isSubmitting || rating === 0}
        className="mt-3 w-full rounded-full bg-[#0B1D2A] px-4 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? 'Enviando...' : 'Enviar reseña'}
      </button>
    </div>
  );
}
