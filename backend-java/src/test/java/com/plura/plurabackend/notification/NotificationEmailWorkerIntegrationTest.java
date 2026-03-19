package com.plura.plurabackend.notification;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.plura.plurabackend.core.auth.TransactionalEmailService;
import com.plura.plurabackend.core.notification.application.NotificationEmailProjectionCommand;
import com.plura.plurabackend.core.notification.application.NotificationRecordCommand;
import com.plura.plurabackend.core.notification.application.NotificationRegistrationResult;
import com.plura.plurabackend.core.notification.application.NotificationService;
import com.plura.plurabackend.core.notification.dispatch.NotificationEmailWorker;
import com.plura.plurabackend.core.notification.email.NotificationEmailDispatchService;
import com.plura.plurabackend.core.notification.metrics.NotificationMetricsService;
import com.plura.plurabackend.core.notification.model.EmailDispatch;
import com.plura.plurabackend.core.notification.model.EmailDispatchStatus;
import com.plura.plurabackend.core.notification.model.NotificationAggregateType;
import com.plura.plurabackend.core.notification.model.NotificationEventType;
import com.plura.plurabackend.core.notification.model.NotificationRecipientType;
import com.plura.plurabackend.core.notification.repository.AppNotificationRepository;
import com.plura.plurabackend.core.notification.repository.EmailDispatchRepository;
import com.plura.plurabackend.core.notification.repository.NotificationEventRepository;
import io.micrometer.core.instrument.MeterRegistry;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;

@SpringBootTest(properties = {
    "SPRING_DATASOURCE_URL=jdbc:h2:mem:notification-email-worker;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DATABASE_TO_LOWER=TRUE",
    "SPRING_DATASOURCE_USERNAME=sa",
    "SPRING_DATASOURCE_PASSWORD=",
    "SPRING_JPA_DDL_AUTO=create-drop",
    "JWT_SECRET=test-secret-for-notification-email-worker",
    "JWT_REFRESH_PEPPER=test-refresh-pepper-for-notification-email-worker",
    "APP_TIMEZONE=America/Montevideo",
    "CACHE_ENABLED=false",
    "SPRING_FLYWAY_ENABLED=false",
    "APP_RATE_LIMIT_ENABLED=false",
    "SWAGGER_ENABLED=false",
    "SQS_ENABLED=false",
    "app.notification.email-worker.delay-millis=600000",
    "app.notification.email-worker.batch-size=10",
    "app.notification.email-worker.lease-seconds=60",
    "app.notification.email.max-attempts=3",
    "app.notification.email.initial-delay-seconds=60",
    "app.notification.email.max-delay-seconds=600"
})
class NotificationEmailWorkerIntegrationTest {

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private NotificationEmailWorker notificationEmailWorker;

    @Autowired
    private NotificationEmailDispatchService notificationEmailDispatchService;

    @Autowired
    private NotificationEventRepository notificationEventRepository;

    @Autowired
    private AppNotificationRepository appNotificationRepository;

    @Autowired
    private EmailDispatchRepository emailDispatchRepository;

    @Autowired
    private NotificationMetricsService notificationMetricsService;

    @Autowired
    private MeterRegistry meterRegistry;

    @MockBean
    private TransactionalEmailService transactionalEmailService;

    @BeforeEach
    void setUp() {
        emailDispatchRepository.deleteAll();
        appNotificationRepository.deleteAll();
        notificationEventRepository.deleteAll();
    }

    @Test
    void shouldSendPendingDispatchSuccessfully() throws Exception {
        double sentBefore = counterValue("plura.notification.email.sent");
        when(transactionalEmailService.send(any())).thenReturn(TransactionalEmailService.DeliveryStatus.SENT);

        EmailDispatch dispatch = createEmailDispatch(
            "booking-created-email-success",
            NotificationEventType.BOOKING_CREATED,
            "professional_booking_created",
            "Nueva reserva en Plura"
        );

        boolean processed = notificationEmailWorker.kickDispatchAsync(dispatch.getId()).get(5, TimeUnit.SECONDS);

        assertTrue(processed);
        EmailDispatch updated = emailDispatchRepository.findById(dispatch.getId()).orElseThrow();
        assertEquals(EmailDispatchStatus.SENT, updated.getStatus());
        assertEquals(1, updated.getAttemptCount());
        assertNotNull(updated.getLastAttemptAt());
        assertNotNull(updated.getSentAt());
        assertNull(updated.getNextAttemptAt());
        assertNull(updated.getErrorCode());
        assertNull(updated.getErrorMessage());
        assertNull(updated.getLockedBy());
        assertNull(updated.getLeaseUntil());
        notificationMetricsService.refreshGauges();
        assertEquals(sentBefore + 1d, counterValue("plura.notification.email.sent"), 0.0001d);
        assertEquals(1d, gaugeValue("plura.notification.email.dispatch.count", "status", "SENT"), 0.0001d);
        verify(transactionalEmailService).send(any());
    }

