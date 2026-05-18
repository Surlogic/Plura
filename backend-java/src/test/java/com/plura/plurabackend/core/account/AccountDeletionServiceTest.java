package com.plura.plurabackend.core.account;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.plura.plurabackend.core.availability.AvailableSlotAsyncDispatcher;
import com.plura.plurabackend.core.availability.ScheduleSummaryService;
import com.plura.plurabackend.core.auth.context.AuthContextDescriptor;
import com.plura.plurabackend.core.auth.context.AuthContextResolver;
import com.plura.plurabackend.core.auth.context.AuthContextType;
import com.plura.plurabackend.core.availability.repository.AvailableSlotRepository;
import com.plura.plurabackend.core.billing.BillingService;
import com.plura.plurabackend.core.booking.model.Booking;
import com.plura.plurabackend.core.booking.model.BookingOperationalStatus;
import com.plura.plurabackend.core.booking.repository.BookingRepository;
import com.plura.plurabackend.core.cache.ProfileCacheService;
import com.plura.plurabackend.core.cache.SlotCacheService;
import com.plura.plurabackend.core.professional.ProfessionalAccountLifecycleGateway;
import com.plura.plurabackend.core.professional.ProfessionalAccountSubject;
import com.plura.plurabackend.core.search.engine.SearchSyncPublisher;
import com.plura.plurabackend.core.storage.ImageCleanupService;
import com.plura.plurabackend.core.user.model.User;
import com.plura.plurabackend.core.user.model.UserRole;
import com.plura.plurabackend.core.user.repository.UserRepository;
import com.plura.plurabackend.professional.model.ProfessionalProfile;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import jakarta.persistence.TypedQuery;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;

/**
 * Tests de servicios core compartidos / cuentas.
 * Cubren escenarios de account deletion servicio para documentar el comportamiento esperado y evitar regresiones.
 * Mantener estos casos alineados con los contratos reales del backend cuando cambie la logica productiva.
 */
class AccountDeletionServiceTest {

    private final UserRepository userRepository = mock(UserRepository.class);
    private final AuthContextResolver authContextResolver = mock(AuthContextResolver.class);
    private final ProfessionalAccountLifecycleGateway professionalAccountLifecycleGateway =
        mock(ProfessionalAccountLifecycleGateway.class);
    private final BookingRepository bookingRepository = mock(BookingRepository.class);
    private final BillingService billingService = mock(BillingService.class);
    private final AvailableSlotRepository availableSlotRepository = mock(AvailableSlotRepository.class);
    private final AvailableSlotAsyncDispatcher availableSlotAsyncDispatcher = mock(AvailableSlotAsyncDispatcher.class);
    private final ScheduleSummaryService scheduleSummaryService = mock(ScheduleSummaryService.class);
    private final ProfileCacheService profileCacheService = mock(ProfileCacheService.class);
    private final SlotCacheService slotCacheService = mock(SlotCacheService.class);
    private final SearchSyncPublisher searchSyncPublisher = mock(SearchSyncPublisher.class);
    private final ImageCleanupService imageCleanupService = mock(ImageCleanupService.class);
    private final EntityManager entityManager = mock(EntityManager.class);

    private final AccountDeletionService service = new AccountDeletionService(
        userRepository,
        authContextResolver,
        professionalAccountLifecycleGateway,
        bookingRepository,
        billingService,
        availableSlotRepository,
        availableSlotAsyncDispatcher,
        scheduleSummaryService,
        profileCacheService,
        slotCacheService,
        searchSyncPublisher,
        imageCleanupService,
        entityManager,
        "America/Montevideo"
    );

