package com.plura.plurabackend.account;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.plura.plurabackend.auth.SessionService;
import com.plura.plurabackend.availability.AvailableSlotAsyncDispatcher;
import com.plura.plurabackend.availability.ScheduleSummaryService;
import com.plura.plurabackend.availability.repository.AvailableSlotRepository;
import com.plura.plurabackend.billing.BillingService;
import com.plura.plurabackend.booking.event.BookingEventService;
import com.plura.plurabackend.booking.model.Booking;
import com.plura.plurabackend.booking.model.BookingOperationalStatus;
import com.plura.plurabackend.booking.repository.BookingRepository;
import com.plura.plurabackend.cache.ProfileCacheService;
import com.plura.plurabackend.cache.SlotCacheService;
import com.plura.plurabackend.professional.model.ProfessionalProfile;
import com.plura.plurabackend.professional.repository.ProfessionalProfileRepository;
import com.plura.plurabackend.professional.service.repository.ProfesionalServiceRepository;
import com.plura.plurabackend.search.engine.SearchSyncPublisher;
import com.plura.plurabackend.user.model.User;
import com.plura.plurabackend.user.model.UserRole;
import com.plura.plurabackend.user.repository.UserRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;

class AccountDeletionServiceTest {

    private final UserRepository userRepository = mock(UserRepository.class);
    private final ProfessionalProfileRepository professionalProfileRepository = mock(ProfessionalProfileRepository.class);
    private final BookingRepository bookingRepository = mock(BookingRepository.class);
    private final SessionService sessionService = mock(SessionService.class);
    private final BillingService billingService = mock(BillingService.class);
    private final AvailableSlotRepository availableSlotRepository = mock(AvailableSlotRepository.class);
    private final AvailableSlotAsyncDispatcher availableSlotAsyncDispatcher = mock(AvailableSlotAsyncDispatcher.class);
    private final ScheduleSummaryService scheduleSummaryService = mock(ScheduleSummaryService.class);
    private final ProfesionalServiceRepository profesionalServiceRepository = mock(ProfesionalServiceRepository.class);
    private final ProfileCacheService profileCacheService = mock(ProfileCacheService.class);
    private final SlotCacheService slotCacheService = mock(SlotCacheService.class);
    private final SearchSyncPublisher searchSyncPublisher = mock(SearchSyncPublisher.class);
    private final PasswordEncoder passwordEncoder = mock(PasswordEncoder.class);
    private final BookingEventService bookingEventService = mock(BookingEventService.class);

    private final AccountDeletionService service = new AccountDeletionService(
        userRepository,
        professionalProfileRepository,
        bookingRepository,
        sessionService,
        billingService,
        availableSlotRepository,
        availableSlotAsyncDispatcher,
        scheduleSummaryService,
        profesionalServiceRepository,
        profileCacheService,
        slotCacheService,
        searchSyncPublisher,
        passwordEncoder,
        bookingEventService,
        "America/Montevideo"
    );

    @Test
    void deletesClientAccountAndCancelsFutureBookings() {
        User user = clientUser(10L, "cliente@plura.com");
        ProfessionalProfile professional = professionalProfile(20L, "pro-demo");
        Booking booking = booking(100L, user, professional, LocalDateTime.now().plusDays(2));

        when(userRepository.findByIdAndDeletedAtIsNull(10L)).thenReturn(Optional.of(user));
        when(bookingRepository.findByUser_IdAndOperationalStatusInAndStartDateTimeGreaterThanEqual(
            eq(10L),
            any(),
            any()
        )).thenReturn(List.of(booking));
        when(sessionService.revokeReasonAccountDeletion()).thenReturn("ACCOUNT_DELETION");
        when(passwordEncoder.encode(any())).thenReturn("hashed-password");

        service.deleteCurrentAccount("10", UserRole.USER);

        assertEquals(BookingOperationalStatus.CANCELLED, booking.getOperationalStatus());
        assertEquals("Cuenta eliminada", user.getFullName());
        assertNotNull(user.getDeletedAt());
        assertFalse(user.getEmail().contains("cliente@plura.com"));

        verify(bookingRepository).saveAll(List.of(booking));
        verify(availableSlotAsyncDispatcher).rebuildProfessionalDay(eq(20L), eq(booking.getStartDateTime().toLocalDate()));
        verify(scheduleSummaryService).requestRebuild(20L);
        verify(sessionService).revokeAllSessionsForUser(eq(user), eq("ACCOUNT_DELETION"));
        verify(searchSyncPublisher).publishProfilesChanged(List.of(20L));
        verify(billingService, never()).cancelSubscriptionForProfessional(any(), eq(true));
    }

