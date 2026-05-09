package com.plura.plurabackend.core.availability;

import java.time.LocalDate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

/**
 * AvailableSlotAsyncDispatcher es un despachador asincronico del modulo disponibilidad.
 * Responsabilidad: encolar o disparar trabajo fuera del flujo principal del request.
 * Colabora con: availableSlotService, slotRebuildEnabled.
 * Foco funcional: la responsabilidad indicada por su paquete y nombre.
 */
@Service
public class AvailableSlotAsyncDispatcher {

    private static final Logger LOGGER = LoggerFactory.getLogger(AvailableSlotAsyncDispatcher.class);

    private final AvailableSlotService availableSlotService;
    private final boolean slotRebuildEnabled;

    public AvailableSlotAsyncDispatcher(
        AvailableSlotService availableSlotService,
        @Value("${feature.availability.slot-rebuild-enabled:true}") boolean slotRebuildEnabled
    ) {
        this.availableSlotService = availableSlotService;
        this.slotRebuildEnabled = slotRebuildEnabled;
    }

    /**
     * Reconstruye profesional proximos dias a partir de la fuente de verdad actual.
     */
    @Async("availableSlotExecutor")
    public void rebuildProfessionalNextDays(Long professionalId, int days) {
        if (!slotRebuildEnabled) {
            return;
        }
        try {
            availableSlotService.rebuildProfessionalNextDays(professionalId, days);
        } catch (RuntimeException exception) {
            LOGGER.error("Async rebuildProfessionalNextDays failed for professional {}", professionalId, exception);
            throw exception;
        }
    }

    /**
     * Reconstruye profesional dia a partir de la fuente de verdad actual.
     */
    @Async("availableSlotExecutor")
    public void rebuildProfessionalDay(Long professionalId, LocalDate date) {
        if (!slotRebuildEnabled) {
            return;
        }
        try {
            availableSlotService.rebuildProfessionalDay(professionalId, date);
        } catch (RuntimeException exception) {
            LOGGER.error("Async rebuildProfessionalDay failed for professional {} on {}", professionalId, date, exception);
            throw exception;
        }
    }

    /**
     * Reconstruye todos proximos dias a partir de la fuente de verdad actual.
     */
    @Async("availableSlotExecutor")
    public void rebuildAllNextDays(int days) {
        if (!slotRebuildEnabled) {
            return;
        }
        try {
            availableSlotService.rebuildAllNextDays(days);
        } catch (RuntimeException exception) {
            LOGGER.error("Async rebuildAllNextDays failed for {} days", days, exception);
            throw exception;
        }
    }

    /**
     * Reconstruye particion proximos dias a partir de la fuente de verdad actual.
     */
    @Async("availableSlotExecutor")
    public void rebuildShardNextDays(int days, int shardCount, int shardIndex) {
        if (!slotRebuildEnabled) {
            return;
        }
        try {
            availableSlotService.rebuildShardNextDays(days, shardCount, shardIndex);
        } catch (RuntimeException exception) {
            LOGGER.error(
                "Async rebuildShardNextDays failed for days={}, shardCount={}, shardIndex={}",
                days,
                shardCount,
                shardIndex,
                exception
            );
            throw exception;
        }
    }
}