    /**
     * Escenario: elimina cliente account y purges data.
     * El objetivo es dejar explicita la regla que protege este test.
     */
    @Test
    void deletesClientAccountAndPurgesData() {
        User user = clientUser(10L, "cliente@plura.com");
        user.setAvatar("r2://plura-images/avatars/10/photo.jpg");
        ProfessionalProfile professional = professionalProfile(20L, "pro-demo");
        Booking booking = booking(100L, user, professional, LocalDateTime.now().plusDays(2));

        when(userRepository.findByIdAndDeletedAtIsNull(10L)).thenReturn(Optional.of(user));
        when(professionalAccountLifecycleGateway.findByUserId(10L)).thenReturn(Optional.empty());
        when(bookingRepository.findByUser_IdAndOperationalStatusInAndStartDateTimeGreaterThanEqual(
            eq(10L),
            any(),
            any()
        )).thenReturn(List.of(booking));

        mockLongListQuery(
            "SELECT booking.id FROM Booking booking WHERE booking.user.id = :userId",
            List.of(100L)
        );
        mockStringListQuery(
            "SELECT event.id FROM NotificationEvent event WHERE event.bookingReferenceId IN :bookingIds",
            List.of()
        );
        mockStringListQuery(
            "SELECT event.id FROM NotificationEvent event WHERE event.recipientType = :recipientType AND event.recipientId = :recipientId",
            List.of()
        );

        mockExecuteUpdateQuery("DELETE FROM PaymentTransaction transaction WHERE transaction.booking.id IN :bookingIds");
        mockExecuteUpdateQuery("DELETE FROM PaymentEvent event WHERE event.booking.id IN :bookingIds");
        mockExecuteUpdateQuery("DELETE FROM BookingRefundRecord refund WHERE refund.booking.id IN :bookingIds");
        mockExecuteUpdateQuery("DELETE FROM BookingPayoutRecord payout WHERE payout.booking.id IN :bookingIds");
        mockExecuteUpdateQuery("DELETE FROM BookingFinancialSummary summary WHERE summary.booking.id IN :bookingIds");
        mockExecuteUpdateQuery("DELETE FROM BookingEvent event WHERE event.booking.id IN :bookingIds");
        mockExecuteUpdateQuery("DELETE FROM BookingReview review WHERE review.booking.id IN :bookingIds");
        mockExecuteUpdateQuery("DELETE FROM Booking booking WHERE booking.id IN :bookingIds");
        mockExecuteUpdateQuery(
            "DELETE FROM AppNotification notification WHERE notification.recipientType = :recipientType AND notification.recipientId = :recipientId"
        );
        mockExecuteUpdateQuery("DELETE FROM EmailDispatch dispatch WHERE dispatch.recipientEmail = :recipientEmail");
        mockExecuteUpdateQuery("DELETE FROM AuthSession session WHERE session.user.id = :userId");
        mockExecuteUpdateQuery("DELETE FROM AuthOtpChallenge challenge WHERE challenge.user.id = :userId");
        mockExecuteUpdateQuery("DELETE FROM EmailVerificationChallenge challenge WHERE challenge.user.id = :userId");
        mockExecuteUpdateQuery("DELETE FROM PhoneVerificationChallenge challenge WHERE challenge.user.id = :userId");
        mockExecuteUpdateQuery("DELETE FROM PasswordResetToken token WHERE token.user.id = :userId");
        mockExecuteUpdateQuery("DELETE FROM RefreshToken token WHERE token.user.id = :userId");
        mockExecuteUpdateQuery("DELETE FROM ClientFavoriteProfessional favorite WHERE favorite.clientUser.id = :userId");
        mockExecuteUpdateQuery("DELETE FROM ClientPushDevice device WHERE device.user.id = :userId");
        mockExecuteUpdateQuery("DELETE FROM AppFeedback feedback WHERE feedback.author.id = :userId");
        mockExecuteUpdateQuery("DELETE FROM User user WHERE user.id = :userId");

        service.deleteCurrentAccount("10");

        verify(imageCleanupService).deleteIfRemoved("r2://plura-images/avatars/10/photo.jpg");
        verify(entityManager, atLeastOnce()).flush();
        verify(entityManager, atLeastOnce()).clear();
        verify(availableSlotAsyncDispatcher).rebuildProfessionalDay(eq(20L), eq(booking.getStartDateTime().toLocalDate()));
        verify(scheduleSummaryService).requestRebuild(20L);
        verify(searchSyncPublisher).publishProfilesChanged(List.of(20L));
        verify(billingService, never()).cancelSubscriptionForProfessionalId(any(), eq(true));
        verify(userRepository, never()).delete(any());
    }

