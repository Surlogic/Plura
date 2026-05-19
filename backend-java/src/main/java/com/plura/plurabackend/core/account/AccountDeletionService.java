package com.plura.plurabackend.core.account;

import com.plura.plurabackend.core.availability.AvailableSlotAsyncDispatcher;
import com.plura.plurabackend.core.availability.ScheduleSummaryService;
import com.plura.plurabackend.core.auth.context.AuthContextResolver;
import com.plura.plurabackend.core.auth.context.AuthContextType;
import com.plura.plurabackend.core.availability.repository.AvailableSlotRepository;
import com.plura.plurabackend.core.billing.BillingService;
import com.plura.plurabackend.core.booking.model.Booking;
import com.plura.plurabackend.core.booking.model.BookingOperationalStatus;
import com.plura.plurabackend.core.booking.repository.BookingRepository;
import com.plura.plurabackend.core.cache.ProfileCacheService;
import com.plura.plurabackend.core.cache.SlotCacheService;
import com.plura.plurabackend.core.feedback.model.AuthorRole;
import com.plura.plurabackend.core.notification.model.NotificationRecipientType;
import com.plura.plurabackend.core.professional.ProfessionalAccountLifecycleGateway;
import com.plura.plurabackend.core.professional.ProfessionalAccountSubject;
import com.plura.plurabackend.core.search.engine.SearchSyncPublisher;
import com.plura.plurabackend.core.storage.ImageCleanupService;
import com.plura.plurabackend.core.user.model.User;
import com.plura.plurabackend.core.user.repository.UserRepository;
import jakarta.persistence.EntityManager;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * AccountDeletionService es un servicio de negocio del modulo cuentas.
 * Responsabilidad: coordinar reglas de negocio, validaciones, persistencia e integraciones del caso de uso.
 * Colabora con: userRepository, professionalAccountLifecycleGateway, bookingRepository, billingService, entre otros.
 * Foco funcional: cuentas, servicios.
 */
@Service
public class AccountDeletionService {

    private static final List<BookingOperationalStatus> ACTIVE_BOOKING_STATUSES = List.of(
        BookingOperationalStatus.PENDING,
        BookingOperationalStatus.CONFIRMED
    );

    private final UserRepository userRepository;
    private final AuthContextResolver authContextResolver;
    private final ProfessionalAccountLifecycleGateway professionalAccountLifecycleGateway;
    private final BookingRepository bookingRepository;
    private final BillingService billingService;
    private final AvailableSlotRepository availableSlotRepository;
    private final AvailableSlotAsyncDispatcher availableSlotAsyncDispatcher;
    private final ScheduleSummaryService scheduleSummaryService;
    private final ProfileCacheService profileCacheService;
    private final SlotCacheService slotCacheService;
    private final SearchSyncPublisher searchSyncPublisher;
    private final ImageCleanupService imageCleanupService;
    private final EntityManager entityManager;
    private final ZoneId appZoneId;

    public AccountDeletionService(
        UserRepository userRepository,
        AuthContextResolver authContextResolver,
        ProfessionalAccountLifecycleGateway professionalAccountLifecycleGateway,
        BookingRepository bookingRepository,
        BillingService billingService,
        AvailableSlotRepository availableSlotRepository,
        AvailableSlotAsyncDispatcher availableSlotAsyncDispatcher,
        ScheduleSummaryService scheduleSummaryService,
        ProfileCacheService profileCacheService,
        SlotCacheService slotCacheService,
        SearchSyncPublisher searchSyncPublisher,
        ImageCleanupService imageCleanupService,
        EntityManager entityManager,
        @Value("${app.timezone:America/Montevideo}") String appTimezone
    ) {
        this.userRepository = userRepository;
        this.authContextResolver = authContextResolver;
        this.professionalAccountLifecycleGateway = professionalAccountLifecycleGateway;
        this.bookingRepository = bookingRepository;
        this.billingService = billingService;
        this.availableSlotRepository = availableSlotRepository;
        this.availableSlotAsyncDispatcher = availableSlotAsyncDispatcher;
        this.scheduleSummaryService = scheduleSummaryService;
        this.profileCacheService = profileCacheService;
        this.slotCacheService = slotCacheService;
        this.searchSyncPublisher = searchSyncPublisher;
        this.imageCleanupService = imageCleanupService;
        this.entityManager = entityManager;
        this.appZoneId = ZoneId.of(appTimezone);
    }

