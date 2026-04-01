package com.plura.plurabackend.notification.integration;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.plura.plurabackend.core.billing.payments.model.PaymentProvider;
import com.plura.plurabackend.core.billing.payments.model.PaymentTransaction;
import com.plura.plurabackend.core.billing.payments.model.PaymentTransactionStatus;
import com.plura.plurabackend.core.billing.webhooks.ParsedWebhookEvent;
import com.plura.plurabackend.core.billing.webhooks.WebhookEventType;
import com.plura.plurabackend.core.booking.model.Booking;
import com.plura.plurabackend.core.notification.application.NotificationRecordCommand;
import com.plura.plurabackend.core.notification.application.NotificationRegistrationResult;
import com.plura.plurabackend.core.notification.integration.billing.ClientBillingNotificationCommandFactory;
import com.plura.plurabackend.core.notification.application.NotificationService;
import com.plura.plurabackend.core.notification.integration.billing.BillingNotificationCommandFactory;
import com.plura.plurabackend.core.notification.integration.billing.BillingNotificationIntegrationService;
import com.plura.plurabackend.core.notification.model.NotificationAggregateType;
import com.plura.plurabackend.core.notification.model.NotificationEventType;
import com.plura.plurabackend.core.professional.ProfessionalNotificationRecipient;
import com.plura.plurabackend.core.professional.ProfessionalNotificationRecipientGateway;
import com.plura.plurabackend.core.user.ClientNotificationRecipient;
import com.plura.plurabackend.core.user.ClientNotificationRecipientGateway;
import com.plura.plurabackend.core.user.model.User;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;

class BillingNotificationIntegrationServiceTest {

    @Test
    void paymentApprovedMapsToCanonicalNotificationEvent() {
        NotificationService notificationService = Mockito.mock(NotificationService.class);
        ProfessionalNotificationRecipientGateway recipientGateway = Mockito.mock(ProfessionalNotificationRecipientGateway.class);
        ClientNotificationRecipientGateway clientRecipientGateway = Mockito.mock(ClientNotificationRecipientGateway.class);
        when(notificationService.record(any())).thenReturn(new NotificationRegistrationResult("evt-1", "uuid-1", true));
        when(recipientGateway.findNotificationRecipientByProfessionalId(30L)).thenReturn(
            Optional.of(new ProfessionalNotificationRecipient(30L, "pro@test.com", "Pro Uno"))
        );

        BillingNotificationIntegrationService service = new BillingNotificationIntegrationService(
            notificationService,
            new BillingNotificationCommandFactory(),
            clientBillingFactory(),
            recipientGateway,
            clientRecipientGateway
        );

        service.recordPaymentApproved(booking(), transaction(), approvedEvent(), "payment_webhook");

        ArgumentCaptor<NotificationRecordCommand> captor = ArgumentCaptor.forClass(NotificationRecordCommand.class);
        verify(notificationService).record(captor.capture());
        NotificationRecordCommand command = captor.getValue();

        assertEquals(NotificationEventType.PAYMENT_APPROVED, command.eventType());
        assertEquals(NotificationAggregateType.PAYMENT, command.aggregateType());
        assertEquals("payment_webhook", command.sourceAction());
        assertTrue(command.dedupeKey().contains("provider-pay-1"));
    }

