package com.plura.plurabackend.account;

import com.plura.plurabackend.auth.SessionService;
import com.plura.plurabackend.availability.AvailableSlotAsyncDispatcher;
import com.plura.plurabackend.availability.ScheduleSummaryService;
import com.plura.plurabackend.availability.repository.AvailableSlotRepository;
import com.plura.plurabackend.billing.BillingService;
import com.plura.plurabackend.booking.event.BookingEventService;
import com.plura.plurabackend.booking.event.model.BookingActorType;
import com.plura.plurabackend.booking.event.model.BookingEventType;
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
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AccountDeletionService {

    private static final List<BookingOperationalStatus> ACTIVE_BOOKING_STATUSES = List.of(
        BookingOperationalStatus.PENDING,
        BookingOperationalStatus.CONFIRMED
    );

    private final UserRepository userRepository;
    private final ProfessionalProfileRepository professionalProfileRepository;
    private final BookingRepository bookingRepository;
    private final SessionService sessionService;
    private final BillingService billingService;
    private final AvailableSlotRepository availableSlotRepository;
    private final AvailableSlotAsyncDispatcher availableSlotAsyncDispatcher;
    private final ScheduleSummaryService scheduleSummaryService;
    private final ProfesionalServiceRepository profesionalServiceRepository;
    private final ProfileCacheService profileCacheService;
    private final SlotCacheService slotCacheService;
    private final SearchSyncPublisher searchSyncPublisher;
    private final PasswordEncoder passwordEncoder;
    private final BookingEventService bookingEventService;
    private final ZoneId appZoneId;

    public AccountDeletionService(
        UserRepository userRepository,
        ProfessionalProfileRepository professionalProfileRepository,
        BookingRepository bookingRepository,
        SessionService sessionService,
        BillingService billingService,
        AvailableSlotRepository availableSlotRepository,
        AvailableSlotAsyncDispatcher availableSlotAsyncDispatcher,
        ScheduleSummaryService scheduleSummaryService,
        ProfesionalServiceRepository profesionalServiceRepository,
        ProfileCacheService profileCacheService,
        SlotCacheService slotCacheService,
        SearchSyncPublisher searchSyncPublisher,
        PasswordEncoder passwordEncoder,
        BookingEventService bookingEventService,
        @Value("${app.timezone:America/Montevideo}") String appTimezone
    ) {
        this.userRepository = userRepository;
        this.professionalProfileRepository = professionalProfileRepository;
        this.bookingRepository = bookingRepository;
        this.sessionService = sessionService;
        this.billingService = billingService;
        this.availableSlotRepository = availableSlotRepository;
        this.availableSlotAsyncDispatcher = availableSlotAsyncDispatcher;
        this.scheduleSummaryService = scheduleSummaryService;
        this.profesionalServiceRepository = profesionalServiceRepository;
        this.profileCacheService = profileCacheService;
        this.slotCacheService = slotCacheService;
        this.searchSyncPublisher = searchSyncPublisher;
        this.passwordEncoder = passwordEncoder;
        this.bookingEventService = bookingEventService;
        this.appZoneId = ZoneId.of(appTimezone);
    }

    @Transactional
    public void deleteCurrentAccount(String rawUserId, UserRole role) {
        Long userId = parseUserId(rawUserId);
        User user = userRepository.findByIdAndDeletedAtIsNull(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Usuario no encontrado"));

        if (user.getRole() != role) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Acceso denegado");
        }

        LocalDateTime now = LocalDateTime.now(appZoneId);
        if (role == UserRole.PROFESSIONAL) {
            deleteProfessionalAccount(user, now);
        } else if (role == UserRole.USER) {
            deleteClientAccount(user, now);
        } else {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Rol no soportado");
        }
    }

    private void deleteClientAccount(User user, LocalDateTime now) {
        cancelFutureBookingsForClient(user.getId(), now);
        anonymizeUser(user, now);
        userRepository.save(user);
        sessionService.revokeAllSessionsForUser(user, sessionService.revokeReasonAccountDeletion());
    }

    private void deleteProfessionalAccount(User user, LocalDateTime now) {
        ProfessionalProfile profile = professionalProfileRepository.findByUser_Id(user.getId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.CONFLICT, "Perfil profesional no encontrado"));

        billingService.cancelSubscriptionForProfessional(profile, true);
        cancelFutureBookingsForProfessional(profile.getId(), now);

        String previousSlug = profile.getSlug();
        deactivateProfessionalProfile(profile);
        professionalProfileRepository.save(profile);
        professionalProfileRepository.updateCoordinates(profile.getId(), null, null);

        profesionalServiceRepository.deactivateByProfessionalId(profile.getId());
        availableSlotRepository.deleteByProfessionalId(profile.getId());
        slotCacheService.evictByPrefix("slots:" + profile.getId() + ":");
        if (previousSlug != null && !previousSlug.isBlank()) {
            profileCacheService.evictPublicPageBySlug(previousSlug);
        }
        profileCacheService.evictPublicSummaries();
        searchSyncPublisher.publishProfileChanged(profile.getId());

        anonymizeUser(user, now);
        userRepository.save(user);
        sessionService.revokeAllSessionsForUser(user, sessionService.revokeReasonAccountDeletion());
    }

    private void cancelFutureBookingsForClient(Long userId, LocalDateTime now) {
        List<Booking> bookings = bookingRepository.findByUser_IdAndOperationalStatusInAndStartDateTimeGreaterThanEqual(
            userId,
            ACTIVE_BOOKING_STATUSES,
            now
        );
        cancelFutureBookingsAndRefreshAvailability(bookings);
    }

    private void cancelFutureBookingsForProfessional(Long professionalId, LocalDateTime now) {
        List<Booking> bookings = bookingRepository.findByProfessional_IdAndOperationalStatusInAndStartDateTimeGreaterThanEqual(
            professionalId,
            ACTIVE_BOOKING_STATUSES,
            now
        );
        if (bookings.isEmpty()) {
            return;
        }

        for (Booking booking : bookings) {
            booking.applyOperationalStatus(BookingOperationalStatus.CANCELLED, now);
            bookingEventService.record(
                booking,
                BookingEventType.BOOKING_CANCELLED,
                BookingActorType.SYSTEM,
                null,
                Map.of("reason", "professional_account_deletion")
            );
        }
        bookingRepository.saveAll(bookings);
    }

    private void cancelFutureBookingsAndRefreshAvailability(List<Booking> bookings) {
        if (bookings.isEmpty()) {
            return;
        }

        Map<Long, Set<LocalDate>> datesByProfessionalId = new HashMap<>();
        Map<Long, String> slugByProfessionalId = new HashMap<>();
        for (Booking booking : bookings) {
            booking.applyOperationalStatus(BookingOperationalStatus.CANCELLED, LocalDateTime.now(appZoneId));
            bookingEventService.record(
                booking,
                BookingEventType.BOOKING_CANCELLED,
                BookingActorType.SYSTEM,
                null,
                Map.of("reason", "client_account_deletion")
            );
            ProfessionalProfile professional = booking.getProfessional();
            if (professional == null || professional.getId() == null) {
                continue;
            }
            datesByProfessionalId.computeIfAbsent(professional.getId(), ignored -> new HashSet<>())
                .add(booking.getStartDateTime().toLocalDate());
            slugByProfessionalId.putIfAbsent(professional.getId(), professional.getSlug());
        }
        bookingRepository.saveAll(bookings);

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

    private void deactivateProfessionalProfile(ProfessionalProfile profile) {
        profile.setActive(false);
        profile.setDisplayName("Cuenta eliminada");
        profile.setRubro("Cuenta eliminada");
        profile.setPublicHeadline(null);
        profile.setPublicAbout(null);
        profile.setLogoUrl(null);
        profile.setInstagram(null);
        profile.setFacebook(null);
        profile.setTiktok(null);
        profile.setWebsite(null);
        profile.setWhatsapp(null);
        profile.setLocation(null);
        profile.setCountry(null);
        profile.setCity(null);
        profile.setFullAddress(null);
        profile.setLocationText(null);
        profile.setLatitude(null);
        profile.setLongitude(null);
        profile.setTipoCliente(null);
        profile.setScheduleJson(null);
        profile.setHasAvailabilityToday(false);
        profile.setNextAvailableAt(null);
        profile.setPublicPhotos(new ArrayList<>());
        profile.setCategories(new HashSet<>());
    }

    private void anonymizeUser(User user, LocalDateTime deletedAt) {
        user.setFullName("Cuenta eliminada");
        user.setEmail(buildDeletedEmail(user, deletedAt));
        user.setPhoneNumber(null);
        user.setPassword(passwordEncoder.encode("deleted-" + UUID.randomUUID()));
        user.setProvider(null);
        user.setProviderId(null);
        user.setAvatar(null);
        user.setDeletedAt(deletedAt);
    }

    private String buildDeletedEmail(User user, LocalDateTime deletedAt) {
        return ("deleted+" + user.getRole().name().toLowerCase(Locale.ROOT)
            + "-" + user.getId()
            + "-" + deletedAt.toEpochSecond(java.time.ZoneOffset.UTC)
            + "@plura.invalid");
    }

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
}
