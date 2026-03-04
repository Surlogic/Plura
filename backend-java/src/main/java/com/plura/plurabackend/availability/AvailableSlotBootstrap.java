package com.plura.plurabackend.availability;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Component
public class AvailableSlotBootstrap {

    private static final Logger LOGGER = LoggerFactory.getLogger(AvailableSlotBootstrap.class);
    private final AvailableSlotAsyncDispatcher availableSlotAsyncDispatcher;
    private final boolean enabled;
    private final int lookaheadDays;

    public AvailableSlotBootstrap(
        AvailableSlotAsyncDispatcher availableSlotAsyncDispatcher,
        @Value("${app.search.slot-bootstrap-enabled:true}") boolean enabled,
        @Value("${app.search.slot-bootstrap-days:7}") int lookaheadDays
    ) {
        this.availableSlotAsyncDispatcher = availableSlotAsyncDispatcher;
        this.enabled = enabled;
        this.lookaheadDays = lookaheadDays;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void onStartup() {
        if (!enabled) {
            LOGGER.info("Slot bootstrap inicial deshabilitado por configuración.");
            return;
        }
        int normalizedDays = Math.max(1, lookaheadDays);
        availableSlotAsyncDispatcher.rebuildAllNextDays(normalizedDays);
        LOGGER.info(
            "Rebuild inicial de slots encolado en segundo plano ({} días).",
            normalizedDays
        );
    }
}