    /**
     * Escenario: elimina profesional account y purges data.
     * El objetivo es dejar explicita la regla que protege este test.
     */
    @Test
    void deletesProfessionalAccountAndPurgesData() {
        User user = professionalUser(30L, "pro@plura.com");
        user.setAvatar("r2://plura-images/avatars/30/photo.jpg");

        when(userRepository.findByIdAndDeletedAtIsNull(30L)).thenReturn(Optional.of(user));
        when(professionalAccountLifecycleGateway.findByUserId(30L))
            .thenReturn(Optional.of(new ProfessionalAccountSubject(40L, "pro-slug")));
        when(bookingRepository.findByUser_IdAndOperationalStatusInAndStartDateTimeGreaterThanEqual(
            eq(30L),
            any(),
            any()
        )).thenReturn(List.of());

        mockLongListQuery(
            "SELECT booking.id FROM Booking booking WHERE booking.professionalId = :professionalId",
            List.of(101L)
        );
        mockLongListQuery(
            "SELECT booking.id FROM Booking booking WHERE booking.user.id = :userId",
            List.of()
        );
        mockStringListQuery(
            "SELECT event.id FROM NotificationEvent event WHERE event.bookingReferenceId IN :bookingIds",
            List.of()
        );
        mockStringListQuery(
            "SELECT event.id FROM NotificationEvent event WHERE event.recipientType = :recipientType AND event.recipientId = :recipientId",
            List.of()
        );

        mockExecuteUpdateQuery("DELETE FROM PaymentTransaction transaction WHERE transaction.booking.id IN :bookingIds");
        mockExecuteUpdateQuery("DELETE FROM PaymentEvent event WHERE event.booking.id IN :bookingIds");
        mockExecuteUpdateQuery("DELETE FROM BookingRefundRecord refund WHERE refund.booking.id IN :bookingIds");
        mockExecuteUpdateQuery("DELETE FROM BookingPayoutRecord payout WHERE payout.booking.id IN :bookingIds");
        mockExecuteUpdateQuery("DELETE FROM BookingFinancialSummary summary WHERE summary.booking.id IN :bookingIds");
        mockExecuteUpdateQuery("DELETE FROM BookingEvent event WHERE event.booking.id IN :bookingIds");
        mockExecuteUpdateQuery("DELETE FROM BookingReview review WHERE review.booking.id IN :bookingIds");
        mockExecuteUpdateQuery("DELETE FROM Booking booking WHERE booking.id IN :bookingIds");
        mockExecuteUpdateQuery(
            "DELETE FROM AppNotification notification WHERE notification.recipientType = :recipientType AND notification.recipientId = :recipientId"
        );
        mockExecuteUpdateQuery("DELETE FROM EmailDispatch dispatch WHERE dispatch.recipientEmail = :recipientEmail");
        mockExecuteUpdateQuery("DELETE FROM AuthSession session WHERE session.user.id = :userId");
        mockExecuteUpdateQuery("DELETE FROM AuthOtpChallenge challenge WHERE challenge.user.id = :userId");
        mockExecuteUpdateQuery("DELETE FROM EmailVerificationChallenge challenge WHERE challenge.user.id = :userId");
        mockExecuteUpdateQuery("DELETE FROM PhoneVerificationChallenge challenge WHERE challenge.user.id = :userId");
        mockExecuteUpdateQuery("DELETE FROM PasswordResetToken token WHERE token.user.id = :userId");
        mockExecuteUpdateQuery("DELETE FROM RefreshToken token WHERE token.user.id = :userId");
        mockExecuteUpdateQuery("DELETE FROM ClientFavoriteProfessional favorite WHERE favorite.clientUser.id = :userId");
        mockExecuteUpdateQuery("DELETE FROM ClientPushDevice device WHERE device.user.id = :userId");
        mockExecuteUpdateQuery("DELETE FROM AppFeedback feedback WHERE feedback.author.id = :userId");
        mockExecuteUpdateQuery(
            "DELETE FROM ProfessionalPaymentProviderConnection connection WHERE connection.professionalId = :professionalId"
        );
        mockExecuteUpdateQuery("DELETE FROM Subscription subscription WHERE subscription.professionalId = :professionalId");
        mockExecuteUpdateQuery(
            "DELETE FROM ClientFavoriteProfessional favorite WHERE favorite.professional.id = :professionalId"
        );
        mockExecuteUpdateQuery(
            "DELETE FROM ProfesionalService service WHERE service.professional.id = :professionalId"
        );
        mockExecuteUpdateQuery("DELETE FROM BusinessPhoto photo WHERE photo.professional.id = :professionalId");
        mockExecuteUpdateQuery("DELETE FROM ProfessionalProfile profile WHERE profile.id = :professionalId");
        mockExecuteUpdateQuery("DELETE FROM User user WHERE user.id = :userId");

        service.deleteCurrentAccount("30");

        verify(billingService).cancelSubscriptionForProfessionalId(40L, true);
        verify(professionalAccountLifecycleGateway).cleanupProfessionalMedia(40L);
        verify(imageCleanupService).deleteIfRemoved("r2://plura-images/avatars/30/photo.jpg");
        verify(availableSlotRepository).deleteByProfessionalId(40L);
        verify(profileCacheService).evictPublicPageBySlug("pro-slug");
        verify(profileCacheService).evictPublicSummaries();
        verify(slotCacheService).evictByPrefix("slots:40:");
        verify(entityManager, atLeastOnce()).flush();
        verify(entityManager, atLeastOnce()).clear();
        verify(searchSyncPublisher).publishProfileChanged(40L);
        verify(entityManager, atLeastOnce()).createQuery(any(String.class));
        verify(userRepository, never()).delete(any());
    }