    /**
     * Elimina la cuenta actual y limpia relaciones o datos derivados cuando corresponde.
     * Tambien concentra los efectos secundarios para que el flujo quede en un estado consistente.
     */
    @Transactional
    public void deleteCurrentAccount(String rawUserId) {
        Long userId = parseUserId(rawUserId);
        User user = userRepository.findByIdAndDeletedAtIsNull(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Usuario no encontrado"));

        LocalDateTime now = LocalDateTime.now(appZoneId);
        List<BookingAvailabilityImpact> futureBookingImpacts = snapshotBookingAvailabilityImpacts(
            bookingRepository.findByUser_IdAndOperationalStatusInAndStartDateTimeGreaterThanEqual(
                user.getId(),
                ACTIVE_BOOKING_STATUSES,
                now
            )
        );
        Optional<ProfessionalAccountSubject> professionalSubject = findProfessionalSubjectByUserId(user.getId());
        professionalSubject.ifPresent(subject ->
            billingService.ensureTrialClaimBeforeAccountDeletion(subject.professionalId(), user)
        );
        professionalSubject.ifPresent(subject -> deleteProfessionalFacetForTotalAccount(user, subject));
        deleteClientFacetForTotalAccount(user, futureBookingImpacts);
    }

    /**
     * Cierra la faceta profesional de la cuenta actual sin eliminar el usuario base ni datos cliente.
     */
    @Transactional
    public void closeProfessionalProfile(String rawUserId) {
        Long userId = parseUserId(rawUserId);
        User user = userRepository.findByIdAndDeletedAtIsNull(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Usuario no encontrado"));

        findProfessionalSubjectByUserId(user.getId())
            .ifPresent(subject -> closeProfessionalFacet(user, subject));
    }

    /**
     * Cierra la faceta cliente sin borrar la cuenta base cuando queda otro contexto disponible.
     */
    @Transactional
    public void closeClientProfile(String rawUserId) {
        Long userId = parseUserId(rawUserId);
        User user = userRepository.findByIdAndDeletedAtIsNull(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Usuario no encontrado"));

        boolean hasAlternativeContext = authContextResolver.resolve(user).stream()
            .anyMatch(context -> context.type() != AuthContextType.CLIENT);
        if (!hasAlternativeContext) {
            throw new ResponseStatusException(
                HttpStatus.CONFLICT,
                "No podés cerrar el perfil cliente si es el único contexto activo"
            );
        }
        if (Boolean.FALSE.equals(user.getClientActive())) {
            return;
        }

        LocalDateTime now = LocalDateTime.now(appZoneId);
        List<BookingAvailabilityImpact> futureBookingImpacts = snapshotBookingAvailabilityImpacts(
            bookingRepository.findByUser_IdAndOperationalStatusInAndStartDateTimeGreaterThanEqual(
                user.getId(),
                ACTIVE_BOOKING_STATUSES,
                now
            )
        );
        closeClientFacet(user, futureBookingImpacts);
    }

    /**
     * Elimina la cuenta de cliente y limpia relaciones o datos derivados cuando corresponde.
     * Tambien concentra los efectos secundarios para que el flujo quede en un estado consistente.
     */
    private void deleteClientFacetForTotalAccount(User user, List<BookingAvailabilityImpact> futureBookingImpacts) {
        List<Long> bookingIds = findBookingIdsForUser(user.getId());

        purgeBookingGraph(bookingIds);
        purgeNotificationArtifactsForRecipient(
            NotificationRecipientType.CLIENT,
            String.valueOf(user.getId()),
            user.getEmail()
        );
        purgeUserAuthArtifacts(user.getId());
        purgeUserOwnedArtifacts(user.getId());

        imageCleanupService.deleteIfRemoved(user.getAvatar());

        flushAndClearPersistenceContext();
        deleteUserById(user.getId());

        refreshAvailabilityAfterClientBookingRemoval(futureBookingImpacts);
    }

    /**
     * Elimina la cuenta profesional y limpia relaciones o datos derivados cuando corresponde.
     * Tambien concentra los efectos secundarios para que el flujo quede en un estado consistente.
     */
    private void deleteProfessionalFacetForTotalAccount(User user, ProfessionalAccountSubject subject) {
        List<Long> bookingIds = findBookingIdsForProfessional(subject.professionalId());

        cleanupProfessionalFacet(user, subject, true);

        purgeBookingGraph(bookingIds);

        flushAndClearPersistenceContext();
        deleteProfessionalProfile(subject.professionalId());

        searchSyncPublisher.publishProfileChanged(subject.professionalId());
    }

    /**
     * Cierra faceta profesional sin tocar cuenta base ni reservas/favoritos del usuario como cliente.
     */
    private void closeProfessionalFacet(User user, ProfessionalAccountSubject subject) {
        cleanupProfessionalFacet(user, subject, false);
        flushAndClearPersistenceContext();
        professionalAccountLifecycleGateway.deactivateProfessionalProfile(subject);
        searchSyncPublisher.publishProfileChanged(subject.professionalId());
    }

    /**
     * Cierra faceta cliente sin tocar cuenta base ni datos profesionales.
     */
    private void closeClientFacet(User user, List<BookingAvailabilityImpact> futureBookingImpacts) {
        List<Long> bookingIds = findBookingIdsForUser(user.getId());

        purgeBookingGraph(bookingIds);
        purgeNotificationArtifactsForRecipient(
            NotificationRecipientType.CLIENT,
            String.valueOf(user.getId()),
            user.getEmail(),
            false
        );
        purgeClientOwnedArtifacts(user.getId());

        user.setClientActive(false);
        userRepository.save(user);

        refreshAvailabilityAfterClientBookingRemoval(futureBookingImpacts);
    }

    /**
     * Limpia datos y derivados propios de la faceta profesional.
     */
    private void cleanupProfessionalFacet(User user, ProfessionalAccountSubject subject, boolean purgeRecipientEmailDispatches) {
        billingService.cancelSubscriptionForProfessionalId(subject.professionalId(), true);
        professionalAccountLifecycleGateway.cleanupProfessionalMedia(subject.professionalId());
        purgeNotificationArtifactsForRecipient(
            NotificationRecipientType.PROFESSIONAL,
            String.valueOf(subject.professionalId()),
            user.getEmail(),
            purgeRecipientEmailDispatches
        );
        purgeProfessionalOwnedArtifacts(subject.professionalId());
        availableSlotRepository.deleteByProfessionalId(subject.professionalId());
        slotCacheService.evictByPrefix("slots:" + subject.professionalId() + ":");
        if (subject.slug() != null && !subject.slug().isBlank()) {
            profileCacheService.evictPublicPageBySlug(subject.slug());
        }
        profileCacheService.evictPublicSummaries();
    }

    /**
     * Ejecuta la logica de snapshot reserva disponibilidad impactos manteniendola encapsulada en este componente.
     */
    private List<BookingAvailabilityImpact> snapshotBookingAvailabilityImpacts(List<Booking> bookings) {
        if (bookings == null || bookings.isEmpty()) {
            return List.of();
        }

        List<BookingAvailabilityImpact> snapshots = new ArrayList<>();
        for (Booking booking : bookings) {
            if (booking.getProfessionalId() == null || booking.getStartDateTime() == null) {
                continue;
            }
            snapshots.add(new BookingAvailabilityImpact(
                booking.getProfessionalId(),
                booking.getProfessionalSlugSnapshot(),
                booking.getStartDateTime().toLocalDate()
            ));
        }
        return snapshots;
    }

    /**
     * Refresca disponibilidad despues cliente reserva removal para mantener datos derivados o metricas al dia.
     */
    private void refreshAvailabilityAfterClientBookingRemoval(List<BookingAvailabilityImpact> impacts) {
        if (impacts == null || impacts.isEmpty()) {
            return;
        }

        Map<Long, Set<LocalDate>> datesByProfessionalId = new HashMap<>();
        Map<Long, String> slugByProfessionalId = new HashMap<>();
        for (BookingAvailabilityImpact impact : impacts) {
            datesByProfessionalId.computeIfAbsent(impact.professionalId(), ignored -> new HashSet<>())
                .add(impact.date());
            if (impact.slug() != null && !impact.slug().isBlank()) {
                slugByProfessionalId.putIfAbsent(impact.professionalId(), impact.slug());
            }
        }

        if (datesByProfessionalId.isEmpty()) {
            return;
        }

        for (Map.Entry<Long, Set<LocalDate>> entry : datesByProfessionalId.entrySet()) {
            Long professionalId = entry.getKey();
            slotCacheService.evictByPrefix("slots:" + professionalId + ":");
            String slug = slugByProfessionalId.get(professionalId);
            if (slug != null && !slug.isBlank()) {
                profileCacheService.evictPublicPageBySlug(slug);
            }
            for (LocalDate date : entry.getValue()) {
                availableSlotAsyncDispatcher.rebuildProfessionalDay(professionalId, date);
            }
            scheduleSummaryService.requestRebuild(professionalId);
        }

        profileCacheService.evictPublicSummaries();
        searchSyncPublisher.publishProfilesChanged(new ArrayList<>(datesByProfessionalId.keySet()));
    }

    /**
     * Limpia definitivamente reserva graph como parte de un flujo de baja o mantenimiento.
     * Tambien concentra los efectos secundarios para que el flujo quede en un estado consistente.
     */
    private void purgeBookingGraph(List<Long> bookingIds) {
        if (bookingIds == null || bookingIds.isEmpty()) {
            return;
        }

        purgeNotificationArtifactsForBookings(bookingIds);
        bulkDelete("DELETE FROM PaymentTransaction transaction WHERE transaction.booking.id IN :bookingIds", "bookingIds", bookingIds);
        bulkDelete("DELETE FROM PaymentEvent event WHERE event.booking.id IN :bookingIds", "bookingIds", bookingIds);
        bulkDelete("DELETE FROM BookingRefundRecord refund WHERE refund.booking.id IN :bookingIds", "bookingIds", bookingIds);
        bulkDelete("DELETE FROM BookingPayoutRecord payout WHERE payout.booking.id IN :bookingIds", "bookingIds", bookingIds);
        bulkDelete("DELETE FROM BookingFinancialSummary summary WHERE summary.booking.id IN :bookingIds", "bookingIds", bookingIds);
        bulkDelete("DELETE FROM BookingEvent event WHERE event.booking.id IN :bookingIds", "bookingIds", bookingIds);
        bulkDelete("DELETE FROM BookingReview review WHERE review.booking.id IN :bookingIds", "bookingIds", bookingIds);
        bulkDelete("DELETE FROM Booking booking WHERE booking.id IN :bookingIds", "bookingIds", bookingIds);
    }

    /**
     * Limpia definitivamente notificacion artefactos for reservas como parte de un flujo de baja o mantenimiento.
     * Tambien concentra los efectos secundarios para que el flujo quede en un estado consistente.
     */
    private void purgeNotificationArtifactsForBookings(List<Long> bookingIds) {
        if (bookingIds == null || bookingIds.isEmpty()) {
            return;
        }

        List<String> eventIds = entityManager.createQuery(
            "SELECT event.id FROM NotificationEvent event WHERE event.bookingReferenceId IN :bookingIds",
            String.class
        )
            .setParameter("bookingIds", bookingIds)
            .getResultList();

        deleteNotificationArtifactsByEventIds(eventIds);
    }

    /**
     * Limpia definitivamente notificacion artefactos for destinatario como parte de un flujo de baja o mantenimiento.
     * Tambien concentra los efectos secundarios para que el flujo quede en un estado consistente.
     */
    private void purgeNotificationArtifactsForRecipient(
        NotificationRecipientType recipientType,
        String recipientId,
        String recipientEmail
    ) {
        purgeNotificationArtifactsForRecipient(recipientType, recipientId, recipientEmail, true);
    }

    private void purgeNotificationArtifactsForRecipient(
        NotificationRecipientType recipientType,
        String recipientId,
        String recipientEmail,
        boolean purgeRecipientEmailDispatches
    ) {
        if (recipientType == null || recipientId == null || recipientId.isBlank()) {
            return;
        }

        List<String> recipientEventIds = entityManager.createQuery(
            "SELECT event.id FROM NotificationEvent event WHERE event.recipientType = :recipientType AND event.recipientId = :recipientId",
            String.class
        )
            .setParameter("recipientType", recipientType)
            .setParameter("recipientId", recipientId)
            .getResultList();

        deleteNotificationArtifactsByEventIds(recipientEventIds);
        bulkDelete(
            "DELETE FROM AppNotification notification WHERE notification.recipientType = :recipientType AND notification.recipientId = :recipientId",
            Map.of("recipientType", recipientType, "recipientId", recipientId)
        );
        if (purgeRecipientEmailDispatches && recipientEmail != null && !recipientEmail.isBlank()) {
            bulkDelete(
                "DELETE FROM EmailDispatch dispatch WHERE dispatch.recipientEmail = :recipientEmail",
                Map.of("recipientEmail", recipientEmail)
            );
        }
    }

    /**
     * Elimina notificacion artefactos by evento IDs y limpia relaciones o datos derivados cuando corresponde.
     * Tambien concentra los efectos secundarios para que el flujo quede en un estado consistente.
     */
    private void deleteNotificationArtifactsByEventIds(List<String> eventIds) {
        if (eventIds == null || eventIds.isEmpty()) {
            return;
        }

        bulkDelete(
            "DELETE FROM AppNotification notification WHERE notification.notificationEvent.id IN :eventIds",
            "eventIds",
            eventIds
        );
        bulkDelete(
            "DELETE FROM EmailDispatch dispatch WHERE dispatch.notificationEvent.id IN :eventIds",
            "eventIds",
            eventIds
        );
        bulkDelete("DELETE FROM NotificationEvent event WHERE event.id IN :eventIds", "eventIds", eventIds);
    }

    /**
     * Limpia definitivamente usuario autenticacion artefactos como parte de un flujo de baja o mantenimiento.
     * Tambien concentra los efectos secundarios para que el flujo quede en un estado consistente.
     */
    private void purgeUserAuthArtifacts(Long userId) {
        bulkDelete("DELETE FROM AuthSession session WHERE session.user.id = :userId", "userId", userId);
        bulkDelete("DELETE FROM AuthOtpChallenge challenge WHERE challenge.user.id = :userId", "userId", userId);
        bulkDelete("DELETE FROM EmailVerificationChallenge challenge WHERE challenge.user.id = :userId", "userId", userId);
        bulkDelete("DELETE FROM PhoneVerificationChallenge challenge WHERE challenge.user.id = :userId", "userId", userId);
        bulkDelete("DELETE FROM PasswordResetToken token WHERE token.user.id = :userId", "userId", userId);
        bulkDelete("DELETE FROM RefreshToken token WHERE token.user.id = :userId", "userId", userId);
    }

    /**
     * Limpia definitivamente usuario owned artefactos como parte de un flujo de baja o mantenimiento.
     * Tambien concentra los efectos secundarios para que el flujo quede en un estado consistente.
     */
    private void purgeUserOwnedArtifacts(Long userId) {
        bulkDelete("DELETE FROM ClientFavoriteProfessional favorite WHERE favorite.clientUser.id = :userId", "userId", userId);
        bulkDelete("DELETE FROM ClientPushDevice device WHERE device.user.id = :userId", "userId", userId);
        bulkDelete("DELETE FROM AppFeedback feedback WHERE feedback.author.id = :userId", "userId", userId);
    }

    /**
     * Limpia datos propios de la faceta cliente sin tocar artefactos profesionales del mismo usuario.
     */
    private void purgeClientOwnedArtifacts(Long userId) {
        bulkDelete("DELETE FROM ClientFavoriteProfessional favorite WHERE favorite.clientUser.id = :userId", "userId", userId);
        bulkDelete("DELETE FROM ClientPushDevice device WHERE device.user.id = :userId", "userId", userId);
        bulkDelete(
            "DELETE FROM AppFeedback feedback WHERE feedback.author.id = :userId AND feedback.authorRole = :authorRole",
            Map.of("userId", userId, "authorRole", AuthorRole.CLIENT)
        );
    }

    /**
     * Limpia definitivamente profesional owned artefactos como parte de un flujo de baja o mantenimiento.
     * Tambien concentra los efectos secundarios para que el flujo quede en un estado consistente.
     */
    private void purgeProfessionalOwnedArtifacts(Long professionalId) {
        bulkDelete(
            "DELETE FROM ProfessionalPaymentProviderConnection connection WHERE connection.professionalId = :professionalId",
            "professionalId",
            professionalId
        );
        bulkDelete("DELETE FROM Subscription subscription WHERE subscription.professionalId = :professionalId", "professionalId", professionalId);
        bulkDelete(
            "DELETE FROM ClientFavoriteProfessional favorite WHERE favorite.professional.id = :professionalId",
            "professionalId",
            professionalId
        );
        bulkDelete(
            "DELETE FROM ProfesionalService service WHERE service.professional.id = :professionalId",
            "professionalId",
            professionalId
        );
        bulkDelete(
            "DELETE FROM BusinessPhoto photo WHERE photo.professional.id = :professionalId",
            "professionalId",
            professionalId
        );
    }

    /**
     * Elimina profesional perfil y limpia relaciones o datos derivados cuando corresponde.
     * Tambien concentra los efectos secundarios para que el flujo quede en un estado consistente.
     */
    private void deleteProfessionalProfile(Long professionalId) {
        bulkDelete("DELETE FROM ProfessionalProfile profile WHERE profile.id = :professionalId", "professionalId", professionalId);
    }

    /**
     * Elimina usuario by ID y limpia relaciones o datos derivados cuando corresponde.
     * Tambien concentra los efectos secundarios para que el flujo quede en un estado consistente.
     */
    private void deleteUserById(Long userId) {
        bulkDelete("DELETE FROM User user WHERE user.id = :userId", "userId", userId);
    }

    /**
     * Fuerza flush/clear del contexto de persistencia para evitar entidades stale.
     */
    private void flushAndClearPersistenceContext() {
        entityManager.flush();
        entityManager.clear();
    }

    /**
     * Busca reserva IDs for usuario aplicando filtros, joins o criterios del caso de uso.
     * Mantiene la consulta encapsulada para que el resto del codigo no repita filtros ni joins.
     */
    private List<Long> findBookingIdsForUser(Long userId) {
        return entityManager.createQuery(
            "SELECT booking.id FROM Booking booking WHERE booking.user.id = :userId",
            Long.class
        )
            .setParameter("userId", userId)
            .getResultList();
    }

    /**
     * Busca reserva IDs for profesional aplicando filtros, joins o criterios del caso de uso.
     * Mantiene la consulta encapsulada para que el resto del codigo no repita filtros ni joins.
     */
    private List<Long> findBookingIdsForProfessional(Long professionalId) {
        return entityManager.createQuery(
            "SELECT booking.id FROM Booking booking WHERE booking.professionalId = :professionalId",
            Long.class
        )
            .setParameter("professionalId", professionalId)
            .getResultList();
    }

    private Optional<ProfessionalAccountSubject> findProfessionalSubjectByUserId(Long userId) {
        Optional<ProfessionalAccountSubject> subject = professionalAccountLifecycleGateway.findByUserId(userId);
        return subject == null ? Optional.empty() : subject;
    }

    /**
     * Ejecuta delete en lote para limpiar datos relacionados eficientemente.
     */
    private void bulkDelete(String jpql, String parameterName, Object value) {
        entityManager.createQuery(jpql)
            .setParameter(parameterName, value)
            .executeUpdate();
    }

    /**
     * Ejecuta delete en lote para limpiar datos relacionados eficientemente.
     */
    private void bulkDelete(String jpql, Map<String, Object> parameters) {
        var query = entityManager.createQuery(jpql);
        for (Map.Entry<String, Object> entry : parameters.entrySet()) {
            query.setParameter(entry.getKey(), entry.getValue());
        }
        query.executeUpdate();
    }

    /**
     * Parsea usuario ID y convierte errores de formato en errores controlados.
     */
    private Long parseUserId(String rawUserId) {
        if (rawUserId == null || rawUserId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sin sesión activa");
        }
        try {
            return Long.parseLong(rawUserId.trim());
        } catch (NumberFormatException exception) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Token inválido");
        }
    }

    /**
     * Bloque de datos booking availability impact usado internamente por esta clase.
     * Agrupa valores relacionados para que el calculo principal sea mas legible.
     */
    private record BookingAvailabilityImpact(Long professionalId, String slug, LocalDate date) {}
}
