package com.plura.plurabackend.notification;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.plura.plurabackend.core.notification.email.NotificationEmailMessage;
import com.plura.plurabackend.core.notification.email.NotificationEmailTemplateException;
import com.plura.plurabackend.core.notification.email.NotificationEmailTemplateService;
import com.plura.plurabackend.core.notification.model.EmailDispatch;
import com.plura.plurabackend.core.notification.model.NotificationAggregateType;
import com.plura.plurabackend.core.notification.model.NotificationEvent;
import com.plura.plurabackend.core.notification.model.NotificationEventType;
import com.plura.plurabackend.core.notification.model.NotificationRecipientType;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;
import org.junit.jupiter.api.Test;
import java.util.stream.Stream;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

class NotificationEmailTemplateServiceTest {

    private final NotificationEmailTemplateService templateService =
        new NotificationEmailTemplateService(new ObjectMapper(), "Plura", "https://app.plura.test");

    @ParameterizedTest
    @MethodSource("supportedEventTypes")
    void shouldBuildBusinessTemplatePerSupportedEvent(
        NotificationEventType eventType,
        String templateKey,
        String expectedSubject,
        String expectedSnippet
    ) {
        NotificationEmailMessage message = templateService.buildMessage(
            buildDispatch(eventType, templateKey, null, NotificationRecipientType.PROFESSIONAL)
        );

        assertEquals(templateKey, message.templateKey());
        assertEquals("pro@plura.test", message.toAddress());
        assertEquals(expectedSubject, message.subject());
        assertTrue(message.htmlBody().contains(expectedSnippet));
        assertTrue(message.textBody().contains(expectedSnippet));
    }

    @ParameterizedTest
    @MethodSource("unsupportedEventTypes")
    void shouldRejectUnsupportedBusinessTemplates(NotificationEventType eventType) {
        NotificationEmailTemplateException exception = assertThrows(
            NotificationEmailTemplateException.class,
            () -> templateService.buildMessage(
                buildDispatch(eventType, "unsupported_template", null, NotificationRecipientType.PROFESSIONAL)
            )
        );

        assertTrue(exception.getMessage().contains(eventType.name()));
    }

    @Test
    void shouldBuildClientTemplateWithClientCopyAndClientActionUrl() {
        NotificationEmailMessage message = templateService.buildMessage(
            buildDispatch(
                NotificationEventType.BOOKING_CONFIRMED,
                "client_booking_confirmed",
                null,
                NotificationRecipientType.CLIENT
            )
        );

        assertEquals("client_booking_confirmed", message.templateKey());
        assertEquals("pro@plura.test", message.toAddress());
        assertTrue(message.htmlBody().contains("Tu reserva para Corte y barba quedó confirmada."));
        assertTrue(message.htmlBody().contains("Profesional:</strong> Pro Uno"));
        assertTrue(message.textBody().contains("Profesional: Pro Uno"));
        assertTrue(message.textBody().contains("/cliente/reservas?bookingId=101"));
    }

    @Test
    void shouldBuildProfessionalTemplateWithDashboardReservationActionUrl() {
        NotificationEmailMessage message = templateService.buildMessage(
            buildDispatch(
                NotificationEventType.BOOKING_CREATED,
                "professional_booking_created",
                null,
                NotificationRecipientType.PROFESSIONAL
            )
        );

        assertTrue(message.textBody().contains("/profesional/dashboard/reservas?bookingId=101"));
    }

    @Test
    void shouldBuildRefundPendingTemplateWithTimingNoticeForClient() {
        NotificationEmailMessage message = templateService.buildMessage(
            buildDispatch(
                NotificationEventType.PAYMENT_REFUND_PENDING,
                "client_payment_refund_pending",
                null,
                NotificationRecipientType.CLIENT
            )
        );

        assertEquals("client_payment_refund_pending", message.templateKey());
        assertTrue(message.htmlBody().contains("Mercado Pago"));
        assertTrue(message.htmlBody().contains("Acreditación:</strong>"));
        assertTrue(message.textBody().contains("Mercado Pago"));
        assertTrue(message.textBody().contains("Acreditación:"));
    }

