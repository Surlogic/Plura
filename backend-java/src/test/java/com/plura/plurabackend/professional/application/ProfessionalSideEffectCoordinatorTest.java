package com.plura.plurabackend.professional.application;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import com.plura.plurabackend.core.availability.AvailableSlotAsyncDispatcher;
import com.plura.plurabackend.core.availability.AvailableSlotService;
import com.plura.plurabackend.core.availability.ScheduleSummaryService;
import com.plura.plurabackend.core.cache.ProfileCacheService;
import com.plura.plurabackend.core.cache.SlotCacheService;
import com.plura.plurabackend.core.search.engine.SearchSyncPublisher;
import com.plura.plurabackend.professional.model.ProfessionalProfile;
import java.time.LocalDate;
import java.util.Set;
import org.junit.jupiter.api.Test;

class ProfessionalSideEffectCoordinatorTest {

    private final AvailableSlotAsyncDispatcher availableSlotAsyncDispatcher = mock(AvailableSlotAsyncDispatcher.class);
    private final AvailableSlotService availableSlotService = mock(AvailableSlotService.class);
    private final ScheduleSummaryService scheduleSummaryService = mock(ScheduleSummaryService.class);
    private final SlotCacheService slotCacheService = mock(SlotCacheService.class);
    private final ProfileCacheService profileCacheService = mock(ProfileCacheService.class);
    private final SearchSyncPublisher searchSyncPublisher = mock(SearchSyncPublisher.class);

    private final ProfessionalSideEffectCoordinator coordinator = new ProfessionalSideEffectCoordinator(
        availableSlotAsyncDispatcher,
        availableSlotService,
        scheduleSummaryService,
        slotCacheService,
        profileCacheService,
        searchSyncPublisher
    );

    @Test
    void rebuildsAffectedDaySynchronouslyWhenBookingChanges() {
        ProfessionalProfile profile = new ProfessionalProfile();
        profile.setId(25L);
        profile.setSlug("pro-demo");

        LocalDate affectedDate = LocalDate.of(2026, 4, 10);
        coordinator.onBookingChanged(profile, Set.of(affectedDate));

        verify(availableSlotService).rebuildProfessionalDay(25L, affectedDate);
        verify(scheduleSummaryService).requestRebuild(25L);
        verify(searchSyncPublisher).publishProfileChanged(25L);
        verify(slotCacheService).evictByPrefix("slots:25:");
        verify(profileCacheService).evictPublicPageBySlug("pro-demo");
        verify(profileCacheService).evictPublicSummaries();
        verify(availableSlotAsyncDispatcher, never()).rebuildProfessionalDay(25L, affectedDate);
    }
}
