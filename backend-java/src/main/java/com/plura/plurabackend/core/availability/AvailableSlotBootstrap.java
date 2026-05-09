package com.plura.plurabackend.core.availability;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

/**
 * AvailableSlotBootstrap es un componente de dominio del modulo disponibilidad.
 * Responsabilidad: encapsular comportamiento propio del modulo y mantenerlo fuera de controllers u otras capas.
 * Colabora con: availableSlotAsyncDispatcher, enabled, slotRebuildEnabled, lookaheadDays.
 * Foco funcional: la responsabilidad indicada por su paquete y nombre.
 */
@Component
public class AvailableSlotBootstrap {

    private static final Logger LOGGER = LoggerFactory.getLogger(AvailableSlotBootstrap.class);
    private final AvailableSlotAsyncDispatcher availableSlotAsyncDispatcher;
    private final boolean enabled;
    private final boolean slotRebuildEnabled;
    private final int lookaheadDays;

    public AvailableSlotBootstrap(
        AvailableSlotAsyncDispatcher availableSlotAsyncDispatcher,
        @Value("${app.search.slot-bootstrap-enabled:true}") boolean enabled,
        @Value("${feature.availability.slot-rebuild-enabled:true}") boolean slotRebuildEnabled,
        @Value("${app.search.slot-bootstrap-days:7}") int lookaheadDays
    ) {
        this.availableSlotAsyncDispatcher = availableSlotAsyncDispatcher;
        this.enabled = enabled;
        this.slotRebuildEnabled = slotRebuildEnabled;
        this.lookaheadDays = lookaheadDays;
    }

    /**
     * Ejecuta la inicializacion necesaria cuando Spring termina de levantar el contexto.
     */
    @EventListener(ApplicationReadyEvent.class)
    public void onStartup() {
        if (!enabled) {
            LOGGER.info("Slot bootstrap inicial deshabilitado por configuración.");
            return;
        }
        if (!slotRebuildEnabled) {
            LOGGER.info("Slot rebuild deshabilitado por flag AVAILABLE_SLOT_REBUILD_ENABLED.");
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
