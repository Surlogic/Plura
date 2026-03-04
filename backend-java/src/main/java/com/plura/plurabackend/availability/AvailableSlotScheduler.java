package com.plura.plurabackend.availability;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class AvailableSlotScheduler {

    private final AvailableSlotAsyncDispatcher availableSlotAsyncDispatcher;
    private final int lookaheadDays;

    public AvailableSlotScheduler(
        AvailableSlotAsyncDispatcher availableSlotAsyncDispatcher,
        @Value("${app.search.slot-rebuild-days:30}") int lookaheadDays
    ) {
        this.availableSlotAsyncDispatcher = availableSlotAsyncDispatcher;
        this.lookaheadDays = lookaheadDays;
    }

    @Scheduled(cron = "${app.search.slot-rebuild-cron:0 0 2 * * *}")
    public void rebuildSlotsNightly() {
        availableSlotAsyncDispatcher.rebuildAllNextDays(Math.max(1, lookaheadDays));
    }
}
