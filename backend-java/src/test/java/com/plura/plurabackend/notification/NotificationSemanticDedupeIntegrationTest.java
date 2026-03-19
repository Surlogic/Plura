package com.plura.plurabackend.notification;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;

import com.plura.plurabackend.core.billing.payments.model.PaymentProvider;
import com.plura.plurabackend.core.billing.payments.model.PaymentTransaction;
import com.plura.plurabackend.core.billing.payments.model.PaymentTransactionStatus;
import com.plura.plurabackend.core.billing.webhooks.ParsedWebhookEvent;
import com.plura.plurabackend.core.billing.webhooks.WebhookEventType;
import com.plura.plurabackend.core.booking.event.model.BookingActorType;
import com.plura.plurabackend.core.booking.model.Booking;
import com.plura.plurabackend.core.notification.application.NotificationService;
import com.plura.plurabackend.core.notification.integration.billing.BillingNotificationCommandFactory;
import com.plura.plurabackend.core.notification.integration.booking.BookingNotificationCommandFactory;
import com.plura.plurabackend.core.notification.model.NotificationEventType;
import com.plura.plurabackend.core.notification.model.NotificationRecipientType;
import com.plura.plurabackend.core.notification.query.NotificationInboxPageView;
import com.plura.plurabackend.core.notification.query.NotificationInboxQuery;
import com.plura.plurabackend.core.notification.query.NotificationInboxStatus;
import com.plura.plurabackend.core.notification.query.NotificationQueryService;
import com.plura.plurabackend.core.notification.repository.AppNotificationRepository;
import com.plura.plurabackend.core.notification.repository.EmailDispatchRepository;
import com.plura.plurabackend.core.notification.repository.NotificationEventRepository;
import com.plura.plurabackend.core.professional.ProfessionalNotificationRecipient;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(properties = {
    "SPRING_DATASOURCE_URL=jdbc:h2:mem:notification-semantic-dedupe;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DATABASE_TO_LOWER=TRUE",
    "SPRING_DATASOURCE_USERNAME=sa",
    "SPRING_DATASOURCE_PASSWORD=",
    "SPRING_JPA_DDL_AUTO=create-drop",
    "JWT_SECRET=test-secret-for-notification-semantic-dedupe",
    "JWT_REFRESH_PEPPER=test-refresh-pepper-for-notification-semantic-dedupe",
    "APP_TIMEZONE=America/Montevideo",
    "CACHE_ENABLED=false",
    "SPRING_FLYWAY_ENABLED=false",
    "APP_RATE_LIMIT_ENABLED=false",
    "SWAGGER_ENABLED=false",
    "SQS_ENABLED=false"
})
class NotificationSemanticDedupeIntegrationTest {

    private static final ProfessionalNotificationRecipient RECIPIENT =
        new ProfessionalNotificationRecipient(30L, "pro@test.com", "Pro Uno");

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private NotificationQueryService notificationQueryService;

    @Autowired
    private NotificationEventRepository notificationEventRepository;

    @Autowired
    private AppNotificationRepository appNotificationRepository;

    @Autowired
    private EmailDispatchRepository emailDispatchRepository;

    private final BookingNotificationCommandFactory bookingFactory = new BookingNotificationCommandFactory();
    private final BillingNotificationCommandFactory billingFactory = new BillingNotificationCommandFactory();

    @BeforeEach
    void setUp() {
        emailDispatchRepository.deleteAll();
        appNotificationRepository.deleteAll();
        notificationEventRepository.deleteAll();
    }

    @Test
    void bookingConfirmedFromMultipleInternalPathsIsDeduplicated() {
        Booking booking = booking();

        notificationService.record(bookingFactory.buildBookingConfirmed(
            booking,
            RECIPIENT,
            BookingActorType.PROFESSIONAL,
            11L,
            "create_professional_booking"
        ));
        notificationService.record(bookingFactory.buildBookingConfirmed(
            booking,
            RECIPIENT,
            BookingActorType.SYSTEM,
            null,
            "payment_webhook_auto_confirm"
        ));

        assertEquals(1, notificationEventRepository.count());
        assertEquals(1, appNotificationRepository.count());
        assertEquals(1, emailDispatchRepository.count());
    }

    @Test
    void paymentApprovedFromWebhookAndSyncIsDeduplicated() {
        Booking booking = booking();
        PaymentTransaction transaction = approvedTransaction();

        notificationService.record(billingFactory.buildPaymentApproved(
            booking,
            transaction,
            approvedEvent("evt-webhook", WebhookEventType.PAYMENT_SUCCEEDED),
            RECIPIENT,
            "payment_webhook"
        ));
        notificationService.record(billingFactory.buildPaymentApproved(
            booking,
            transaction,
            approvedEvent("evt-sync", WebhookEventType.PAYMENT_SUCCEEDED),
            RECIPIENT,
            "sync_pending_charge_status"
        ));

        assertEquals(1, notificationEventRepository.count());
        assertEquals(1, appNotificationRepository.count());
        assertEquals(1, emailDispatchRepository.count());
    }

