package com.plura.plurabackend.core.notification.email;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.plura.plurabackend.core.notification.model.EmailDispatch;
import com.plura.plurabackend.core.notification.model.NotificationEvent;
import com.plura.plurabackend.core.notification.model.NotificationEventType;
import com.plura.plurabackend.core.notification.model.NotificationRecipientType;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class NotificationEmailTemplateService {

    private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() {
    };

    private final ObjectMapper objectMapper;
    private final String brandName;
    private final String publicWebUrl;

    public NotificationEmailTemplateService(
        ObjectMapper objectMapper,
        @Value("${app.email.brand-name:Plura}") String brandName,
        @Value("${app.email.public-web-url:http://localhost:3002}") String publicWebUrl
    ) {
        this.objectMapper = objectMapper;
        this.brandName = isBlank(brandName) ? "Plura" : brandName.trim();
        this.publicWebUrl = isBlank(publicWebUrl) ? "http://localhost:3002" : publicWebUrl.trim();
    }

    public NotificationEmailMessage buildMessage(EmailDispatch dispatch) {
        if (dispatch == null || dispatch.getNotificationEvent() == null) {
            throw new NotificationEmailTemplateException("Email dispatch sin notification_event");
        }
        NotificationEvent event = dispatch.getNotificationEvent();
        ensureSupportedEventType(event.getEventType());
        Map<String, Object> payload = readPayload(dispatch.getPayloadJson());
        String subject = isBlank(dispatch.getSubject()) ? defaultSubject(event.getEventType()) : dispatch.getSubject().trim();
        NotificationRecipientType recipientType = event.getRecipientType();
        String title = titleFor(event.getEventType(), recipientType);
        String intro = introFor(event.getEventType(), payload, recipientType);
        String details = detailsFor(event.getEventType(), payload, event, recipientType);
        String actionUrl = actionUrl(payload, event);
        String html = wrapHtml(
            title,
            """
            <p style="margin:0 0 14px 0;color:#1f2937;font-size:15px;line-height:1.6;">Hola,</p>
            <p style="margin:0 0 14px 0;color:#475569;font-size:15px;line-height:1.6;">%s</p>
            <div style="margin:0 0 18px 0;padding:16px 18px;border:1px solid #dbe4ee;border-radius:16px;background:#f8fafc;">
              %s
            </div>
            %s
            <p style="margin:18px 0 0 0;color:#64748b;font-size:13px;line-height:1.6;">Notificación transaccional enviada por %s.</p>
            """.formatted(
                escapeHtml(intro),
                details,
                actionButton(actionUrl),
                escapeHtml(brandName)
            )
        );
        String text = """
            %s

            %s

            %s

            %s
            """.formatted(
            title,
            intro,
            plainTextDetails(payload, event, recipientType),
            actionUrl == null ? publicWebUrl : actionUrl
        ).trim();
        return new NotificationEmailMessage(
            dispatch.getTemplateKey(),
            dispatch.getRecipientEmail(),
            null,
            subject,
            html,
            text
        );
    }

    private Map<String, Object> readPayload(String payloadJson) {
        if (isBlank(payloadJson)) {
            return Map.of();
        }
        try {
            return objectMapper.readValue(payloadJson, MAP_TYPE);
        } catch (Exception exception) {
            throw new NotificationEmailTemplateException("No se pudo leer payload de email_dispatch", exception);
        }
    }

    private String titleFor(NotificationEventType eventType, NotificationRecipientType recipientType) {
        return switch (eventType) {
            case BOOKING_CREATED -> recipientType == NotificationRecipientType.CLIENT ? "Reserva creada" : "Nueva reserva";
            case BOOKING_CONFIRMED -> "Reserva confirmada";
            case BOOKING_CANCELLED -> "Reserva cancelada";
            case BOOKING_RESCHEDULED -> recipientType == NotificationRecipientType.CLIENT ? "Reserva reprogramada" : "Reserva reagendada";
            case BOOKING_COMPLETED -> recipientType == NotificationRecipientType.CLIENT ? "Reserva completada" : "Reserva completada";
            case BOOKING_NO_SHOW -> "Reserva marcada como no-show";
            case PAYMENT_APPROVED -> "Pago aprobado";
            case PAYMENT_FAILED -> "Pago fallido";
            case PAYMENT_REFUNDED -> "Reembolso registrado";
            default -> throw unsupportedTemplate(eventType);
        };
    }

    private String introFor(
        NotificationEventType eventType,
        Map<String, Object> payload,
        NotificationRecipientType recipientType
    ) {
        String serviceName = safeServiceName(payload);
        boolean clientRecipient = recipientType == NotificationRecipientType.CLIENT;
        return switch (eventType) {
            case BOOKING_CREATED -> clientRecipient
                ? "Tu reserva para " + serviceName + " fue creada correctamente."
                : "Se creó una nueva reserva para " + serviceName + ".";
            case BOOKING_CONFIRMED -> clientRecipient
                ? "Tu reserva para " + serviceName + " quedó confirmada."
                : "La reserva para " + serviceName + " quedó confirmada.";
            case BOOKING_CANCELLED -> clientRecipient
                ? "Tu reserva para " + serviceName + " fue cancelada."
                : "La reserva para " + serviceName + " fue cancelada.";
            case BOOKING_RESCHEDULED -> clientRecipient
                ? "Tu reserva para " + serviceName + " cambió de fecha u horario."
                : "La reserva para " + serviceName + " cambió de horario.";
            case BOOKING_COMPLETED -> clientRecipient
                ? "Tu reserva para " + serviceName + " fue completada."
                : "La reserva para " + serviceName + " fue completada.";
            case BOOKING_NO_SHOW -> "La reserva para " + serviceName + " fue marcada como no-show.";
            case PAYMENT_APPROVED -> clientRecipient
                ? "Se aprobó el pago asociado a tu reserva para " + serviceName + "."
                : "Se aprobó un pago asociado a " + serviceName + ".";
            case PAYMENT_FAILED -> clientRecipient
                ? "No pudimos aprobar el pago asociado a tu reserva para " + serviceName + "."
                : "Falló un pago asociado a " + serviceName + ".";
            case PAYMENT_REFUNDED -> clientRecipient
                ? "Se registró un reembolso asociado a tu reserva para " + serviceName + "."
                : "Se registró un reembolso asociado a " + serviceName + ".";
            default -> throw unsupportedTemplate(eventType);
        };
    }

    private String detailsFor(
        NotificationEventType eventType,
        Map<String, Object> payload,
        NotificationEvent event,
        NotificationRecipientType recipientType
    ) {
        String bookingId = firstNonBlank(stringValue(payload.get("bookingId")), event.getAggregateType() == com.plura.plurabackend.core.notification.model.NotificationAggregateType.BOOKING ? event.getAggregateId() : null, "No disponible");
        String startDateTime = firstNonBlank(stringValue(payload.get("startDateTime")), "No disponible");
        String timezone = firstNonBlank(stringValue(payload.get("timezone")), "No disponible");
        String amount = amountLabel(payload);
        String providerStatus = firstNonBlank(stringValue(payload.get("providerStatus")), "No disponible");
        String professionalDisplayName = firstNonBlank(stringValue(payload.get("professionalDisplayName")), null);
        boolean clientRecipient = recipientType == NotificationRecipientType.CLIENT;
        return switch (eventType) {
            case BOOKING_CREATED, BOOKING_CONFIRMED, BOOKING_CANCELLED, BOOKING_RESCHEDULED, BOOKING_COMPLETED, BOOKING_NO_SHOW -> """
                <p style="margin:0 0 8px 0;"><strong>Reserva:</strong> %s</p>
                <p style="margin:0 0 8px 0;"><strong>Servicio:</strong> %s</p>
                %s
                <p style="margin:0 0 8px 0;"><strong>Inicio:</strong> %s</p>
                <p style="margin:0;"><strong>Zona horaria:</strong> %s</p>
                """.formatted(
                escapeHtml(bookingId),
                escapeHtml(safeServiceName(payload)),
                clientRecipient && professionalDisplayName != null
                    ? "<p style=\"margin:0 0 8px 0;\"><strong>Profesional:</strong> " + escapeHtml(professionalDisplayName) + "</p>"
                    : "",
                escapeHtml(startDateTime),
                escapeHtml(timezone)
            );
            case PAYMENT_APPROVED, PAYMENT_FAILED, PAYMENT_REFUNDED -> """
                <p style="margin:0 0 8px 0;"><strong>Reserva:</strong> %s</p>
                %s
                <p style="margin:0 0 8px 0;"><strong>Monto:</strong> %s</p>
                <p style="margin:0 0 8px 0;"><strong>Estado proveedor:</strong> %s</p>
                <p style="margin:0;"><strong>Servicio:</strong> %s</p>
                """.formatted(
                escapeHtml(bookingId),
                clientRecipient && professionalDisplayName != null
                    ? "<p style=\"margin:0 0 8px 0;\"><strong>Profesional:</strong> " + escapeHtml(professionalDisplayName) + "</p>"
                    : "",
                escapeHtml(amount),
                escapeHtml(providerStatus),
                escapeHtml(safeServiceName(payload))
            );
            default -> throw unsupportedTemplate(eventType);
        };
    }

    private String plainTextDetails(
        Map<String, Object> payload,
        NotificationEvent event,
        NotificationRecipientType recipientType
    ) {
        String bookingId = firstNonBlank(stringValue(payload.get("bookingId")), event.getAggregateId(), "No disponible");
        String serviceName = safeServiceName(payload);
        String startDateTime = stringValue(payload.get("startDateTime"));
        String timezone = stringValue(payload.get("timezone"));
        String amount = amountLabel(payload);
        String providerStatus = stringValue(payload.get("providerStatus"));
        String professionalDisplayName = stringValue(payload.get("professionalDisplayName"));
        String professionalLine = recipientType == NotificationRecipientType.CLIENT && !isBlank(professionalDisplayName)
            ? "\nProfesional: " + professionalDisplayName
            : "";
        return switch (event.getEventType()) {
            case BOOKING_CREATED, BOOKING_CONFIRMED, BOOKING_CANCELLED, BOOKING_RESCHEDULED, BOOKING_COMPLETED, BOOKING_NO_SHOW ->
                "Reserva: " + bookingId
                    + "\nServicio: " + serviceName
                    + professionalLine
                    + "\nInicio: " + firstNonBlank(startDateTime, "No disponible")
                    + "\nZona horaria: " + firstNonBlank(timezone, "No disponible");
            case PAYMENT_APPROVED, PAYMENT_FAILED, PAYMENT_REFUNDED ->
                "Reserva: " + bookingId
                    + professionalLine
                    + "\nMonto: " + amount
                    + "\nEstado proveedor: " + firstNonBlank(providerStatus, "No disponible")
                    + "\nServicio: " + serviceName;
            default -> throw unsupportedTemplate(event.getEventType());
        };
    }

    private String actionUrl(Map<String, Object> payload, NotificationEvent event) {
        String actionUrl = stringValue(payload.get("actionUrl"));
        if (!isBlank(actionUrl)) {
            return actionUrl;
        }
        String bookingId = stringValue(payload.get("bookingId"));
        if (!isBlank(bookingId)) {
            return bookingActionUrlForRecipient(event.getRecipientType(), bookingId);
        }
        if (event.getAggregateType() == com.plura.plurabackend.core.notification.model.NotificationAggregateType.BOOKING) {
            return bookingActionUrlForRecipient(event.getRecipientType(), event.getAggregateId());
        }
        return normalizeBaseUrl(publicWebUrl);
    }

    private String bookingActionUrlForRecipient(NotificationRecipientType recipientType, String bookingId) {
        String normalizedBaseUrl = normalizeBaseUrl(publicWebUrl);
        if (recipientType == NotificationRecipientType.CLIENT) {
            return normalizedBaseUrl + "/cliente/reservas?bookingId=" + bookingId;
        }
        return normalizedBaseUrl + "/profesional/dashboard/reservas?bookingId=" + bookingId;
    }

    private String defaultSubject(NotificationEventType eventType) {
        return switch (eventType) {
            case BOOKING_CREATED -> "Nueva reserva en " + brandName;
            case BOOKING_CONFIRMED -> "Reserva confirmada";
            case BOOKING_CANCELLED -> "Reserva cancelada";
            case BOOKING_RESCHEDULED -> "Reserva reagendada";
            case BOOKING_COMPLETED -> "Reserva completada";
            case BOOKING_NO_SHOW -> "Reserva marcada como no-show";
            case PAYMENT_APPROVED -> "Pago aprobado";
            case PAYMENT_FAILED -> "Pago fallido";
            case PAYMENT_REFUNDED -> "Reembolso registrado";
            default -> throw unsupportedTemplate(eventType);
        };
    }

    private void ensureSupportedEventType(NotificationEventType eventType) {
        if (eventType == null) {
            throw new NotificationEmailTemplateException("Notification event sin tipo");
        }
        switch (eventType) {
            case BOOKING_CREATED,
                BOOKING_CONFIRMED,
                BOOKING_CANCELLED,
                BOOKING_RESCHEDULED,
                BOOKING_COMPLETED,
                BOOKING_NO_SHOW,
                PAYMENT_APPROVED,
                PAYMENT_FAILED,
                PAYMENT_REFUNDED -> {
                return;
            }
            default -> throw unsupportedTemplate(eventType);
        }
    }

    private NotificationEmailTemplateException unsupportedTemplate(NotificationEventType eventType) {
        return new NotificationEmailTemplateException(
            "No hay plantilla de notification email para eventType=%s".formatted(eventType == null ? "null" : eventType.name())
        );
    }

    private String actionButton(String actionUrl) {
        if (isBlank(actionUrl)) {
            return "";
        }
        return """
            <div style="margin:0 0 8px 0;">
              <a href="%s" style="display:inline-block;background:#0f766e;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:999px;font-size:14px;font-weight:700;">Ver detalle</a>
            </div>
            """.formatted(escapeHtml(actionUrl));
    }

    private String wrapHtml(String title, String bodyHtml) {
        return """
            <!doctype html>
            <html lang="es">
              <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>%s</title>
              </head>
              <body style="margin:0;padding:24px;background:#f4f7fb;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
                <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
                  <tr>
                    <td align="center">
                      <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" style="max-width:640px;border-collapse:collapse;">
                        <tr>
                          <td style="padding:0 0 18px 0;text-align:center;">
                            <div style="display:inline-block;font-size:22px;font-weight:700;letter-spacing:0.04em;color:#0f172a;">%s</div>
                          </td>
                        </tr>
                        <tr>
                          <td style="background:#ffffff;border:1px solid #e2e8f0;border-radius:20px;padding:36px 32px;box-shadow:0 12px 30px rgba(15,23,42,0.06);">
                            <h1 style="margin:0 0 18px 0;font-size:28px;line-height:1.15;color:#0f172a;">%s</h1>
                            %s
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:18px 12px 0 12px;text-align:center;color:#64748b;font-size:12px;line-height:1.6;">
                            <p style="margin:0 0 8px 0;">Mensaje transaccional de operación enviado por %s.</p>
                            <p style="margin:0;">%s</p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </body>
            </html>
            """.formatted(
            escapeHtml(title),
            escapeHtml(brandName),
            escapeHtml(title),
            bodyHtml,
            escapeHtml(brandName),
            escapeHtml(normalizeBaseUrl(publicWebUrl))
        );
    }

    private String safeServiceName(Map<String, Object> payload) {
        return firstNonBlank(stringValue(payload.get("serviceName")), "el servicio");
    }

    private String amountLabel(Map<String, Object> payload) {
        Object rawAmount = payload.get("amount");
        String currency = firstNonBlank(stringValue(payload.get("currency")), "UYU");
        if (rawAmount instanceof BigDecimal amount) {
            return amount.stripTrailingZeros().toPlainString() + " " + currency;
        }
        if (rawAmount instanceof Number number) {
            return BigDecimal.valueOf(number.doubleValue()).stripTrailingZeros().toPlainString() + " " + currency;
        }
        if (rawAmount != null) {
            return rawAmount.toString() + " " + currency;
        }
        return "No disponible";
    }

    private String stringValue(Object value) {
        return value == null ? null : value.toString();
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (!isBlank(value)) {
                return value.trim();
            }
        }
        return null;
    }

    private String normalizeBaseUrl(String value) {
        if (isBlank(value)) {
            return "http://localhost:3002";
        }
        return value.trim().endsWith("/") ? value.trim().substring(0, value.trim().length() - 1) : value.trim();
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isBlank();
    }

    private String escapeHtml(String value) {
        if (value == null) {
            return "";
        }
        return value
            .replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace("\"", "&quot;")
            .replace("'", "&#39;");
    }
}