    private static Stream<Arguments> supportedEventTypes() {
        return Stream.of(
            Arguments.of(NotificationEventType.BOOKING_CREATED, "professional_booking_created", "Nueva reserva en Plura", "Nueva reserva"),
            Arguments.of(NotificationEventType.BOOKING_CONFIRMED, "professional_booking_confirmed", "Reserva confirmada", "Reserva confirmada"),
            Arguments.of(NotificationEventType.BOOKING_CANCELLED, "professional_booking_cancelled", "Reserva cancelada", "Reserva cancelada"),
            Arguments.of(NotificationEventType.BOOKING_RESCHEDULED, "professional_booking_rescheduled", "Reserva reagendada", "Reserva reagendada"),
            Arguments.of(NotificationEventType.BOOKING_COMPLETED, "professional_booking_completed", "Reserva completada", "Reserva completada"),
            Arguments.of(NotificationEventType.BOOKING_NO_SHOW, "professional_booking_no_show", "Reserva marcada como no-show", "Reserva marcada como no-show"),
            Arguments.of(NotificationEventType.PAYMENT_APPROVED, "professional_payment_approved", "Pago aprobado", "Pago aprobado"),
            Arguments.of(NotificationEventType.PAYMENT_FAILED, "professional_payment_failed", "Pago fallido", "Pago fallido"),
            Arguments.of(NotificationEventType.PAYMENT_REFUND_PENDING, "professional_payment_refund_pending", "Reembolso en proceso", "Reembolso en proceso"),
            Arguments.of(NotificationEventType.PAYMENT_REFUNDED, "professional_payment_refunded", "Reembolso registrado", "Reembolso registrado")
        );
    }

    private static Stream<NotificationEventType> unsupportedEventTypes() {
        return Stream.of(
            NotificationEventType.REVIEW_RECEIVED,
            NotificationEventType.POLICY_UPDATED,
            NotificationEventType.SCHEDULE_UPDATED
        );
    }

    private EmailDispatch buildDispatch(
        NotificationEventType eventType,
        String templateKey,
        String subjectOverride,
        NotificationRecipientType recipientType
    ) {
        NotificationEvent event = new NotificationEvent();
        event.setId("event-" + eventType.name().toLowerCase());
        event.setEventUuid("uuid-" + eventType.name().toLowerCase());
        event.setEventType(eventType);
        event.setAggregateType(eventType.name().startsWith("PAYMENT_") ? NotificationAggregateType.PAYMENT : NotificationAggregateType.BOOKING);
        event.setAggregateId(eventType.name().startsWith("PAYMENT_") ? "payment-1" : "booking-1");
        event.setRecipientType(recipientType);
        event.setOccurredAt(LocalDateTime.of(2026, 3, 18, 11, 0));
        event.setCreatedAt(LocalDateTime.of(2026, 3, 18, 11, 1));

        EmailDispatch dispatch = new EmailDispatch();
        dispatch.setId("dispatch-" + eventType.name().toLowerCase());
        dispatch.setNotificationEvent(event);
        dispatch.setRecipientEmail("pro@plura.test");
        dispatch.setTemplateKey(templateKey);
        dispatch.setSubject(subjectOverride);
        dispatch.setPayloadJson(writePayload(eventType));
        return dispatch;
    }

    private String writePayload(NotificationEventType eventType) {
        try {
            return new ObjectMapper().writeValueAsString(
                Map.of(
                    "bookingId", 101,
                    "serviceName", "Corte y barba",
                    "startDateTime", "2026-03-20T14:30:00",
                    "timezone", "America/Montevideo",
                    "professionalDisplayName", "Pro Uno",
                    "amount", BigDecimal.valueOf(1850),
                    "currency", "UYU",
                    "providerStatus", "approved",
                    "refundTimingHint", "La devolución se acreditará según los tiempos de Mercado Pago y del emisor del medio de pago."
                )
            );
        } catch (Exception exception) {
            throw new IllegalStateException("No se pudo serializar payload de prueba para " + eventType, exception);
        }
    }
}