    @Test
    void paymentRefundedOnlyEmitsClientNotificationAndKeepsSemanticDifferenceForPartialRefund() {
        NotificationService notificationService = Mockito.mock(NotificationService.class);
        ProfessionalNotificationRecipientGateway recipientGateway = Mockito.mock(ProfessionalNotificationRecipientGateway.class);
        ClientNotificationRecipientGateway clientRecipientGateway = Mockito.mock(ClientNotificationRecipientGateway.class);
        when(notificationService.record(any())).thenReturn(new NotificationRegistrationResult("evt-2", "uuid-2", true));
        when(clientRecipientGateway.findNotificationRecipientByUserId(50L)).thenReturn(
            Optional.of(new ClientNotificationRecipient(50L, "client@test.com", "Cliente Uno"))
        );

        BillingNotificationIntegrationService service = new BillingNotificationIntegrationService(
            notificationService,
            new BillingNotificationCommandFactory(),
            clientBillingFactory(),
            recipientGateway,
            clientRecipientGateway
        );

        Booking booking = booking();
        User user = new User();
        user.setId(50L);
        booking.setUser(user);

        service.recordPaymentRefunded(booking, transaction(), partialRefundEvent(), "payment_webhook");

        ArgumentCaptor<NotificationRecordCommand> captor = ArgumentCaptor.forClass(NotificationRecordCommand.class);
        verify(notificationService).record(captor.capture());
        assertEquals(NotificationEventType.PAYMENT_REFUNDED, captor.getValue().eventType());
        assertTrue(captor.getValue().dedupeKey().endsWith("REFUND_PARTIAL"));
        assertTrue(String.valueOf(captor.getValue().payload().get("refundTimingHint")).contains("Mercado Pago"));
        assertTrue(String.valueOf(captor.getValue().payload().get("refundTimingHint")).contains("30 de marzo"));
        assertEquals("Visa Débito", captor.getValue().payload().get("refundPaymentMethodLabel"));
        assertEquals("50", captor.getValue().recipientId());
    }

    @Test
    void paymentRefundPendingOnlyEmitsClientNotification() {
        NotificationService notificationService = Mockito.mock(NotificationService.class);
        ProfessionalNotificationRecipientGateway professionalRecipientGateway = Mockito.mock(ProfessionalNotificationRecipientGateway.class);
        ClientNotificationRecipientGateway clientRecipientGateway = Mockito.mock(ClientNotificationRecipientGateway.class);
        when(notificationService.record(any())).thenReturn(new NotificationRegistrationResult("evt-3", "uuid-3", true));
        when(clientRecipientGateway.findNotificationRecipientByUserId(50L)).thenReturn(
            Optional.of(new ClientNotificationRecipient(50L, "client@test.com", "Cliente Uno"))
        );

        BillingNotificationIntegrationService service = new BillingNotificationIntegrationService(
            notificationService,
            new BillingNotificationCommandFactory(),
            clientBillingFactory(),
            professionalRecipientGateway,
            clientRecipientGateway
        );

        Booking booking = booking();
        User user = new User();
        user.setId(50L);
        booking.setUser(user);

        service.recordPaymentRefundPending(booking, transaction(), null, "refund_dispatch_pending");

        ArgumentCaptor<NotificationRecordCommand> captor = ArgumentCaptor.forClass(NotificationRecordCommand.class);
        verify(notificationService).record(captor.capture());
        assertEquals(NotificationEventType.PAYMENT_REFUND_PENDING, captor.getValue().eventType());
        assertEquals("50", captor.getValue().recipientId());
        assertTrue(String.valueOf(captor.getValue().payload().get("refundTimingHint")).contains("Mercado Pago"));
        assertTrue(String.valueOf(captor.getValue().payload().get("refundTimingHint")).contains("17 de abril"));
        assertEquals("Visa Débito", captor.getValue().payload().get("refundPaymentMethodLabel"));
    }

