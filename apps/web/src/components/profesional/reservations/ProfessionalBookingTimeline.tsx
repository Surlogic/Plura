'use client';

import Button from '@/components/ui/Button';
import { useProfessionalBookingTimeline } from '@/hooks/useProfessionalBookingTimeline';
import {
  formatProfessionalBookingTimelineAbsoluteTimestamp,
  formatProfessionalBookingTimelineTimestamp,
  getProfessionalBookingTimelineEventLabel,
  getProfessionalBookingTimelineMeta,
  getProfessionalBookingTimelineSummary,
} from '@/utils/bookingTimeline';

type ProfessionalBookingTimelineProps = {
  bookingId: string;
  refreshToken?: number;
};

const LoadingState = () => (
  <div className="space-y-4">
    {Array.from({ length: 3 }).map((_, index) => (
      <div key={index} className="relative pl-6">
        <span className="absolute left-0 top-2 h-2.5 w-2.5 rounded-full bg-[#CBD5E1]" />
        {index < 2 ? (
          <span className="absolute left-[4px] top-5 h-[calc(100%+12px)] w-px bg-[#E2E8F0]" />
        ) : null}
        <div className="space-y-2 rounded-[18px] border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-4">
          <div className="h-3 w-32 animate-pulse rounded-full bg-[#E2E8F0]" />
          <div className="h-4 w-4/5 animate-pulse rounded-full bg-[#E2E8F0]" />
          <div className="h-3 w-2/3 animate-pulse rounded-full bg-[#E2E8F0]" />
        </div>
      </div>
    ))}
  </div>
);

export default function ProfessionalBookingTimeline({
  bookingId,
  refreshToken = 0,
}: ProfessionalBookingTimelineProps) {
  const {
    bookingId: resolvedBookingId,
    items,
    isLoading,
    error,
    refresh,
  } = useProfessionalBookingTimeline({
    bookingId,
    refreshToken,
  });

  return (
    <div className="mt-4 rounded-[18px] border border-[#E2E7EC] bg-[#F8FAFC] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-[#94A3B8]">Actividad</p>
          <h3 className="mt-2 text-base font-semibold text-[#0E2A47]">
            Timeline de la reserva
          </h3>
          <p className="mt-1 text-sm text-[#64748B]">
            Eventos operativos y financieros registrados para esta reserva
            {resolvedBookingId ? ` #${resolvedBookingId}` : ''}.
          </p>
        </div>

        <Button type="button" size="sm" variant="secondary" onClick={() => void refresh()}>
          Actualizar
        </Button>
      </div>

      <div className="mt-4">
        {isLoading ? <LoadingState /> : null}

        {!isLoading && error ? (
          <div role="alert" className="rounded-[18px] border border-[#FECACA] bg-[#FEF2F2] px-4 py-4 text-sm text-[#B91C1C]">
            <p>{error}</p>
            <div className="mt-3">
              <Button type="button" size="sm" variant="secondary" onClick={() => void refresh()}>
                Reintentar
              </Button>
            </div>
          </div>
        ) : null}

        {!isLoading && !error && items.length === 0 ? (
          <div className="rounded-[18px] border border-dashed border-[#CBD5E1] bg-[#F8FAFC] px-4 py-5 text-sm text-[#64748B]">
            Todavía no hay actividad registrada para esta reserva.
          </div>
        ) : null}

        {!isLoading && !error && items.length > 0 ? (
          <div className="space-y-4">
            {items.map((item, index) => {
              const meta = getProfessionalBookingTimelineMeta(item);

              return (
                <article key={item.id} className="relative pl-6">
                  <span className="absolute left-0 top-2 h-2.5 w-2.5 rounded-full bg-[#1FB6A6]" />
                  {index < items.length - 1 ? (
                    <span className="absolute left-[4px] top-5 h-[calc(100%+12px)] w-px bg-[#E2E8F0]" />
                  ) : null}

                  <div className="rounded-[18px] border border-[#E2E7EC] bg-white px-4 py-4">
                    <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-[#0E2A47]">
                          {getProfessionalBookingTimelineEventLabel(item.type)}
                        </p>
                        <p className="mt-1 text-sm leading-6 text-[#475569]">
                          {getProfessionalBookingTimelineSummary(item)}
                        </p>
                      </div>
                      <p
                        className="text-xs font-medium text-[#64748B]"
                        title={formatProfessionalBookingTimelineAbsoluteTimestamp(item.occurredAt || item.createdAt)}
                      >
                        {formatProfessionalBookingTimelineTimestamp(item.occurredAt || item.createdAt)}
                      </p>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {meta.amountLabel ? (
                        <span className="rounded-full border border-[#D9E2EC] bg-white px-3 py-1 text-[0.72rem] font-semibold text-[#0E2A47]">
                          {meta.amountLabel}
                        </span>
                      ) : null}
                      {meta.financialStatusLabel ? (
                        <span className="rounded-full border border-[#D9E2EC] bg-white px-3 py-1 text-[0.72rem] font-semibold text-[#475569]">
                          {meta.financialStatusLabel}
                        </span>
                      ) : null}
                      {meta.providerStatusLabel ? (
                        <span className="rounded-full border border-[#D9E2EC] bg-white px-3 py-1 text-[0.72rem] font-semibold text-[#475569]">
                          Proveedor: {meta.providerStatusLabel}
                        </span>
                      ) : null}
                      {item.bookingId ? (
                        <span className="rounded-full border border-[#D9E2EC] bg-white px-3 py-1 text-[0.72rem] font-semibold text-[#475569]">
                          Reserva #{item.bookingId}
                        </span>
                      ) : null}
                    </div>

                    {meta.actorLabel || meta.sourceLabel ? (
                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-[#EEF2F6] pt-3 text-xs text-[#64748B]">
                        {meta.actorLabel ? (
                          <span className="font-medium">
                            Actor: {meta.actorLabel}
                          </span>
                        ) : null}
                        {meta.sourceLabel ? (
                          <span>Origen: {meta.sourceLabel}</span>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}
