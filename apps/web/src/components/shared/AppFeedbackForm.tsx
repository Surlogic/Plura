import { useState } from 'react';
import type { CreateAppFeedbackRequest } from '@/types/appFeedback';

type Props = {
  onSubmit: (request: CreateAppFeedbackRequest) => Promise<void>;
  contextSource: string;
};

const CATEGORIES = [
  { value: '', label: 'Sin categoria' },
  { value: 'UX', label: 'Experiencia de uso' },
  { value: 'BUG', label: 'Error o bug' },
  { value: 'PAYMENTS', label: 'Pagos' },
  { value: 'BOOKING', label: 'Reservas' },
  { value: 'DISCOVERY', label: 'Busqueda' },
  { value: 'OTHER', label: 'Otro' },
];

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

export default function AppFeedbackForm({ onSubmit, contextSource }: Props) {
  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');
  const [category, setCategory] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      setError('Elegi una calificacion.');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        rating,
        text: text.trim() || undefined,
        category: category || undefined,
        contextSource,
      });
      setSuccess(true);
      setRating(0);
      setText('');
      setCategory('');
    } catch {
      setError('No se pudo enviar el feedback. Intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="space-y-3">
        <div className="rounded-[16px] border border-[color:var(--success-soft)] bg-[color:var(--surface)] px-4 py-3">
          <p className="text-sm font-semibold text-[color:var(--success)]">Gracias por tu feedback</p>
          <p className="mt-1 text-xs text-[color:var(--ink-muted)]">Tu opinion nos ayuda a mejorar Plura.</p>
        </div>
        <button
          type="button"
          onClick={() => setSuccess(false)}
          className="text-xs font-semibold text-[color:var(--primary)] underline underline-offset-4"
        >
          Enviar otro feedback
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-xs font-semibold text-[color:var(--ink-muted)]">Calificacion *</p>
        <StarSelector value={rating} onChange={setRating} disabled={isSubmitting} />
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold text-[color:var(--ink-muted)]">Categoria (opcional)</p>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          disabled={isSubmitting}
          className="h-10 rounded-[16px] border border-[color:var(--border-soft)] bg-[color:var(--surface-soft)] px-3 text-sm text-[color:var(--ink)] focus:border-[color:var(--accent)] focus:outline-none focus:ring-4 focus:ring-[color:var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {CATEGORIES.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold text-[color:var(--ink-muted)]">Comentario (opcional)</p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={isSubmitting}
          maxLength={2000}
          rows={3}
          placeholder="Conta nos tu experiencia o sugerencia..."
          className="w-full rounded-[16px] border border-[color:var(--border-soft)] bg-[color:var(--surface-soft)] px-4 py-3 text-sm text-[color:var(--ink)] placeholder:text-[color:var(--ink-faint)] focus:border-[color:var(--accent)] focus:outline-none focus:ring-4 focus:ring-[color:var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-60"
        />
      </div>

      {error ? (
        <p className="text-xs font-semibold text-[color:var(--error)]">{error}</p>
      ) : null}

      <button
        type="button"
        disabled={isSubmitting || rating === 0}
        onClick={() => {
          void handleSubmit();
        }}
        className="rounded-full bg-[color:var(--primary)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[color:var(--primary-strong)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? 'Enviando...' : 'Enviar feedback'}
      </button>
    </div>
  );
}
