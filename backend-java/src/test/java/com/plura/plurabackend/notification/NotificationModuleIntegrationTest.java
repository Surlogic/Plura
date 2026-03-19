package com.plura.plurabackend.notification;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.plura.plurabackend.core.notification.application.NotificationEmailProjectionCommand;
import com.plura.plurabackend.core.notification.application.NotificationInAppProjectionCommand;
import com.plura.plurabackend.core.notification.application.NotificationRecordCommand;
import com.plura.plurabackend.core.notification.application.NotificationRegistrationResult;
import com.plura.plurabackend.core.notification.application.NotificationService;
import com.plura.plurabackend.core.notification.model.AppNotification;
import com.plura.plurabackend.core.notification.model.EmailDispatch;
import com.plura.plurabackend.core.notification.model.EmailDispatchStatus;
import com.plura.plurabackend.core.notification.model.NotificationAggregateType;
import com.plura.plurabackend.core.notification.model.NotificationEvent;
import com.plura.plurabackend.core.notification.model.NotificationEventType;
import com.plura.plurabackend.core.notification.model.NotificationRecipientType;
import com.plura.plurabackend.core.notification.model.NotificationSeverity;
import com.plura.plurabackend.core.notification.repository.AppNotificationRepository;
import com.plura.plurabackend.core.notification.repository.EmailDispatchRepository;
import com.plura.plurabackend.core.notification.repository.NotificationEventRepository;
import io.micrometer.core.instrument.MeterRegistry;
import java.time.LocalDateTime;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(properties = {
    "SPRING_DATASOURCE_URL=jdbc:h2:mem:notification-module;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DATABASE_TO_LOWER=TRUE",
    "SPRING_DATASOURCE_USERNAME=sa",
    "SPRING_DATASOURCE_PASSWORD=",
    "SPRING_JPA_DDL_AUTO=create-drop",
    "JWT_SECRET=test-secret-for-context-load",
    "JWT_REFRESH_PEPPER=test-refresh-pepper",
    "APP_TIMEZONE=America/Montevideo",
    "CACHE_ENABLED=false",
    "SPRING_FLYWAY_ENABLED=false",
    "APP_RATE_LIMIT_ENABLED=false",
    "HIKARI_CONNECTION_INIT_SQL=SELECT 1",
    "SWAGGER_ENABLED=false"
})
class NotificationModuleIntegrationTest {

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private NotificationEventRepository notificationEventRepository;

    @Autowired
    private AppNotificationRepository appNotificationRepository;

    @Autowired
    private EmailDispatchRepository emailDispatchRepository;

    @Autowired
    private MeterRegistry meterRegistry;

    @BeforeEach
    void setUp() {
        emailDispatchRepository.deleteAll();
        appNotificationRepository.deleteAll();
        notificationEventRepository.deleteAll();
    }

    @Test
    void shouldPersistNotificationEvent() {
        double createdBefore = counterValue("plura.notification.events.created");
        NotificationRegistrationResult result = notificationService.record(baseCommand("booking-created-1", null, null));

        assertTrue(result.created());
        assertEquals(1, notificationEventRepository.count());

        NotificationEvent event = notificationEventRepository.findById(result.notificationEventId()).orElseThrow();
        assertEquals(NotificationEventType.BOOKING_CREATED, event.getEventType());
        assertEquals(NotificationAggregateType.BOOKING, event.getAggregateType());
        assertEquals("booking-1", event.getAggregateId());
        assertEquals("booking", event.getSourceModule());
        assertEquals("createPublicBooking", event.getSourceAction());
        assertEquals(NotificationRecipientType.PROFESSIONAL, event.getRecipientType());
        assertEquals("professional-1", event.getRecipientId());
        assertEquals("booking-created-1", event.getDedupeKey());
        assertNotNull(event.getEventUuid());
        assertTrue(event.getPayloadJson().contains("\"bookingId\":\"booking-1\""));
        assertEquals(createdBefore + 1d, counterValue("plura.notification.events.created"), 0.0001d);
    }