    /**
     * Escenario: cierra solo perfil profesional y conserva usuario base.
     * El objetivo es dejar explicita la regla que protege este test.
     */
    @Test
    void closesProfessionalProfileWithoutDeletingUserOrClientArtifacts() {
        User user = professionalUser(50L, "dual@plura.com");
        when(userRepository.findByIdAndDeletedAtIsNull(50L)).thenReturn(Optional.of(user));
        when(professionalAccountLifecycleGateway.findByUserId(50L))
            .thenReturn(Optional.of(new ProfessionalAccountSubject(60L, "dual-slug")));

        mockStringListQuery(
            "SELECT event.id FROM NotificationEvent event WHERE event.recipientType = :recipientType AND event.recipientId = :recipientId",
            List.of()
        );
        mockExecuteUpdateQuery(
            "DELETE FROM AppNotification notification WHERE notification.recipientType = :recipientType AND notification.recipientId = :recipientId"
        );
        mockExecuteUpdateQuery(
            "DELETE FROM ProfessionalPaymentProviderConnection connection WHERE connection.professionalId = :professionalId"
        );
        mockExecuteUpdateQuery("DELETE FROM Subscription subscription WHERE subscription.professionalId = :professionalId");
        mockExecuteUpdateQuery(
            "DELETE FROM ClientFavoriteProfessional favorite WHERE favorite.professional.id = :professionalId"
        );
        mockExecuteUpdateQuery(
            "DELETE FROM ProfesionalService service WHERE service.professional.id = :professionalId"
        );
        mockExecuteUpdateQuery("DELETE FROM BusinessPhoto photo WHERE photo.professional.id = :professionalId");

        service.closeProfessionalProfile("50");

        verify(billingService).cancelSubscriptionForProfessionalId(60L, true);
        verify(professionalAccountLifecycleGateway).cleanupProfessionalMedia(60L);
        verify(professionalAccountLifecycleGateway).deactivateProfessionalProfile(new ProfessionalAccountSubject(60L, "dual-slug"));
        verify(availableSlotRepository).deleteByProfessionalId(60L);
        verify(profileCacheService).evictPublicPageBySlug("dual-slug");
        verify(profileCacheService).evictPublicSummaries();
        verify(slotCacheService).evictByPrefix("slots:60:");
        verify(searchSyncPublisher).publishProfileChanged(60L);
        verify(imageCleanupService, never()).deleteIfRemoved(any());
        verify(entityManager, never()).createQuery("DELETE FROM User user WHERE user.id = :userId");
        verify(entityManager, never()).createQuery("DELETE FROM AuthSession session WHERE session.user.id = :userId");
    }