    @Test
    void shouldScheduleRetryWhenSmtpFails() throws Exception {
        double retriesBefore = counterValue("plura.notification.email.retry.scheduled");
        double smtpFailuresBefore = counterValue("plura.notification.email.smtp.failures", "error_code", "smtp_send_failed");
        when(transactionalEmailService.send(any())).thenReturn(TransactionalEmailService.DeliveryStatus.FAILED);

        EmailDispatch dispatch = createEmailDispatch(
            "payment-failed-email-retry",
            NotificationEventType.PAYMENT_FAILED,
            "professional_payment_failed",
            "Pago fallido"
        );

        boolean processed = notificationEmailWorker.kickDispatchAsync(dispatch.getId()).get(5, TimeUnit.SECONDS);

        assertTrue(processed);
        EmailDispatch updated = emailDispatchRepository.findById(dispatch.getId()).orElseThrow();
        assertEquals(EmailDispatchStatus.RETRY_SCHEDULED, updated.getStatus());
        assertEquals(1, updated.getAttemptCount());
        assertNotNull(updated.getLastAttemptAt());
        assertNotNull(updated.getNextAttemptAt());
        assertNull(updated.getSentAt());
        assertEquals("smtp_send_failed", updated.getErrorCode());
        assertEquals("Fallo el envío SMTP de notification email", updated.getErrorMessage());
        assertNull(updated.getLockedBy());
        assertNull(updated.getLeaseUntil());
        notificationMetricsService.refreshGauges();
        assertEquals(retriesBefore + 1d, counterValue("plura.notification.email.retry.scheduled"), 0.0001d);
        assertEquals(smtpFailuresBefore + 1d, counterValue("plura.notification.email.smtp.failures", "error_code", "smtp_send_failed"), 0.0001d);
        assertEquals(1d, gaugeValue("plura.notification.email.dispatch.count", "status", "RETRY_SCHEDULED"), 0.0001d);
        verify(transactionalEmailService).send(any());
    }

    @Test
    void shouldNotClaimSameDispatchTwice() {
        EmailDispatch dispatch = createEmailDispatch(
            "booking-confirmed-claim-test",
            NotificationEventType.BOOKING_CONFIRMED,
            "professional_booking_confirmed",
            "Reserva confirmada"
        );

        EmailDispatch firstClaim = notificationEmailDispatchService.claimDispatch(
            dispatch.getId(),
            "worker-a",
            LocalDateTime.now().plusSeconds(60)
        );
        EmailDispatch secondClaim = notificationEmailDispatchService.claimDispatch(
            dispatch.getId(),
            "worker-b",
            LocalDateTime.now().plusSeconds(60)
        );

        assertNotNull(firstClaim);
        assertNull(secondClaim);

        EmailDispatch updated = emailDispatchRepository.findById(dispatch.getId()).orElseThrow();
        assertEquals(EmailDispatchStatus.PROCESSING, updated.getStatus());
        assertEquals(1, updated.getAttemptCount());
        assertEquals("worker-a", updated.getLockedBy());
        assertNotNull(updated.getLeaseUntil());
    }

    @Test
    void shouldRecoverExpiredLeaseAndAllowReclaim() {
        EmailDispatch dispatch = createEmailDispatch(
            "booking-completed-lease-recovery",
            NotificationEventType.BOOKING_COMPLETED,
            "professional_booking_completed",
            "Reserva completada"
        );

        EmailDispatch firstClaim = notificationEmailDispatchService.claimDispatch(
            dispatch.getId(),
            "worker-a",
            LocalDateTime.now().minusSeconds(5)
        );
        EmailDispatch reclaimed = notificationEmailDispatchService.claimDispatch(
            dispatch.getId(),
            "worker-b",
            LocalDateTime.now().plusSeconds(60)
        );

        assertNotNull(firstClaim);
        assertNotNull(reclaimed);
        assertEquals(2, reclaimed.getAttemptCount());
        assertEquals("worker-b", reclaimed.getLockedBy());
    }

