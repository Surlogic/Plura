package com.plura.plurabackend.notification;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.plura.plurabackend.core.booking.model.Booking;
import com.plura.plurabackend.core.booking.model.BookingOperationalStatus;
import com.plura.plurabackend.core.booking.model.ServicePaymentType;
import com.plura.plurabackend.core.booking.repository.BookingRepository;
import com.plura.plurabackend.core.notification.application.NotificationInAppProjectionCommand;
import com.plura.plurabackend.core.notification.application.NotificationRecordCommand;
import com.plura.plurabackend.core.notification.application.NotificationRegistrationResult;
import com.plura.plurabackend.core.notification.application.NotificationService;
import com.plura.plurabackend.core.notification.model.AppNotification;
import com.plura.plurabackend.core.notification.model.NotificationAggregateType;
import com.plura.plurabackend.core.notification.model.NotificationEventType;
import com.plura.plurabackend.core.notification.model.NotificationRecipientType;
import com.plura.plurabackend.core.notification.model.NotificationSeverity;
import com.plura.plurabackend.core.notification.repository.AppNotificationRepository;
import com.plura.plurabackend.core.notification.repository.EmailDispatchRepository;
import com.plura.plurabackend.core.notification.repository.NotificationEventRepository;
import com.plura.plurabackend.core.user.model.User;
import com.plura.plurabackend.core.user.model.UserRole;
import com.plura.plurabackend.core.user.repository.UserRepository;
import com.plura.plurabackend.professional.model.ProfessionalProfile;
import com.plura.plurabackend.professional.repository.ProfessionalProfileRepository;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.LinkedHashMap;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(properties = {
    "SPRING_DATASOURCE_URL=jdbc:h2:mem:professional-notification-api;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DATABASE_TO_LOWER=TRUE",
    "SPRING_DATASOURCE_USERNAME=sa",
    "SPRING_DATASOURCE_PASSWORD=",
    "SPRING_JPA_DDL_AUTO=create-drop",
    "JWT_SECRET=test-secret-for-professional-notifications",
    "JWT_REFRESH_PEPPER=test-refresh-pepper",
    "APP_TIMEZONE=America/Montevideo",
    "CACHE_ENABLED=false",
    "SPRING_FLYWAY_ENABLED=false",
    "APP_RATE_LIMIT_ENABLED=false",
    "SWAGGER_ENABLED=false",
    "SQS_ENABLED=false"
})
@AutoConfigureMockMvc
class ProfessionalNotificationApiIntegrationTest {

    private static final String JWT_SECRET = "test-secret-for-professional-notifications";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private NotificationEventRepository notificationEventRepository;

    @Autowired
    private AppNotificationRepository appNotificationRepository;

    @Autowired
    private EmailDispatchRepository emailDispatchRepository;

    @Autowired
    private BookingRepository bookingRepository;

    @Autowired
    private ProfessionalProfileRepository professionalProfileRepository;

    @Autowired
    private UserRepository userRepository;