    @Test
    void closesClientProfileWithoutDeletingUserOrProfessionalArtifacts() {
        User user = professionalUser(70L, "dual-client@plura.com");
        user.setClientActive(true);
        when(userRepository.findByIdAndDeletedAtIsNull(70L)).thenReturn(Optional.of(user));
        when(authContextResolver.resolve(user)).thenReturn(List.of(
            new AuthContextDescriptor(AuthContextType.CLIENT, null, null, null, null, null, false),
            new AuthContextDescriptor(AuthContextType.PROFESSIONAL, "80", "Dual", "dual", null, null, true)
        ));
        when(bookingRepository.findByUser_IdAndOperationalStatusInAndStartDateTimeGreaterThanEqual(
            eq(70L),
            any(),
            any()
        )).thenReturn(List.of());

        mockLongListQuery(
            "SELECT booking.id FROM Booking booking WHERE booking.user.id = :userId",
            List.of()
        );
        mockStringListQuery(
            "SELECT event.id FROM NotificationEvent event WHERE event.recipientType = :recipientType AND event.recipientId = :recipientId",
            List.of()
        );
        mockExecuteUpdateQuery(
            "DELETE FROM AppNotification notification WHERE notification.recipientType = :recipientType AND notification.recipientId = :recipientId"
        );
        mockExecuteUpdateQuery("DELETE FROM ClientFavoriteProfessional favorite WHERE favorite.clientUser.id = :userId");
        mockExecuteUpdateQuery("DELETE FROM ClientPushDevice device WHERE device.user.id = :userId");
        mockExecuteUpdateQuery(
            "DELETE FROM AppFeedback feedback WHERE feedback.author.id = :userId AND feedback.authorRole = :authorRole"
        );

        service.closeClientProfile("70");

        verify(userRepository).save(user);
        verify(billingService, never()).cancelSubscriptionForProfessionalId(any(), eq(true));
        verify(professionalAccountLifecycleGateway, never()).cleanupProfessionalMedia(any());
        verify(entityManager, never()).createQuery("DELETE FROM User user WHERE user.id = :userId");
        verify(entityManager, never()).createQuery("DELETE FROM AuthSession session WHERE session.user.id = :userId");
    }

    private void mockLongListQuery(String jpql, List<Long> result) {
        @SuppressWarnings("unchecked")
        TypedQuery<Long> query = mock(TypedQuery.class);
        when(entityManager.createQuery(jpql, Long.class)).thenReturn(query);
        when(query.setParameter(any(String.class), any())).thenReturn(query);
        when(query.getResultList()).thenReturn(result);
    }

    private void mockStringListQuery(String jpql, List<String> result) {
        @SuppressWarnings("unchecked")
        TypedQuery<String> query = mock(TypedQuery.class);
        when(entityManager.createQuery(jpql, String.class)).thenReturn(query);
        when(query.setParameter(any(String.class), any())).thenReturn(query);
        when(query.getResultList()).thenReturn(result);
    }

    private void mockExecuteUpdateQuery(String jpql) {
        Query query = mock(Query.class);
        when(entityManager.createQuery(jpql)).thenReturn(query);
        when(query.setParameter(any(String.class), any())).thenReturn(query);
        when(query.executeUpdate()).thenReturn(1);
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
        booking.setProfessionalId(professional.getId());
        booking.setProfessionalSlugSnapshot(professional.getSlug());
        booking.setStartDateTime(startDateTime);
        booking.setOperationalStatus(BookingOperationalStatus.PENDING);
        return booking;
    }
}
