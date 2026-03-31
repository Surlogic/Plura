import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import {
  getNextReviewReminder,
  markReviewReminderShown,
} from '@/services/clientReviewReminders';
import type { ReviewReminder } from '@/types/review';

type Props = {
  className?: string;
  refreshToken?: number;
};

export default function ClientReviewReminderCard({ className = '', refreshToken = 0 }: Props) {
  const router = useRouter();
  const [reminder, setReminder] = useState<ReviewReminder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dismissedBookingId, setDismissedBookingId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadReminder = async () => {
      setIsLoading(true);
      try {
        const nextReminder = await getNextReviewReminder();
        if (cancelled) return;

        if (!nextReminder.exists || !nextReminder.reminder) {
          setReminder(null);
          return;
        }

        const shownResult = await markReviewReminderShown(nextReminder.reminder.bookingId);
        if (cancelled) return;

        if (!shownResult.recorded) {
          setReminder(null);
          return;
        }

        setReminder({
          ...nextReminder.reminder,
          reminderCount: shownResult.reminderCount,
        });
        setDismissedBookingId(null);
      } catch {
        if (!cancelled) {
          setReminder(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadReminder();

    return () => {
      cancelled = true;
    };
  }, [refreshToken]);

  if (isLoading || !reminder || dismissedBookingId === reminder.bookingId) {
    return null;
  }

  const handleReviewClick = () => {
    void router.push({
      pathname: '/cliente/reservas',
      query: { bookingId: String(reminder.bookingId) },
    });
  };

  return (
    <section
      className={`rounded-[24px] border border-[#BFEDE7] bg-[linear-gradient(135deg,#F0FDFA_0%,#ECFEFF_100%)] p-5 shadow-sm ${className}`.trim()}
    >
      <p className="text-xs uppercase tracking-[0.3em] text-[#0F766E]">Recordatorio</p>
      <h2 className="mt-2 text-xl font-semibold text-[#0E2A47]">
        ¿Cómo te fue con tu turno en {reminder.professionalName}?
      </h2>
      <p className="mt-2 text-sm text-[#475569]">
        Tu reseña sobre {reminder.serviceName} ayuda a otros clientes y sigue disponible por un tiempo limitado.
      </p>

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleReviewClick}
          className="rounded-full bg-[#0B1D2A] px-4 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-md"
        >
          Dejar reseña
        </button>
        <button
          type="button"
          onClick={() => setDismissedBookingId(reminder.bookingId)}
          className="rounded-full border border-[#C7D2DA] bg-white px-4 py-2.5 text-sm font-semibold text-[#475569] transition hover:-translate-y-0.5 hover:shadow-sm"
        >
          Más tarde
        </button>
      </div>
    </section>
  );
}
