package com.plura.plurabackend.core.notification.integration.billing;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
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
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class ClientBillingNotificationCommandFactory {

    private static final Locale SPANISH_LOCALE = Locale.forLanguageTag("es-UY");

    private final ObjectMapper objectMapper;
    private final ZoneId appZoneId;
    private final DateTimeFormatter refundDateFormatter;

    public ClientBillingNotificationCommandFactory(
        ObjectMapper objectMapper,
        @Value("${app.timezone:America/Montevideo}") String appTimezone
    ) {
        this.objectMapper = objectMapper;
        this.appZoneId = ZoneId.of(appTimezone);
        this.refundDateFormatter = DateTimeFormatter.ofPattern("d 'de' MMMM", SPANISH_LOCALE);
    }

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
            emailProjection(recipient, "client_payment_failed", "Pago pendiente", payload)
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
        enrichRefundTimingPayload(payload, transaction, event);
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
            emailProjection(recipient, "client_payment_refunded", "Devolución registrada", payload)
        );
    }

    public NotificationRecordCommand buildPaymentRefundPending(
        Booking booking,
        PaymentTransaction transaction,
        ParsedWebhookEvent event,
        ClientNotificationRecipient recipient,
        String sourceAction
    ) {
        Map<String, Object> payload = basePayload(booking, transaction, event, sourceAction);
        enrichRefundTimingPayload(payload, transaction, event);
        return buildCommand(
            NotificationEventType.PAYMENT_REFUND_PENDING,
            booking,
            transaction,
            event,
            recipient,
            sourceAction,
            dedupeKey(NotificationEventType.PAYMENT_REFUND_PENDING, booking, recipient, transaction, null),
            payload,
            new NotificationInAppProjectionCommand(
                "Reembolso en proceso",
                "Iniciamos la devolución de tu reserva de " + serviceLabel(booking) + ". La acreditación depende de Mercado Pago.",
                NotificationSeverity.INFO,
                "PAYMENT",
                actionUrl(booking),
                "Ver reserva"
            ),
            emailProjection(recipient, "client_payment_refund_pending", "Devolución en proceso", payload)
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
        payload.put("professionalLocation", booking == null ? null : booking.getProfessionalLocationSnapshot());
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

    private void enrichRefundTimingPayload(
        Map<String, Object> payload,
        PaymentTransaction transaction,
        ParsedWebhookEvent event
    ) {
        RefundTimingDetails details = buildRefundTimingDetails(transaction, event);
        payload.put("refundTimingHint", details.timingHint());
        if (details.paymentMethodLabel() != null) {
            payload.put("refundPaymentMethodLabel", details.paymentMethodLabel());
        }
    }

    private RefundTimingDetails buildRefundTimingDetails(PaymentTransaction transaction, ParsedWebhookEvent event) {
        String paymentTypeId = firstPresent(
            extractPayloadValue(transaction == null ? null : transaction.getPayloadJson(), "paymentTypeId", "payment_type_id"),
            extractPayloadValue(event == null ? null : event.payloadJson(), "paymentTypeId", "payment_type_id")
        );
        String paymentMethodId = firstPresent(
            extractPayloadValue(transaction == null ? null : transaction.getPayloadJson(), "paymentMethodId", "payment_method_id"),
            extractPayloadValue(event == null ? null : event.payloadJson(), "paymentMethodId", "payment_method_id")
        );

        String normalizedPaymentType = safeLower(paymentTypeId);
        String methodLabel = paymentMethodLabel(normalizedPaymentType, paymentMethodId);
        LocalDate referenceDate = resolveRefundReferenceDate(transaction, event);

        if ("account_money".equals(normalizedPaymentType)) {
            return new RefundTimingDetails(
                firstPresent(methodLabel, "Dinero en cuenta de Mercado Pago"),
                "Como pagaste con dinero en cuenta de Mercado Pago, la devolución suele impactar en el momento o dentro del mismo día."
            );
        }

        if ("debit_card".equals(normalizedPaymentType)
            || "credit_card".equals(normalizedPaymentType)
            || "prepaid_card".equals(normalizedPaymentType)) {
            LocalDate estimatedFrom = addBusinessDays(referenceDate, 8);
            LocalDate estimatedTo = addBusinessDays(referenceDate, 22);
            return new RefundTimingDetails(
                firstPresent(methodLabel, genericCardLabel(normalizedPaymentType)),
                "Mercado Pago indica entre 7 y 20 días hábiles desde la cancelación. Como estimación conservadora, tomá como referencia entre el "
                    + formatRefundDate(estimatedFrom)
                    + " y el "
                    + formatRefundDate(estimatedTo)
                    + "."
            );
        }

        return new RefundTimingDetails(
            methodLabel,
            "La acreditación depende de Mercado Pago y del emisor. Si pagaste con tarjeta, la referencia conservadora es entre 7 y 20 días hábiles, y puede extenderse un poco más según el banco."
        );
    }

    private LocalDate resolveRefundReferenceDate(PaymentTransaction transaction, ParsedWebhookEvent event) {
        LocalDateTime reference = event == null ? null : event.eventTime();
        if (reference == null && transaction != null) {
            reference = firstNonNull(
                transaction.getApprovedAt(),
                transaction.getUpdatedAt(),
                transaction.getCreatedAt()
            );
        }
        if (reference == null) {
            reference = LocalDateTime.now(appZoneId);
        }
        return reference.toLocalDate();
    }

    private LocalDate addBusinessDays(LocalDate baseDate, int businessDays) {
        LocalDate current = baseDate;
        int remaining = Math.max(0, businessDays);
        while (remaining > 0) {
            current = current.plusDays(1);
            DayOfWeek dayOfWeek = current.getDayOfWeek();
            if (dayOfWeek != DayOfWeek.SATURDAY && dayOfWeek != DayOfWeek.SUNDAY) {
                remaining--;
            }
        }
        return current;
    }

    private String formatRefundDate(LocalDate date) {
        return date.format(refundDateFormatter);
    }

    private String paymentMethodLabel(String paymentTypeId, String paymentMethodId) {
        String brandLabel = cardBrandLabel(paymentMethodId);
        return switch (safeLower(paymentTypeId)) {
            case "account_money" -> "Dinero en cuenta de Mercado Pago";
            case "debit_card" -> brandLabel == null ? "Tarjeta de débito" : brandLabel + " Débito";
            case "credit_card" -> brandLabel == null ? "Tarjeta de crédito" : brandLabel + " Crédito";
            case "prepaid_card" -> brandLabel == null ? "Tarjeta prepaga" : brandLabel + " Prepaga";
            default -> brandLabel == null ? null : "Tarjeta " + brandLabel;
        };
    }

    private String genericCardLabel(String paymentTypeId) {
        return switch (safeLower(paymentTypeId)) {
            case "debit_card" -> "Tarjeta de débito";
            case "credit_card" -> "Tarjeta de crédito";
            case "prepaid_card" -> "Tarjeta prepaga";
            default -> "Tarjeta";
        };
    }

    private String cardBrandLabel(String paymentMethodId) {
        if (paymentMethodId == null || paymentMethodId.isBlank()) {
            return null;
        }
        return switch (paymentMethodId.trim().toLowerCase(Locale.ROOT)) {
            case "visa" -> "Visa";
            case "master", "mastercard" -> "Mastercard";
            case "amex", "american_express" -> "American Express";
            case "maestro" -> "Maestro";
            case "oca" -> "OCA";
            case "lider" -> "Lider";
            case "prex" -> "Prex";
            case "mi_dinero", "midinero" -> "Mi Dinero";
            default -> titleCase(paymentMethodId);
        };
    }

    private String extractPayloadValue(String payloadJson, String... fieldNames) {
        if (payloadJson == null || payloadJson.isBlank() || fieldNames == null) {
            return null;
        }
        try {
            JsonNode node = objectMapper.readTree(payloadJson);
            for (String fieldName : fieldNames) {
                if (fieldName == null || fieldName.isBlank()) {
                    continue;
                }
                JsonNode value = node.get(fieldName);
                if (value != null && !value.isNull()) {
                    String text = value.asText(null);
                    if (text != null && !text.isBlank()) {
                        return text.trim();
                    }
                }
            }
        } catch (Exception ignored) {
            return null;
        }
        return null;
    }

    private String firstPresent(String... values) {
        if (values == null) {
            return null;
        }
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return null;
    }

    private LocalDateTime firstNonNull(LocalDateTime... values) {
        if (values == null) {
            return null;
        }
        for (LocalDateTime value : values) {
            if (value != null) {
                return value;
            }
        }
        return null;
    }

    private String titleCase(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String normalized = value.trim().replace('_', ' ').replace('-', ' ');
        StringBuilder builder = new StringBuilder(normalized.length());
        for (String word : normalized.split("\\s+")) {
            if (word.isBlank()) {
                continue;
            }
            if (!builder.isEmpty()) {
                builder.append(' ');
            }
            builder.append(Character.toUpperCase(word.charAt(0)));
            if (word.length() > 1) {
                builder.append(word.substring(1).toLowerCase(Locale.ROOT));
            }
        }
        return builder.toString();
    }

    private String safeLower(String value) {
        return value == null ? null : value.toLowerCase(Locale.ROOT);
    }

    private record RefundTimingDetails(String paymentMethodLabel, String timingHint) {
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
        if ((eventType == NotificationEventType.PAYMENT_REFUNDED || eventType == NotificationEventType.PAYMENT_REFUND_PENDING)
            && event != null && event.eventTime() != null) {
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
