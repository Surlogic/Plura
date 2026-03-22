import { memo } from 'react';
import Button from '@/components/ui/Button';
import { useClientBookingTimeline } from '@/hooks/useClientBookingTimeline';
import {
  formatClientBookingTimelineAbsoluteTimestamp,
  formatClientBookingTimelineTimestamp,
  getClientBookingTimelineEventLabel,
  getClientBookingTimelineMeta,
  getClientBookingTimelineSummary,
} from '@/utils/clientBookingTimeline';

type ClientBookingTimelineProps = {
  bookingId: string;
  refreshToken?: number;
};

const LoadingState = () => (
  <div className="space-y-3">
    {Array.from({ length: 3 }).map((_, index) => (
      <div key={index} className="relative pl-5">
        <span className="absolute left-0 top-2 h-2 w-2 rounded-full bg-[#CBD5E1]" />
        {index < 2 ? (
          <span className="absolute left-[3px] top-5 h-[calc(100%+10px)] w-px bg-[#E2E8F0]" />
        ) : null}
        <div className="space-y-2 rounded-[16px] border border-[#E2E8F0] bg-white px-4 py-3.5">
          <div className="h-3 w-28 animate-pulse rounded-full bg-[#E2E8F0]" />
          <div className="h-4 w-4/5 animate-pulse rounded-full bg-[#E2E8F0]" />
          <div className="h-3 w-2/3 animate-pulse rounded-full bg-[#E2E8F0]" />
        </div>
      </div>
    ))}
  </div>
);

function ClientBookingTimeline({
  bookingId,
  refreshToken = 0,
}: ClientBookingTimelineProps) {
  const {
    bookingId: resolvedBookingId,
    items,
    isLoading,
    error,
    refresh,
  } = useClientBookingTimeline({
    bookingId,
    refreshToken,
  });

  return (
    <div className="mt-4 rounded-[18px] border border-[#E2E7EC] bg-[#F8FAFC] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-[#94A3B8]">Actividad</p>
          <h3 className="mt-2 text-base font-semibold text-[#0E2A47]">
            Seguimiento de la reserva
          </h3>
          <p className="mt-1 text-sm text-[#64748B]">
            Cambios importantes registrados para esta reserva
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
          <div
            role="alert"
            className="rounded-[16px] border border-[#FECACA] bg-[#FEF2F2] px-4 py-4 text-sm text-[#B91C1C]"
          >
            <p>{error}</p>
            <div className="mt-3">
              <Button type="button" size="sm" variant="secondary" onClick={() => void refresh()}>
                Reintentar
              </Button>
            </div>
          </div>
        ) : null}

        {!isLoading && !error && items.length === 0 ? (
          <div className="rounded-[16px] border border-dashed border-[#CBD5E1] bg-white px-4 py-5 text-sm text-[#64748B]">
            Todavía no hay actividad registrada para esta reserva.
          </div>
        ) : null}

        {!isLoading && !error && items.length > 0 ? (
          <div className="space-y-3">
            {items.map((item, index) => {
              const meta = getClientBookingTimelineMeta(item);

              return (
                <article key={item.id} className="relative pl-5">
                  <span className="absolute left-0 top-2 h-2 w-2 rounded-full bg-[#1FB6A6]" />
                  {index < items.length - 1 ? (
                    <span className="absolute left-[3px] top-5 h-[calc(100%+10px)] w-px bg-[#D9E2EC]" />
                  ) : null}

                  <div className="rounded-[16px] border border-[#E2E7EC] bg-white px-4 py-3.5">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-[#0E2A47]">
                          {getClientBookingTimelineEventLabel(item.type)}
                        </p>
                        <p className="mt-1 text-sm leading-6 text-[#475569]">
                          {getClientBookingTimelineSummary(item)}
                        </p>
                      </div>
                      <p
                        className="text-xs font-medium text-[#64748B]"
                        title={formatClientBookingTimelineAbsoluteTimestamp(item.occurredAt || item.createdAt)}
                      >
                        {formatClientBookingTimelineTimestamp(item.occurredAt || item.createdAt)}
                      </p>
                    </div>

                    {meta.amountLabel || meta.financialStatusLabel || meta.providerStatusLabel ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {meta.amountLabel ? (
                          <span className="rounded-full border border-[#D9E2EC] bg-[#F8FAFC] px-3 py-1 text-[0.72rem] font-semibold text-[#0E2A47]">
                            {meta.amountLabel}
                          </span>
                        ) : null}
                        {meta.financialStatusLabel ? (
                          <span className="rounded-full border border-[#D9E2EC] bg-[#F8FAFC] px-3 py-1 text-[0.72rem] font-semibold text-[#475569]">
                            {meta.financialStatusLabel}
                          </span>
                        ) : null}
                        {meta.providerStatusLabel ? (
                          <span className="rounded-full border border-[#D9E2EC] bg-[#F8FAFC] px-3 py-1 text-[0.72rem] font-semibold text-[#475569]">
                            Estado del pago: {meta.providerStatusLabel}
                          </span>
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

export default memo(ClientBookingTimeline);