    @Test
    void deletesProfessionalAccountAndCancelsSubscriptionImmediately() {
        User user = professionalUser(30L, "pro@plura.com");
        ProfessionalProfile profile = professionalProfile(40L, "pro-slug");
        profile.setUser(user);
        Booking booking = booking(101L, clientUser(31L, "other@plura.com"), profile, LocalDateTime.now().plusDays(1));

        when(userRepository.findByIdAndDeletedAtIsNull(30L)).thenReturn(Optional.of(user));
        when(professionalProfileRepository.findByUser_Id(30L)).thenReturn(Optional.of(profile));
        when(bookingRepository.findByProfessional_IdAndOperationalStatusInAndStartDateTimeGreaterThanEqual(
            eq(40L),
            any(),
            any()
        )).thenReturn(List.of(booking));
        when(sessionService.revokeReasonAccountDeletion()).thenReturn("ACCOUNT_DELETION");
        when(passwordEncoder.encode(any())).thenReturn("hashed-password");

        service.deleteCurrentAccount("30", UserRole.PROFESSIONAL);

        assertEquals(BookingOperationalStatus.CANCELLED, booking.getOperationalStatus());
        assertEquals("Cuenta eliminada", user.getFullName());
        assertNotNull(user.getDeletedAt());
        assertFalse(profile.getActive());
        assertEquals("Cuenta eliminada", profile.getRubro());
        assertEquals("Cuenta eliminada", profile.getDisplayName());
        assertEquals(List.of(), profile.getPublicPhotos());

        verify(billingService).cancelSubscriptionForProfessional(profile, true);
        verify(availableSlotRepository).deleteByProfessionalId(40L);
        verify(profesionalServiceRepository).deactivateByProfessionalId(40L);
        verify(searchSyncPublisher).publishProfileChanged(40L);
        verify(sessionService).revokeAllSessionsForUser(eq(user), eq("ACCOUNT_DELETION"));
        verify(bookingRepository).saveAll(List.of(booking));
        verify(profileCacheService).evictPublicPageBySlug("pro-slug");
        verify(slotCacheService).evictByPrefix("slots:40:");
    }

    private User clientUser(Long id, String email) {
        User user = new User();
        user.setId(id);
        user.setEmail(email);
        user.setFullName("Cliente Demo");
        user.setPassword("secret");
        user.setRole(UserRole.USER);
        return user;
    }

    private User professionalUser(Long id, String email) {
        User user = new User();
        user.setId(id);
        user.setEmail(email);
        user.setFullName("Profesional Demo");
        user.setPassword("secret");
        user.setRole(UserRole.PROFESSIONAL);
        return user;
    }

    private ProfessionalProfile professionalProfile(Long id, String slug) {
        ProfessionalProfile profile = new ProfessionalProfile();
        profile.setId(id);
        profile.setSlug(slug);
        profile.setRubro("Peluqueria");
        profile.setDisplayName("Pro Demo");
        profile.setActive(true);
        return profile;
    }

    private Booking booking(Long id, User user, ProfessionalProfile professional, LocalDateTime startDateTime) {
        Booking booking = new Booking();
        booking.setId(id);
        booking.setUser(user);
        booking.setProfessional(professional);
        booking.setStartDateTime(startDateTime);
        booking.setOperationalStatus(BookingOperationalStatus.PENDING);
        return booking;
    }
}