    @Test
    void shouldFailWhenRetryBudgetIsExhausted() throws Exception {
        double exhaustedBefore = counterValue("plura.notification.email.retries.exhausted");
        when(transactionalEmailService.send(any())).thenReturn(TransactionalEmailService.DeliveryStatus.FAILED);

        EmailDispatch dispatch = createEmailDispatch(
            "payment-approved-retries-exhausted",
            NotificationEventType.PAYMENT_APPROVED,
            "professional_payment_approved",
            "Pago aprobado"
        );
        dispatch.setAttemptCount(2);
        emailDispatchRepository.saveAndFlush(dispatch);

        boolean processed = notificationEmailWorker.kickDispatchAsync(dispatch.getId()).get(5, TimeUnit.SECONDS);

        assertTrue(processed);
        EmailDispatch updated = emailDispatchRepository.findById(dispatch.getId()).orElseThrow();
        assertEquals(EmailDispatchStatus.FAILED, updated.getStatus());
        assertEquals(3, updated.getAttemptCount());
        assertEquals("smtp_send_failed", updated.getErrorCode());
        assertNotNull(updated.getLastAttemptAt());
        assertNull(updated.getNextAttemptAt());
        assertEquals(exhaustedBefore + 1d, counterValue("plura.notification.email.retries.exhausted"), 0.0001d);
    }

    @Test
    void shouldFailUnsupportedTemplateWithoutSending() throws Exception {
        double templateFailuresBefore = counterValue("plura.notification.email.template.failures");
        EmailDispatch dispatch = createEmailDispatch(
            "review-received-email-unsupported",
            NotificationEventType.REVIEW_RECEIVED,
            "professional_review_received",
            "Nueva reseña"
        );

        boolean processed = notificationEmailWorker.kickDispatchAsync(dispatch.getId()).get(5, TimeUnit.SECONDS);

        assertFalse(processed);
        EmailDispatch updated = emailDispatchRepository.findById(dispatch.getId()).orElseThrow();
        assertEquals(EmailDispatchStatus.FAILED, updated.getStatus());
        assertEquals(1, updated.getAttemptCount());
        assertEquals("template_render_error", updated.getErrorCode());
        assertTrue(updated.getErrorMessage().contains("REVIEW_RECEIVED"));
        assertEquals(templateFailuresBefore + 1d, counterValue("plura.notification.email.template.failures"), 0.0001d);
        verify(transactionalEmailService, never()).send(any());
    }

    private EmailDispatch createEmailDispatch(
        String dedupeKey,
        NotificationEventType eventType,
        String templateKey,
        String subject
    ) {
        NotificationRegistrationResult result = notificationService.record(
            new NotificationRecordCommand(
                eventType,
                eventType.name().startsWith("PAYMENT_") ? NotificationAggregateType.PAYMENT : NotificationAggregateType.BOOKING,
                eventType.name().startsWith("PAYMENT_") ? "payment-1" : "booking-1",
                eventType.name().startsWith("PAYMENT_") ? "billing" : "booking",
                eventType.name().startsWith("PAYMENT_") ? "paymentWebhook" : "createPublicBooking",
                NotificationRecipientType.PROFESSIONAL,
                "professional-1",
                null,
                null,
                101L,
                Map.of(
                    "bookingId", 101,
                    "serviceName", "Corte y barba",
                    "startDateTime", "2026-03-20T14:30:00",
                    "timezone", "America/Montevideo",
                    "amount", 1850,
                    "currency", "UYU",
                    "providerStatus", "approved"
                ),
                dedupeKey,
                LocalDateTime.of(2026, 3, 18, 12, 0),
                null,
                new NotificationEmailProjectionCommand(
                    "pro@plura.test",
                    templateKey,
                    subject,
                    Map.of(
                        "bookingId", 101,
                        "serviceName", "Corte y barba",
                        "startDateTime", "2026-03-20T14:30:00",
                        "timezone", "America/Montevideo",
                        "amount", 1850,
                        "currency", "UYU",
                        "providerStatus", "approved"
                    )
                )
            )
        );
        return emailDispatchRepository.findByNotificationEvent_Id(result.notificationEventId()).orElseThrow();
    }

    private double counterValue(String meterName, String... tags) {
        io.micrometer.core.instrument.Counter counter = meterRegistry.find(meterName).tags(tags).counter();
        return counter == null ? 0d : counter.count();
    }

    private double gaugeValue(String meterName, String... tags) {
        io.micrometer.core.instrument.Gauge gauge = meterRegistry.find(meterName).tags(tags).gauge();
        return gauge == null ? 0d : gauge.value();
    }
}