    @Test
    void shouldDeduplicateByDedupeKey() {
        double dedupedBefore = counterValue("plura.notification.events.deduplicated");
        NotificationInAppProjectionCommand inAppProjection = new NotificationInAppProjectionCommand(
            "Reserva creada",
            "Se creó una reserva nueva",
            NotificationSeverity.INFO,
            "BOOKING",
            "/profesional/dashboard/reservas?bookingId=booking-1",
            "Ver reserva"
        );
        NotificationEmailProjectionCommand emailProjection = new NotificationEmailProjectionCommand(
            "pro@test.com",
            "booking_created",
            "Nueva reserva",
            Map.of("bookingId", "booking-1")
        );

        NotificationRegistrationResult first = notificationService.record(
            baseCommand("booking-created-dedupe", inAppProjection, emailProjection)
        );
        NotificationRegistrationResult second = notificationService.record(
            baseCommand("booking-created-dedupe", inAppProjection, emailProjection)
        );

        assertTrue(first.created());
        assertFalse(second.created());
        assertEquals(first.notificationEventId(), second.notificationEventId());
        assertEquals(1, notificationEventRepository.count());
        assertEquals(1, appNotificationRepository.count());
        assertEquals(1, emailDispatchRepository.count());
        assertEquals(dedupedBefore + 1d, counterValue("plura.notification.events.deduplicated"), 0.0001d);
    }

    @Test
    void shouldProjectAppNotification() {
        NotificationInAppProjectionCommand inAppProjection = new NotificationInAppProjectionCommand(
            "Pago fallido",
            "La reserva booking-1 tuvo un pago fallido",
            NotificationSeverity.ERROR,
            "PAYMENT",
            "/profesional/dashboard/reservas?bookingId=booking-1",
            "Revisar"
        );

        NotificationRegistrationResult result = notificationService.record(
            baseCommand("payment-failed-1", inAppProjection, null)
        );

        AppNotification appNotification = appNotificationRepository.findByNotificationEvent_Id(result.notificationEventId())
            .orElseThrow();
        assertEquals(NotificationRecipientType.PROFESSIONAL, appNotification.getRecipientType());
        assertEquals("professional-1", appNotification.getRecipientId());
        assertEquals("Pago fallido", appNotification.getTitle());
        assertEquals("La reserva booking-1 tuvo un pago fallido", appNotification.getBody());
        assertEquals(NotificationSeverity.ERROR, appNotification.getSeverity());
        assertEquals("PAYMENT", appNotification.getCategory());
        assertEquals("/profesional/dashboard/reservas?bookingId=booking-1", appNotification.getActionUrl());
        assertEquals("Revisar", appNotification.getActionLabel());
        assertNull(appNotification.getReadAt());
        assertNull(appNotification.getArchivedAt());
    }

    @Test
    void shouldProjectEmailDispatchAsPending() {
        NotificationEmailProjectionCommand emailProjection = new NotificationEmailProjectionCommand(
            "pro@test.com",
            "payment_failed",
            "Hubo un problema con un pago",
            Map.of("bookingId", "booking-1", "reason", "DECLINED")
        );

        NotificationRegistrationResult result = notificationService.record(
            baseCommand("payment-failed-email-1", null, emailProjection)
        );

        EmailDispatch emailDispatch = emailDispatchRepository.findByNotificationEvent_Id(result.notificationEventId())
            .orElseThrow();
        assertEquals("pro@test.com", emailDispatch.getRecipientEmail());
        assertEquals("payment_failed", emailDispatch.getTemplateKey());
        assertEquals("Hubo un problema con un pago", emailDispatch.getSubject());
        assertEquals(EmailDispatchStatus.PENDING, emailDispatch.getStatus());
        assertEquals(0, emailDispatch.getAttemptCount());
        assertTrue(emailDispatch.getPayloadJson().contains("\"reason\":\"DECLINED\""));
        assertNull(emailDispatch.getLastAttemptAt());
        assertNull(emailDispatch.getNextAttemptAt());
        assertNull(emailDispatch.getSentAt());
    }

    private NotificationRecordCommand baseCommand(
        String dedupeKey,
        NotificationInAppProjectionCommand inAppProjection,
        NotificationEmailProjectionCommand emailProjection
    ) {
        return new NotificationRecordCommand(
            dedupeKey.startsWith("payment") ? NotificationEventType.PAYMENT_FAILED : NotificationEventType.BOOKING_CREATED,
            NotificationAggregateType.BOOKING,
            "booking-1",
            "booking",
            dedupeKey.startsWith("payment") ? "paymentWebhook" : "createPublicBooking",
            NotificationRecipientType.PROFESSIONAL,
            "professional-1",
            null,
            null,
            null,
            Map.of("bookingId", "booking-1"),
            dedupeKey,
            LocalDateTime.of(2026, 3, 18, 10, 30),
            inAppProjection,
            emailProjection
        );
    }

    private double counterValue(String meterName) {
        io.micrometer.core.instrument.Counter counter = meterRegistry.find(meterName).counter();
        return counter == null ? 0d : counter.count();
    }
}