    @Test
    void paymentRefundedPartialAndTotalRemainDistinct() {
        Booking booking = booking();
        PaymentTransaction transaction = approvedTransaction();

        notificationService.record(billingFactory.buildPaymentRefunded(
            booking,
            transaction,
            approvedEvent("evt-refund-partial", WebhookEventType.REFUND_PARTIAL),
            RECIPIENT,
            "payment_webhook"
        ));
        notificationService.record(billingFactory.buildPaymentRefunded(
            booking,
            transaction,
            approvedEvent("evt-refund-total", WebhookEventType.PAYMENT_REFUNDED),
            RECIPIENT,
            "payment_webhook"
        ));

        assertEquals(2, notificationEventRepository.count());
    }

    @Test
    void bookingReschedulesWithDifferentCountsDoNotCollapse() {
        Booking firstReschedule = booking();
        firstReschedule.setRescheduleCount(1);
        Booking secondReschedule = booking();
        secondReschedule.setRescheduleCount(2);

        notificationService.record(bookingFactory.buildBookingRescheduled(
            firstReschedule,
            RECIPIENT,
            BookingActorType.PROFESSIONAL,
            11L,
            "perform_reschedule"
        ));
        notificationService.record(bookingFactory.buildBookingRescheduled(
            secondReschedule,
            RECIPIENT,
            BookingActorType.PROFESSIONAL,
            11L,
            "perform_reschedule"
        ));

        assertEquals(2, notificationEventRepository.count());
    }

    @Test
    void createdAndConfirmedRemainVisibleAsDistinctNotificationsForProfessionalBookings() {
        Booking booking = booking();

        notificationService.record(bookingFactory.buildBookingCreated(
            booking,
            RECIPIENT,
            BookingActorType.PROFESSIONAL,
            11L,
            "create_professional_booking"
        ));
        notificationService.record(bookingFactory.buildBookingConfirmed(
            booking,
            RECIPIENT,
            BookingActorType.PROFESSIONAL,
            11L,
            "create_professional_booking"
        ));

        NotificationInboxPageView inbox = notificationQueryService.listInbox(
            new NotificationInboxQuery(
                NotificationRecipientType.PROFESSIONAL,
                String.valueOf(RECIPIENT.professionalId()),
                NotificationInboxStatus.ALL,
                Set.of(),
                booking.getId(),
                null,
                null,
                0,
                20
            )
        );

        assertEquals(2, inbox.total());
        List<NotificationEventType> types = inbox.items().stream().map(item -> item.type()).toList();
        assertEquals(List.of(NotificationEventType.BOOKING_CONFIRMED, NotificationEventType.BOOKING_CREATED), types);
        assertNotEquals(types.get(0), types.get(1));
    }

    private Booking booking() {
        Booking booking = new Booking();
        booking.setId(40L);
        booking.setProfessionalId(RECIPIENT.professionalId());
        booking.setServiceNameSnapshot("Corte");
        booking.setProfessionalDisplayNameSnapshot("Pro Uno");
        booking.setServiceCurrencySnapshot("UYU");
        booking.setServicePriceSnapshot(new BigDecimal("1500"));
        booking.setStartDateTime(LocalDateTime.of(2026, 3, 20, 10, 0));
        booking.setTimezone("America/Montevideo");
        booking.setCreatedAt(LocalDateTime.of(2026, 3, 18, 9, 0));
        booking.setRescheduleCount(1);
        return booking;
    }

    private PaymentTransaction approvedTransaction() {
        PaymentTransaction transaction = new PaymentTransaction();
        transaction.setId("tx-1");
        transaction.setProfessionalId(RECIPIENT.professionalId());
        transaction.setProvider(PaymentProvider.MERCADOPAGO);
        transaction.setProviderPaymentId("provider-pay-1");
        transaction.setProviderStatus("approved");
        transaction.setAmount(new BigDecimal("1500"));
        transaction.setCurrency("UYU");
        transaction.setStatus(PaymentTransactionStatus.APPROVED);
        transaction.setApprovedAt(LocalDateTime.of(2026, 3, 18, 11, 0));
        transaction.setUpdatedAt(LocalDateTime.of(2026, 3, 18, 11, 0));
        transaction.setCreatedAt(LocalDateTime.of(2026, 3, 18, 10, 0));
        return transaction;
    }

    private ParsedWebhookEvent approvedEvent(String providerEventId, WebhookEventType eventType) {
        return new ParsedWebhookEvent(
            PaymentProvider.MERCADOPAGO,
            providerEventId,
            "provider-pay-1",
            eventType,
            RECIPIENT.professionalId(),
            40L,
            null,
            "provider-pay-1",
            "booking:40",
            new BigDecimal("1500"),
            "UYU",
            null,
            false,
            LocalDateTime.of(2026, 3, 18, 11, 0),
            "hash-" + providerEventId,
            "{}"
        );
    }
}