    @BeforeEach
    void setUp() {
        emailDispatchRepository.deleteAll();
        appNotificationRepository.deleteAll();
        notificationEventRepository.deleteAll();
        bookingRepository.deleteAll();
        professionalProfileRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    void inboxUnreadReadDetailAndTimelineRespectOwnershipAndSourceBoundaries() throws Exception {
        User professionalUser = saveProfessionalUser("pro1@plura.com", "Profesional Uno");
        User otherProfessionalUser = saveProfessionalUser("pro2@plura.com", "Profesional Dos");
        User clientUser = saveClientUser("client@plura.com", "Cliente Uno");

        ProfessionalProfile professionalProfile = saveProfessionalProfile(professionalUser, "pro-uno");
        ProfessionalProfile otherProfessionalProfile = saveProfessionalProfile(otherProfessionalUser, "pro-dos");

        Booking ownedBooking = saveBooking(1L, professionalProfile.getId(), clientUser, "Corte premium");
        Booking otherBooking = saveBooking(2L, otherProfessionalProfile.getId(), clientUser, "Masaje");

        String ownedCreatedNotificationId = createInboxNotification(
            NotificationEventType.BOOKING_CREATED,
            NotificationAggregateType.BOOKING,
            String.valueOf(ownedBooking.getId()),
            professionalProfile.getId(),
            "booking-created-owned",
            "booking",
            "create_professional_booking",
            LocalDateTime.of(2026, 3, 18, 9, 0),
            ownedBooking.getId(),
            "Nueva reserva",
            "Se creó una nueva reserva.",
            NotificationSeverity.INFO,
            "BOOKING",
            "/profesional/dashboard/reservas?bookingId=" + ownedBooking.getId()
        );

        String ownedPaymentNotificationId = createInboxNotification(
            NotificationEventType.PAYMENT_APPROVED,
            NotificationAggregateType.PAYMENT,
            "tx-owned-1",
            professionalProfile.getId(),
            "payment-approved-owned",
            "billing",
            "payment_webhook",
            LocalDateTime.of(2026, 3, 18, 9, 5),
            ownedBooking.getId(),
            "Pago aprobado",
            "Se aprobó un pago.",
            NotificationSeverity.SUCCESS,
            "PAYMENT",
            "/profesional/dashboard/reservas?bookingId=" + ownedBooking.getId()
        );

        createTimelineOnlyNotification(
            NotificationEventType.BOOKING_COMPLETED,
            NotificationAggregateType.BOOKING,
            String.valueOf(ownedBooking.getId()),
            professionalProfile.getId(),
            "booking-completed-owned",
            "booking",
            "complete_booking",
            LocalDateTime.of(2026, 3, 18, 9, 10),
            ownedBooking.getId()
        );

        String otherNotificationId = createInboxNotification(
            NotificationEventType.BOOKING_CREATED,
            NotificationAggregateType.BOOKING,
            String.valueOf(otherBooking.getId()),
            otherProfessionalProfile.getId(),
            "booking-created-other",
            "booking",
            "create_public_booking",
            LocalDateTime.of(2026, 3, 18, 9, 15),
            otherBooking.getId(),
            "Reserva ajena",
            "No debe verse.",
            NotificationSeverity.INFO,
            "BOOKING",
            "/profesional/dashboard/reservas?bookingId=" + otherBooking.getId()
        );

        String professionalToken = professionalAccessToken(professionalUser);

        String inboxJson = mockMvc.perform(get("/profesional/notificaciones")
                .param("status", "unread")
                .param("page", "0")
                .param("size", "10")
                .header("Authorization", "Bearer " + professionalToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.total").value(2))
            .andReturn()
            .getResponse()
            .getContentAsString();

        JsonNode inbox = objectMapper.readTree(inboxJson);
        assertEquals(2, inbox.path("items").size());
        assertContainsNotificationId(inbox, ownedCreatedNotificationId);
        assertContainsNotificationId(inbox, ownedPaymentNotificationId);

        mockMvc.perform(get("/profesional/notificaciones/unread-count")
                .header("Authorization", "Bearer " + professionalToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.count").value(2));

        mockMvc.perform(get("/profesional/notificaciones/{id}", ownedCreatedNotificationId)
                .header("Authorization", "Bearer " + professionalToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(ownedCreatedNotificationId))
            .andExpect(jsonPath("$.bookingId").value(ownedBooking.getId()))
            .andExpect(jsonPath("$.type").value("BOOKING_CREATED"));

        mockMvc.perform(get("/profesional/notificaciones/{id}", otherNotificationId)
                .header("Authorization", "Bearer " + professionalToken))
            .andExpect(status().isNotFound());

        mockMvc.perform(patch("/profesional/notificaciones/{id}/read", ownedCreatedNotificationId)
                .contentType(MediaType.APPLICATION_JSON)
                .header("Authorization", "Bearer " + professionalToken))
            .andExpect(status().isNoContent());

        AppNotification afterFirstRead = appNotificationRepository.findById(ownedCreatedNotificationId).orElseThrow();
        assertNotNull(afterFirstRead.getReadAt());
        LocalDateTime firstReadAt = afterFirstRead.getReadAt();

        mockMvc.perform(patch("/profesional/notificaciones/{id}/read", ownedCreatedNotificationId)
                .contentType(MediaType.APPLICATION_JSON)
                .header("Authorization", "Bearer " + professionalToken))
            .andExpect(status().isNoContent());

        AppNotification afterSecondRead = appNotificationRepository.findById(ownedCreatedNotificationId).orElseThrow();
        assertEquals(firstReadAt, afterSecondRead.getReadAt());

        mockMvc.perform(get("/profesional/notificaciones/unread-count")
                .header("Authorization", "Bearer " + professionalToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.count").value(1));

        mockMvc.perform(patch("/profesional/notificaciones/read-all")
                .contentType(MediaType.APPLICATION_JSON)
                .header("Authorization", "Bearer " + professionalToken))
            .andExpect(status().isNoContent());

        mockMvc.perform(get("/profesional/notificaciones/unread-count")
                .header("Authorization", "Bearer " + professionalToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.count").value(0));

        String timelineJson = mockMvc.perform(get("/profesional/reservas/{bookingId}/timeline", ownedBooking.getId())
                .header("Authorization", "Bearer " + professionalToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.bookingId").value(ownedBooking.getId()))
            .andExpect(jsonPath("$.items.length()").value(3))
            .andReturn()
            .getResponse()
            .getContentAsString();

        JsonNode timeline = objectMapper.readTree(timelineJson);
        assertEquals("BOOKING_CREATED", timeline.path("items").get(0).path("type").asText());
        assertEquals("PAYMENT_APPROVED", timeline.path("items").get(1).path("type").asText());
        assertEquals("BOOKING_COMPLETED", timeline.path("items").get(2).path("type").asText());

        mockMvc.perform(get("/profesional/reservas/{bookingId}/timeline", otherBooking.getId())
                .header("Authorization", "Bearer " + professionalToken))
            .andExpect(status().isForbidden());
    }

    @Test
    void timelineUsesExplicitBookingReferenceForFinancialEventsEvenWithoutPayloadBookingId() throws Exception {
        User professionalUser = saveProfessionalUser("pro3@plura.com", "Profesional Tres");
        User clientUser = saveClientUser("client2@plura.com", "Cliente Dos");
        ProfessionalProfile professionalProfile = saveProfessionalProfile(professionalUser, "pro-tres");
        Booking booking = saveBooking(3L, professionalProfile.getId(), clientUser, "Color");

        notificationService.record(
            new NotificationRecordCommand(
                NotificationEventType.PAYMENT_APPROVED,
                NotificationAggregateType.PAYMENT,
                "tx-explicit-booking-ref",
                "billing",
                "payment_webhook",
                NotificationRecipientType.PROFESSIONAL,
                String.valueOf(professionalProfile.getId()),
                null,
                null,
                booking.getId(),
                Map.of("sourceAction", "payment_webhook"),
                "payment-approved-explicit-booking-ref",
                LocalDateTime.of(2026, 3, 18, 10, 0),
                null,
                null
            )
        );

        String professionalToken = professionalAccessToken(professionalUser);

        mockMvc.perform(get("/profesional/reservas/{bookingId}/timeline", booking.getId())
                .header("Authorization", "Bearer " + professionalToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items.length()").value(1))
            .andExpect(jsonPath("$.items[0].type").value("PAYMENT_APPROVED"))
            .andExpect(jsonPath("$.items[0].bookingId").value(booking.getId()));
    }

    private User saveProfessionalUser(String email, String fullName) {
        User user = new User();
        user.setFullName(fullName);
        user.setEmail(email);
        user.setPassword("Password123");
        user.setRole(UserRole.PROFESSIONAL);
        return userRepository.save(user);
    }

    private User saveClientUser(String email, String fullName) {
        User user = new User();
        user.setFullName(fullName);
        user.setEmail(email);
        user.setPassword("Password123");
        user.setRole(UserRole.USER);
        return userRepository.save(user);
    }

    private ProfessionalProfile saveProfessionalProfile(User user, String slug) {
        ProfessionalProfile profile = new ProfessionalProfile();
        profile.setUser(user);
        profile.setRubro("Belleza");
        profile.setDisplayName(user.getFullName());
        profile.setSlug(slug);
        profile.setActive(true);
        return professionalProfileRepository.save(profile);
    }

    private Booking saveBooking(Long idHint, Long professionalId, User clientUser, String serviceName) {
        Booking booking = new Booking();
        booking.setUser(clientUser);
        booking.setProfessionalId(professionalId);
        booking.setServiceId("svc-" + idHint);
        booking.setStartDateTime(LocalDateTime.of(2026, 3, 20, 10, 0).plusHours(idHint));
        booking.setStartDateTimeUtc(booking.getStartDateTime().atZone(ZoneId.of("America/Montevideo")).toInstant());
        booking.setOperationalStatus(BookingOperationalStatus.CONFIRMED);
        booking.setTimezone("America/Montevideo");
        booking.setServiceNameSnapshot(serviceName);
        booking.setServiceDurationSnapshot("60");
        booking.setServiceCurrencySnapshot("UYU");
        booking.setServicePaymentTypeSnapshot(ServicePaymentType.ON_SITE);
        return bookingRepository.save(booking);
    }

    private String createInboxNotification(
        NotificationEventType eventType,
        NotificationAggregateType aggregateType,
        String aggregateId,
        Long professionalProfileId,
        String dedupeKey,
        String sourceModule,
        String sourceAction,
        LocalDateTime occurredAt,
        Long bookingId,
        String title,
        String body,
        NotificationSeverity severity,
        String category,
        String actionUrl
    ) {
        NotificationRegistrationResult registration = notificationService.record(
            notificationCommand(
                eventType,
                aggregateType,
                aggregateId,
                professionalProfileId,
                dedupeKey,
                sourceModule,
                sourceAction,
                occurredAt,
                bookingId,
                new NotificationInAppProjectionCommand(
                    title,
                    body,
                    severity,
                    category,
                    actionUrl,
                    "Ver detalle"
                )
            )
        );
        return appNotificationRepository.findByNotificationEvent_Id(registration.notificationEventId())
            .orElseThrow()
            .getId();
    }

    private void createTimelineOnlyNotification(
        NotificationEventType eventType,
        NotificationAggregateType aggregateType,
        String aggregateId,
        Long professionalProfileId,
        String dedupeKey,
        String sourceModule,
        String sourceAction,
        LocalDateTime occurredAt,
        Long bookingId
    ) {
        notificationService.record(
            notificationCommand(
                eventType,
                aggregateType,
                aggregateId,
                professionalProfileId,
                dedupeKey,
                sourceModule,
                sourceAction,
                occurredAt,
                bookingId,
                null
            )
        );
    }

    private NotificationRecordCommand notificationCommand(
        NotificationEventType eventType,
        NotificationAggregateType aggregateType,
        String aggregateId,
        Long professionalProfileId,
        String dedupeKey,
        String sourceModule,
        String sourceAction,
        LocalDateTime occurredAt,
        Long bookingId,
        NotificationInAppProjectionCommand inAppProjection
    ) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("bookingId", bookingId);
        payload.put("sourceAction", sourceAction);
        return new NotificationRecordCommand(
            eventType,
            aggregateType,
            aggregateId,
            sourceModule,
            sourceAction,
            NotificationRecipientType.PROFESSIONAL,
            String.valueOf(professionalProfileId),
            null,
            null,
            bookingId,
            payload,
            dedupeKey,
            occurredAt,
            inAppProjection,
            null
        );
    }

    private String professionalAccessToken(User user) {
        return JWT.create()
            .withIssuer("plura")
            .withSubject(String.valueOf(user.getId()))
            .withClaim("role", user.getRole().name())
            .withExpiresAt(Instant.now().plusSeconds(3600))
            .sign(Algorithm.HMAC256(JWT_SECRET));
    }

    private void assertContainsNotificationId(JsonNode inbox, String notificationId) {
        for (JsonNode item : inbox.path("items")) {
            if (notificationId.equals(item.path("id").asText())) {
                return;
            }
        }
        throw new AssertionError("No se encontró la notificación " + notificationId);
    }
}
