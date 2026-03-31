package com.plura.plurabackend.professional.application;

import com.plura.plurabackend.core.availability.AvailableSlotAsyncDispatcher;
import com.plura.plurabackend.core.availability.AvailableSlotService;
import com.plura.plurabackend.core.availability.ScheduleSummaryService;
import com.plura.plurabackend.core.cache.ProfileCacheService;
import com.plura.plurabackend.core.cache.SlotCacheService;
import com.plura.plurabackend.professional.model.ProfessionalProfile;
import com.plura.plurabackend.core.search.engine.SearchSyncPublisher;
import java.time.LocalDate;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@Component
public class ProfessionalSideEffectCoordinator {

    private static final Logger LOGGER = LoggerFactory.getLogger(ProfessionalSideEffectCoordinator.class);

    private final AvailableSlotAsyncDispatcher availableSlotAsyncDispatcher;
    private final AvailableSlotService availableSlotService;
    private final ScheduleSummaryService scheduleSummaryService;
    private final SlotCacheService slotCacheService;
    private final ProfileCacheService profileCacheService;
    private final SearchSyncPublisher searchSyncPublisher;

    public ProfessionalSideEffectCoordinator(
        AvailableSlotAsyncDispatcher availableSlotAsyncDispatcher,
        AvailableSlotService availableSlotService,
        ScheduleSummaryService scheduleSummaryService,
        SlotCacheService slotCacheService,
        ProfileCacheService profileCacheService,
        SearchSyncPublisher searchSyncPublisher
    ) {
        this.availableSlotAsyncDispatcher = availableSlotAsyncDispatcher;
        this.availableSlotService = availableSlotService;
        this.scheduleSummaryService = scheduleSummaryService;
        this.slotCacheService = slotCacheService;
        this.profileCacheService = profileCacheService;
        this.searchSyncPublisher = searchSyncPublisher;
    }

    public void onProfileChanged(ProfessionalProfile profile) {
        if (profile == null || profile.getId() == null) {
            return;
        }
        Long professionalId = profile.getId();
        runAfterCommitOrNow(
            () -> {
                searchSyncPublisher.publishProfileChanged(professionalId);
                evictProfileCaches(profile);
            },
            "No se pudieron coordinar side effects de perfil para profesional {}",
            professionalId
        );
    }

    public void onScheduleChanged(ProfessionalProfile profile, int days) {
        if (profile == null || profile.getId() == null) {
            return;
        }
        requestAvailabilityRebuild(profile.getId(), days);
        onProfileChanged(profile);
    }

    public void onServiceCatalogChanged(ProfessionalProfile profile, int days) {
        onScheduleChanged(profile, days);
    }

    public void onBookingChanged(ProfessionalProfile profile, Set<LocalDate> affectedDates) {
        if (profile == null || profile.getId() == null) {
            return;
        }
        if (affectedDates != null) {
            affectedDates.stream()
                .filter(date -> date != null)
                .forEach(date -> requestAvailabilityRebuildDay(profile.getId(), date));
        }
        onProfileChanged(profile);
    }

    public void evictProfileCaches(ProfessionalProfile profile) {
        if (profile == null || profile.getId() == null) {
            return;
        }
        if (profile.getSlug() != null && !profile.getSlug().isBlank()) {
            slotCacheService.evictByPrefix("slots:" + profile.getId() + ":");
            profileCacheService.evictPublicPageBySlug(profile.getSlug());
        }
        profileCacheService.evictPublicSummaries();
    }

    private void requestAvailabilityRebuild(Long professionalId, int days) {
        runAfterCommitOrNow(
            () -> dispatchAvailabilityRebuild(professionalId, days),
            "No se pudo encolar rebuild async para profesional {}",
            professionalId
        );
    }

    private void requestAvailabilityRebuildDay(Long professionalId, LocalDate date) {
        runAfterCommitOrNow(
            () -> dispatchAvailabilityRebuildDay(professionalId, date),
            "No se pudo encolar rebuild async del día {} para profesional {}",
            date,
            professionalId
        );
    }

    private void runAfterCommitOrNow(Runnable action, String warningMessage, Object... warningArgs) {
        try {
            if (TransactionSynchronizationManager.isSynchronizationActive()) {
                TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                    @Override
                    public void afterCommit() {
                        action.run();
                    }
                });
                return;
            }
            action.run();
        } catch (RuntimeException exception) {
            Object[] args = new Object[warningArgs.length + 1];
            System.arraycopy(warningArgs, 0, args, 0, warningArgs.length);
            args[warningArgs.length] = exception;
            LOGGER.warn(warningMessage, args);
        }
    }

    private void dispatchAvailabilityRebuild(Long professionalId, int days) {
        try {
            availableSlotAsyncDispatcher.rebuildProfessionalNextDays(professionalId, days);
            scheduleSummaryService.requestRebuild(professionalId);
        } catch (RuntimeException exception) {
            LOGGER.warn(
                "No se pudo encolar rebuild async para profesional {} afterCommit",
                professionalId,
                exception
            );
        }
    }

    private void dispatchAvailabilityRebuildDay(Long professionalId, LocalDate date) {
        try {
            // Los cambios de booking necesitan reflejarse enseguida en discovery y agenda.
            availableSlotService.rebuildProfessionalDay(professionalId, date);
            scheduleSummaryService.requestRebuild(professionalId);
        } catch (RuntimeException exception) {
            LOGGER.warn(
                "No se pudo reconstruir disponibilidad del día {} para profesional {} afterCommit",
                date,
                professionalId,
                exception
            );
        }
    }
}
