package com.plura.plurabackend.core.notification.integration.billing;

import com.plura.plurabackend.core.billing.payments.model.PaymentTransaction;
import com.plura.plurabackend.core.billing.webhooks.ParsedWebhookEvent;
import com.plura.plurabackend.core.booking.model.Booking;
import com.plura.plurabackend.core.notification.application.NotificationEmailProjectionCommand;
import com.plura.plurabackend.core.notification.application.NotificationInAppProjectionCommand;
import com.plura.plurabackend.core.notification.application.NotificationRecordCommand;
import com.plura.plurabackend.core.notification.model.NotificationActorType;
import com.plura.plurabackend.core.notification.model.NotificationAggregateType;
import com.plura.plurabackend.core.notification.model.NotificationEventType;
import com.plura.plurabackend.core.notification.model.NotificationRecipientType;
import com.plura.plurabackend.core.notification.model.NotificationSeverity;
import com.plura.plurabackend.core.user.ClientNotificationRecipient;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public class ClientBillingNotificationCommandFactory {

    public NotificationRecordCommand buildPaymentApproved(
        Booking booking,
        PaymentTransaction transaction,
        ParsedWebhookEvent event,
        ClientNotificationRecipient recipient,
        String sourceAction
    ) {
        Map<String, Object> payload = basePayload(booking, transaction, event, sourceAction);
        return buildCommand(
            NotificationEventType.PAYMENT_APPROVED,
            booking,
            transaction,
            event,
            recipient,
            sourceAction,
            dedupeKey(NotificationEventType.PAYMENT_APPROVED, booking, recipient, transaction, null),
            payload,
            new NotificationInAppProjectionCommand(
                "Pago aprobado",
                "Se aprobó el pago asociado a tu reserva de " + serviceLabel(booking) + ".",
                NotificationSeverity.SUCCESS,
                "PAYMENT",
                actionUrl(booking),
                "Ver reserva"
            ),
            emailProjection(recipient, "client_payment_approved", "Pago aprobado", payload)
        );
    }

    public NotificationRecordCommand buildPaymentFailed(
        Booking booking,
        PaymentTransaction transaction,
        ParsedWebhookEvent event,
        ClientNotificationRecipient recipient,
        String sourceAction
    ) {
        Map<String, Object> payload = basePayload(booking, transaction, event, sourceAction);
        return buildCommand(
            NotificationEventType.PAYMENT_FAILED,
            booking,
            transaction,
            event,
            recipient,
            sourceAction,
            dedupeKey(NotificationEventType.PAYMENT_FAILED, booking, recipient, transaction, null),
            payload,
            new NotificationInAppProjectionCommand(
                "Pago fallido",
                "No pudimos aprobar el pago asociado a tu reserva de " + serviceLabel(booking) + ".",
                NotificationSeverity.ERROR,
                "PAYMENT",
                actionUrl(booking),
                "Ver reserva"
            ),
            emailProjection(recipient, "client_payment_failed", "Pago fallido", payload)
        );
    }

    public NotificationRecordCommand buildPaymentRefunded(
        Booking booking,
        PaymentTransaction transaction,
        ParsedWebhookEvent event,
        ClientNotificationRecipient recipient,
        String sourceAction
    ) {
        Map<String, Object> payload = basePayload(booking, transaction, event, sourceAction);
        return buildCommand(
            NotificationEventType.PAYMENT_REFUNDED,
            booking,
            transaction,
            event,
            recipient,
            sourceAction,
            dedupeKey(
                NotificationEventType.PAYMENT_REFUNDED,
                booking,
                recipient,
                transaction,
                event == null || event.eventType() == null ? null : event.eventType().name()
            ),
            payload,
            new NotificationInAppProjectionCommand(
                "Reembolso registrado",
                "Se registró un reembolso asociado a tu reserva de " + serviceLabel(booking) + ".",
                NotificationSeverity.INFO,
                "PAYMENT",
                actionUrl(booking),
                "Ver reserva"
            ),
            emailProjection(recipient, "client_payment_refunded", "Reembolso registrado", payload)
        );
    }

    private NotificationRecordCommand buildCommand(
        NotificationEventType eventType,
        Booking booking,
        PaymentTransaction transaction,
        ParsedWebhookEvent event,
        ClientNotificationRecipient recipient,
        String sourceAction,
        String dedupeKey,
        Map<String, Object> payload,
        NotificationInAppProjectionCommand inAppProjection,
        NotificationEmailProjectionCommand emailProjection
    ) {
        return new NotificationRecordCommand(
            eventType,
            NotificationAggregateType.PAYMENT,
            resolveAggregateId(booking, transaction),
            "billing",
            sourceAction,
            NotificationRecipientType.CLIENT,
            String.valueOf(recipient.userId()),
            NotificationActorType.SYSTEM,
            null,
            resolveBookingReferenceId(booking, event),
            payload,
            dedupeKey,
            resolveOccurredAt(eventType, transaction, event),
            inAppProjection,
            emailProjection
        );
    }

    private Map<String, Object> basePayload(
        Booking booking,
        PaymentTransaction transaction,
        ParsedWebhookEvent event,
        String sourceAction
    ) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("bookingId", booking == null ? null : booking.getId());
        payload.put("serviceName", booking == null ? null : booking.getServiceNameSnapshot());
        payload.put("startDateTime", booking == null || booking.getStartDateTime() == null ? null : booking.getStartDateTime().toString());
        payload.put("timezone", booking == null ? null : booking.getTimezone());
        payload.put("professionalDisplayName", booking == null ? null : booking.getProfessionalDisplayNameSnapshot());
        payload.put("paymentTransactionId", transaction == null ? null : transaction.getId());
        payload.put("providerPaymentId", transaction == null ? null : transaction.getProviderPaymentId());
        payload.put("provider", transaction == null || transaction.getProvider() == null ? null : transaction.getProvider().name());
        payload.put("providerStatus", transaction == null ? null : transaction.getProviderStatus());
        payload.put("amount", transaction == null ? null : transaction.getAmount());
        payload.put("currency", transaction == null ? null : transaction.getCurrency());
        payload.put("sourceAction", sourceAction);
        payload.put("actionUrl", actionUrl(booking));
        if (event != null && event.eventType() != null) {
            payload.put("providerEventType", event.eventType().name());
        }
        return payload;
    }

    private NotificationEmailProjectionCommand emailProjection(
        ClientNotificationRecipient recipient,
        String templateKey,
        String subject,
        Map<String, Object> payload
    ) {
        if (recipient == null || recipient.email() == null || recipient.email().isBlank()) {
            return null;
        }
        return new NotificationEmailProjectionCommand(recipient.email(), templateKey, subject, payload);
    }

    private String dedupeKey(
        NotificationEventType eventType,
        Booking booking,
        ClientNotificationRecipient recipient,
        PaymentTransaction transaction,
        String extraDimension
    ) {
        StringBuilder dedupeKey = new StringBuilder()
            .append(eventType.name())
            .append(":booking:")
            .append(booking == null || booking.getId() == null ? "unknown" : booking.getId())
            .append(":recipient:")
            .append(recipient.userId())
            .append(":payment:")
            .append(firstNonBlank(
                transaction == null ? null : transaction.getProviderPaymentId(),
                transaction == null ? null : transaction.getId()
            ));
        if (extraDimension != null && !extraDimension.isBlank()) {
            dedupeKey.append(":").append(extraDimension);
        }
        return dedupeKey.toString();
    }

    private String resolveAggregateId(Booking booking, PaymentTransaction transaction) {
        String aggregateId = firstNonBlank(
            transaction == null ? null : transaction.getId(),
            transaction == null ? null : transaction.getProviderPaymentId()
        );
        if (aggregateId != null) {
            return aggregateId;
        }
        return booking == null || booking.getId() == null ? "unknown" : "booking-" + booking.getId();
    }

    private Long resolveBookingReferenceId(Booking booking, ParsedWebhookEvent event) {
        if (booking != null && booking.getId() != null) {
            return booking.getId();
        }
        return event == null ? null : event.bookingId();
    }

    private LocalDateTime resolveOccurredAt(
        NotificationEventType eventType,
        PaymentTransaction transaction,
        ParsedWebhookEvent event
    ) {
        if (eventType == NotificationEventType.PAYMENT_REFUNDED && event != null && event.eventTime() != null) {
            return event.eventTime();
        }
        if (transaction == null) {
            return event == null || event.eventTime() == null ? LocalDateTime.now() : event.eventTime();
        }
        if (eventType == NotificationEventType.PAYMENT_APPROVED && transaction.getApprovedAt() != null) {
            return transaction.getApprovedAt();
        }
        if (eventType == NotificationEventType.PAYMENT_FAILED && transaction.getFailedAt() != null) {
            return transaction.getFailedAt();
        }
        if (event != null && event.eventTime() != null) {
            return event.eventTime();
        }
        return transaction.getUpdatedAt() == null ? transaction.getCreatedAt() : transaction.getUpdatedAt();
    }

    private String actionUrl(Booking booking) {
        return booking == null || booking.getId() == null ? null : "/cliente/reservas?bookingId=" + booking.getId();
    }

    private String serviceLabel(Booking booking) {
        if (booking == null || booking.getServiceNameSnapshot() == null || booking.getServiceNameSnapshot().isBlank()) {
            return "tu reserva";
        }
        return booking.getServiceNameSnapshot().trim();
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return "unknown";
    }
}