    @Test
    void paymentApprovedAlsoEmitsClientNotificationWhenBookingHasClientUser() {
        NotificationService notificationService = Mockito.mock(NotificationService.class);
        ProfessionalNotificationRecipientGateway professionalRecipientGateway = Mockito.mock(ProfessionalNotificationRecipientGateway.class);
        ClientNotificationRecipientGateway clientRecipientGateway = Mockito.mock(ClientNotificationRecipientGateway.class);
        when(notificationService.record(any())).thenReturn(new NotificationRegistrationResult("evt-1", "uuid-1", true));
        when(professionalRecipientGateway.findNotificationRecipientByProfessionalId(30L)).thenReturn(
            Optional.of(new ProfessionalNotificationRecipient(30L, "pro@test.com", "Pro Uno"))
        );
        when(clientRecipientGateway.findNotificationRecipientByUserId(50L)).thenReturn(
            Optional.of(new ClientNotificationRecipient(50L, "client@test.com", "Cliente Uno"))
        );

        BillingNotificationIntegrationService service = new BillingNotificationIntegrationService(
            notificationService,
            new BillingNotificationCommandFactory(),
            clientBillingFactory(),
            professionalRecipientGateway,
            clientRecipientGateway
        );

        Booking booking = booking();
        User user = new User();
        user.setId(50L);
        booking.setUser(user);

        service.recordPaymentApproved(booking, transaction(), approvedEvent(), "payment_webhook");

        ArgumentCaptor<NotificationRecordCommand> captor = ArgumentCaptor.forClass(NotificationRecordCommand.class);
        verify(notificationService, times(2)).record(captor.capture());
        assertEquals("30", captor.getAllValues().get(0).recipientId());
        assertEquals("50", captor.getAllValues().get(1).recipientId());
        assertEquals(
            "/profesional/dashboard/reservas?bookingId=40",
            captor.getAllValues().get(0).inAppProjection().actionUrl()
        );
        assertEquals("/cliente/reservas?bookingId=40", captor.getAllValues().get(1).inAppProjection().actionUrl());
    }

    private Booking booking() {
        Booking booking = new Booking();
        booking.setId(40L);
        booking.setProfessionalId(30L);
        booking.setServiceNameSnapshot("Corte");
        return booking;
    }

    private PaymentTransaction transaction() {
        PaymentTransaction transaction = new PaymentTransaction();
        transaction.setId("tx-1");
        transaction.setProfessionalId(30L);
        transaction.setProvider(PaymentProvider.MERCADOPAGO);
        transaction.setProviderPaymentId("provider-pay-1");
        transaction.setProviderStatus("approved");
        transaction.setAmount(new BigDecimal("1500"));
        transaction.setCurrency("UYU");
        transaction.setStatus(PaymentTransactionStatus.APPROVED);
        transaction.setPayloadJson("{\"paymentTypeId\":\"debit_card\",\"paymentMethodId\":\"visa\"}");
        transaction.setApprovedAt(LocalDateTime.of(2026, 3, 18, 11, 0));
        transaction.setUpdatedAt(LocalDateTime.of(2026, 3, 18, 11, 0));
        transaction.setCreatedAt(LocalDateTime.of(2026, 3, 18, 10, 0));
        return transaction;
    }

    private ClientBillingNotificationCommandFactory clientBillingFactory() {
        return new ClientBillingNotificationCommandFactory(new ObjectMapper(), "America/Montevideo");
    }

    private ParsedWebhookEvent approvedEvent() {
        return new ParsedWebhookEvent(
            PaymentProvider.MERCADOPAGO,
            "evt-1",
            "provider-pay-1",
            WebhookEventType.PAYMENT_SUCCEEDED,
            30L,
            40L,
            null,
            "provider-pay-1",
            "booking:40",
            new BigDecimal("1500"),
            "UYU",
            null,
            false,
            LocalDateTime.of(2026, 3, 18, 11, 0),
            "hash-1",
            "{}"
        );
    }

    private ParsedWebhookEvent partialRefundEvent() {
        return new ParsedWebhookEvent(
            PaymentProvider.MERCADOPAGO,
            "evt-2",
            "refund-1",
            WebhookEventType.REFUND_PARTIAL,
            30L,
            40L,
            null,
            "refund-1",
            "refund:1",
            new BigDecimal("500"),
            "UYU",
            null,
            false,
            LocalDateTime.of(2026, 3, 18, 12, 0),
            "hash-2",
            "{}"
        );
    }
}
