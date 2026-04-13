package com.plura.plurabackend.core.notification.email;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.plura.plurabackend.core.notification.model.EmailDispatch;
import com.plura.plurabackend.core.notification.model.NotificationAggregateType;
import com.plura.plurabackend.core.notification.model.NotificationEvent;
import com.plura.plurabackend.core.notification.model.NotificationEventType;
import com.plura.plurabackend.core.notification.model.NotificationRecipientType;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class NotificationEmailTemplateService {

    private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() {
    };
    private static final Locale SPANISH_LOCALE = Locale.forLanguageTag("es-UY");
    private static final DateTimeFormatter CLIENT_DATE_FORMATTER = DateTimeFormatter.ofPattern(
        "d 'de' MMMM 'de' yyyy",
        SPANISH_LOCALE
    );
    private static final DateTimeFormatter CLIENT_TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm", SPANISH_LOCALE);

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
        String subject = isBlank(dispatch.getSubject())
            ? defaultSubject(event.getEventType(), event.getRecipientType())
            : dispatch.getSubject().trim();
        if (event.getRecipientType() == NotificationRecipientType.CLIENT) {
            return buildClientMessage(dispatch, event, payload, subject);
        }
        return buildProfessionalMessage(dispatch, event, payload, subject);
    }

    private NotificationEmailMessage buildClientMessage(
        EmailDispatch dispatch,
        NotificationEvent event,
        Map<String, Object> payload,
        String subject
    ) {
        String title = clientTitleFor(event.getEventType());
        String lead = clientLeadFor(event.getEventType(), payload);
        String detailsIntro = clientDetailsIntroFor(event.getEventType());
        String details = clientDetailsHtml(event.getEventType(), payload, event);
        String guidanceText = clientGuidanceText(event.getEventType());
        String nextStepText = clientNextStepLine(event.getEventType());
        String actionUrl = actionUrl(payload, event);
        String actionLabel = clientActionLabelFor(event.getEventType());
        String html = wrapHtml(
            title,
            """
            <p style="margin:0 0 14px 0;color:#1f2937;font-size:15px;line-height:1.6;">Hola,</p>
            <p style="margin:0 0 14px 0;color:#475569;font-size:15px;line-height:1.6;">%s</p>
            <p style="margin:0 0 18px 0;color:#475569;font-size:15px;line-height:1.6;">%s</p>
            <div style="margin:0 0 18px 0;padding:18px;border:1px solid #dbe4ee;border-radius:18px;background:#f8fafc;">
              %s
            </div>
            %s
            %s
            %s
            <p style="margin:18px 0 0 0;color:#475569;font-size:15px;line-height:1.6;">Gracias por confiar en %s.</p>
            %s
            <p style="margin:14px 0 0 0;color:#475569;font-size:15px;line-height:1.6;">Si tenés alguna duda, estamos para ayudarte.</p>
            <p style="margin:14px 0 0 0;color:#475569;font-size:15px;line-height:1.6;">Saludos,<br>Equipo %s</p>
            """.formatted(
                escapeHtml(lead),
                escapeHtml(detailsIntro),
                details,
                actionButton(actionUrl, actionLabel),
                optionalParagraph(guidanceText),
                optionalParagraph(nextStepText),
                escapeHtml(brandName.toUpperCase(SPANISH_LOCALE)),
                "",
                escapeHtml(brandName.toUpperCase(SPANISH_LOCALE))
            )
        );
        String text = """
            %s

            Hola,

            %s

            %s

            %s

            %s
            %s

            Gracias por confiar en %s.
            %s
            Si tenés alguna duda, estamos para ayudarte.

            Saludos,
            Equipo %s

            %s
            """.formatted(
            title,
            lead,
            detailsIntro,
            clientPlainTextDetails(event.getEventType(), payload, event),
            firstNonBlank(guidanceText, ""),
            firstNonBlank(actionLabel, "Ver detalle") + ": " + firstNonBlank(actionUrl, normalizeBaseUrl(publicWebUrl)),
            brandName.toUpperCase(SPANISH_LOCALE),
            firstNonBlank(nextStepText, ""),
            brandName.toUpperCase(SPANISH_LOCALE),
            firstNonBlank(actionUrl, normalizeBaseUrl(publicWebUrl))
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

    private NotificationEmailMessage buildProfessionalMessage(
        EmailDispatch dispatch,
        NotificationEvent event,
        Map<String, Object> payload,
        String subject
    ) {
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
                actionButton(actionUrl, "Ver detalle"),
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
            case BOOKING_COMPLETED -> "Reserva completada";
            case BOOKING_NO_SHOW -> "Reserva marcada como no-show";
            case PAYMENT_APPROVED -> "Pago aprobado";
            case PAYMENT_FAILED -> "Pago fallido";
            case PAYMENT_REFUND_PENDING -> "Reembolso en proceso";
            case PAYMENT_REFUNDED -> "Reembolso registrado";
            default -> throw unsupportedTemplate(eventType);
        };
    }

    private String clientTitleFor(NotificationEventType eventType) {
        return switch (eventType) {
            case BOOKING_CREATED -> "Confirmación de reserva";
            case BOOKING_CONFIRMED -> "Reserva confirmada";
            case BOOKING_CANCELLED -> "Cancelación de reserva";
            case BOOKING_RESCHEDULED -> "Reserva reprogramada";
            case BOOKING_COMPLETED -> "Reserva completada";
            case BOOKING_NO_SHOW -> "Actualización de tu reserva";
            case PAYMENT_APPROVED -> "Pago aprobado";
            case PAYMENT_FAILED -> "Pago pendiente";
            case PAYMENT_REFUND_PENDING -> "Devolución en proceso";
            case PAYMENT_REFUNDED -> "Devolución registrada";
            default -> throw unsupportedTemplate(eventType);
        };
    }

    private String clientLeadFor(NotificationEventType eventType, Map<String, Object> payload) {
        String serviceName = safeServiceName(payload);
        return switch (eventType) {
            case BOOKING_CREATED -> "Tu turno fue reservado con éxito.";
            case BOOKING_CONFIRMED -> "Tu reserva para " + serviceName + " quedó confirmada.";
            case BOOKING_CANCELLED -> "Tu reserva para " + serviceName + " fue cancelada.";
            case BOOKING_RESCHEDULED -> "Tu reserva para " + serviceName + " fue reprogramada.";
            case BOOKING_COMPLETED -> "Tu reserva para " + serviceName + " fue completada.";
            case BOOKING_NO_SHOW -> "Tu reserva para " + serviceName + " fue marcada como no show.";
            case PAYMENT_APPROVED -> "Recibimos el pago asociado a tu reserva para " + serviceName + ".";
            case PAYMENT_FAILED -> "No pudimos aprobar el pago asociado a tu reserva para " + serviceName + ".";
            case PAYMENT_REFUND_PENDING -> "Iniciamos la devolución asociada a tu reserva para " + serviceName + ".";
            case PAYMENT_REFUNDED -> "Registramos la devolución asociada a tu reserva para " + serviceName + ".";
            default -> throw unsupportedTemplate(eventType);
        };
    }

    private String clientDetailsIntroFor(NotificationEventType eventType) {
        return switch (eventType) {
            case PAYMENT_APPROVED, PAYMENT_FAILED, PAYMENT_REFUND_PENDING, PAYMENT_REFUNDED ->
                "A continuación, te compartimos los detalles de tu reserva y del movimiento informado:";
            default -> "A continuación, te compartimos los detalles de tu reserva:";
        };
    }

    private String clientGuidanceText(NotificationEventType eventType) {
        return switch (eventType) {
            case BOOKING_CREATED, BOOKING_CONFIRMED ->
                "Si necesitás realizar algún cambio, podés reprogramar o cancelar tu turno directamente desde la plataforma según la política vigente de tu reserva.";
            case BOOKING_RESCHEDULED ->
                "Si necesitás hacer otro cambio, podés gestionarlo directamente desde la plataforma según la política vigente de tu reserva.";
            case BOOKING_CANCELLED ->
                "Si querés volver a reservar, podés hacerlo directamente desde la plataforma cuando quieras.";
            case PAYMENT_APPROVED ->
                "Podés revisar el estado actualizado de tu reserva desde la plataforma cuando lo necesites.";
            case PAYMENT_FAILED ->
                "Te recomendamos revisar el estado de la reserva desde la plataforma para intentar nuevamente si corresponde.";
            case PAYMENT_REFUND_PENDING, PAYMENT_REFUNDED ->
                "No necesitás realizar ninguna gestión adicional desde PLURA mientras el medio de pago procesa la acreditación.";
            case BOOKING_COMPLETED, BOOKING_NO_SHOW -> null;
            default -> throw unsupportedTemplate(eventType);
        };
    }

    private String clientNextStepLine(NotificationEventType eventType) {
        return switch (eventType) {
            case BOOKING_CREATED, BOOKING_CONFIRMED, BOOKING_RESCHEDULED ->
                "Te recomendamos llegar unos minutos antes para disfrutar la experiencia con tranquilidad.";
            default -> null;
        };
    }

    private String clientActionLabelFor(NotificationEventType eventType) {
        return switch (eventType) {
            case PAYMENT_APPROVED, PAYMENT_FAILED, PAYMENT_REFUND_PENDING, PAYMENT_REFUNDED -> "Ver tu reserva";
            default -> "Gestionar tu reserva";
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
            case PAYMENT_REFUND_PENDING -> clientRecipient
                ? "Iniciamos la devolución asociada a tu reserva para " + serviceName + ". La acreditación depende de los tiempos de Mercado Pago y del emisor."
                : "Se inició una devolución asociada a " + serviceName + ". La acreditación depende de los tiempos de Mercado Pago y del emisor.";
            case PAYMENT_REFUNDED -> clientRecipient
                ? "Se registró un reembolso asociado a tu reserva para " + serviceName + ". La acreditación final depende de los tiempos de Mercado Pago y del emisor."
                : "Se registró un reembolso asociado a " + serviceName + ". La acreditación final depende de los tiempos de Mercado Pago y del emisor.";
            default -> throw unsupportedTemplate(eventType);
        };
    }

    private String clientDetailsHtml(
        NotificationEventType eventType,
        Map<String, Object> payload,
        NotificationEvent event
    ) {
        BookingDateTimePresentation bookingDateTime = bookingDateTimePresentation(payload);
        String bookingId = firstNonBlank(
            stringValue(payload.get("bookingId")),
            event.getAggregateType() == NotificationAggregateType.BOOKING ? event.getAggregateId() : null,
            "No disponible"
        );
        String bookingDetails = """
            <p style="margin:0 0 8px 0;"><strong>Reserva:</strong> %s</p>
            <p style="margin:0 0 8px 0;"><strong>Fecha:</strong> %s</p>
            <p style="margin:0 0 8px 0;"><strong>Horario:</strong> %s</p>
            <p style="margin:0 0 8px 0;"><strong>Servicio:</strong> %s</p>
            <p style="margin:0 0 8px 0;"><strong>Lugar:</strong> %s</p>
            <p style="margin:0;"><strong>Dirección:</strong> %s</p>
            """.formatted(
            escapeHtml(bookingId),
            escapeHtml(bookingDateTime.dateLabel()),
            escapeHtml(bookingDateTime.timeLabel()),
            escapeHtml(safeServiceName(payload)),
            escapeHtml(firstNonBlank(stringValue(payload.get("professionalDisplayName")), "No disponible")),
            escapeHtml(firstNonBlank(stringValue(payload.get("professionalLocation")), "No disponible"))
        );
        if (!isPaymentEvent(eventType)) {
            return bookingDetails;
        }
        String paymentDetails = switch (eventType) {
            case PAYMENT_APPROVED, PAYMENT_FAILED -> """
                <div style="margin:14px 0 0 0;padding-top:14px;border-top:1px solid #dbe4ee;">
                  <p style="margin:0 0 8px 0;"><strong>Monto:</strong> %s</p>
                  <p style="margin:0;"><strong>Estado del pago:</strong> %s</p>
                </div>
                """.formatted(
                escapeHtml(amountLabel(payload)),
                escapeHtml(firstNonBlank(stringValue(payload.get("providerStatus")), "No disponible"))
            );
            case PAYMENT_REFUND_PENDING, PAYMENT_REFUNDED -> """
                <div style="margin:14px 0 0 0;padding-top:14px;border-top:1px solid #dbe4ee;">
                  <p style="margin:0 0 8px 0;"><strong>Monto:</strong> %s</p>
                  <p style="margin:0 0 8px 0;"><strong>Medio de pago:</strong> %s</p>
                  <p style="margin:0 0 8px 0;"><strong>Estado:</strong> %s</p>
                  <p style="margin:0;"><strong>Acreditación estimada:</strong> %s</p>
                </div>
                """.formatted(
                escapeHtml(amountLabel(payload)),
                escapeHtml(firstNonBlank(stringValue(payload.get("refundPaymentMethodLabel")), "No disponible")),
                escapeHtml(firstNonBlank(stringValue(payload.get("providerStatus")), "No disponible")),
                escapeHtml(firstNonBlank(stringValue(payload.get("refundTimingHint")), "Según tiempos de Mercado Pago y del emisor."))
            );
            default -> throw unsupportedTemplate(eventType);
        };
        return bookingDetails + paymentDetails;
    }

    private String detailsFor(
        NotificationEventType eventType,
        Map<String, Object> payload,
        NotificationEvent event,
        NotificationRecipientType recipientType
    ) {
        String bookingId = firstNonBlank(
            stringValue(payload.get("bookingId")),
            event.getAggregateType() == NotificationAggregateType.BOOKING ? event.getAggregateId() : null,
            "No disponible"
        );
        String startDateTime = firstNonBlank(stringValue(payload.get("startDateTime")), "No disponible");
        String timezone = firstNonBlank(stringValue(payload.get("timezone")), "No disponible");
        String amount = amountLabel(payload);
        String providerStatus = firstNonBlank(stringValue(payload.get("providerStatus")), "No disponible");
        String professionalDisplayName = firstNonBlank(stringValue(payload.get("professionalDisplayName")), null);
        String refundPaymentMethodLabel = firstNonBlank(stringValue(payload.get("refundPaymentMethodLabel")), null);
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
            case PAYMENT_APPROVED, PAYMENT_FAILED, PAYMENT_REFUND_PENDING, PAYMENT_REFUNDED -> """
                <p style="margin:0 0 8px 0;"><strong>Reserva:</strong> %s</p>
                %s
                <p style="margin:0 0 8px 0;"><strong>Monto:</strong> %s</p>
                <p style="margin:0 0 8px 0;"><strong>Estado proveedor:</strong> %s</p>
                %s
                %s
                <p style="margin:0;"><strong>Servicio:</strong> %s</p>
                """.formatted(
                escapeHtml(bookingId),
                clientRecipient && professionalDisplayName != null
                    ? "<p style=\"margin:0 0 8px 0;\"><strong>Profesional:</strong> " + escapeHtml(professionalDisplayName) + "</p>"
                    : "",
                escapeHtml(amount),
                escapeHtml(providerStatus),
                (eventType == NotificationEventType.PAYMENT_REFUND_PENDING || eventType == NotificationEventType.PAYMENT_REFUNDED)
                    && refundPaymentMethodLabel != null
                    ? "<p style=\"margin:0 0 8px 0;\"><strong>Medio de pago:</strong> " + escapeHtml(refundPaymentMethodLabel) + "</p>"
                    : "",
                (eventType == NotificationEventType.PAYMENT_REFUND_PENDING || eventType == NotificationEventType.PAYMENT_REFUNDED)
                    ? "<p style=\"margin:0 0 8px 0;\"><strong>Acreditación:</strong> "
                        + escapeHtml(firstNonBlank(stringValue(payload.get("refundTimingHint")), "Según tiempos de Mercado Pago y del emisor."))
                        + "</p>"
                    : "",
                escapeHtml(safeServiceName(payload))
            );
            default -> throw unsupportedTemplate(eventType);
        };
    }

    private String clientPlainTextDetails(
        NotificationEventType eventType,
        Map<String, Object> payload,
        NotificationEvent event
    ) {
        BookingDateTimePresentation bookingDateTime = bookingDateTimePresentation(payload);
        String bookingId = firstNonBlank(stringValue(payload.get("bookingId")), event.getAggregateId(), "No disponible");
        String bookingDetails = "Reserva: "
            + bookingId
            + "\nFecha: "
            + bookingDateTime.dateLabel()
            + "\nHorario: "
            + bookingDateTime.timeLabel()
            + "\nServicio: "
            + safeServiceName(payload)
            + "\nLugar: "
            + firstNonBlank(stringValue(payload.get("professionalDisplayName")), "No disponible")
            + "\nDirección: "
            + firstNonBlank(stringValue(payload.get("professionalLocation")), "No disponible");
        if (!isPaymentEvent(eventType)) {
            return bookingDetails;
        }
        return switch (eventType) {
            case PAYMENT_APPROVED, PAYMENT_FAILED -> bookingDetails
                + "\nMonto: "
                + amountLabel(payload)
                + "\nEstado del pago: "
                + firstNonBlank(stringValue(payload.get("providerStatus")), "No disponible");
            case PAYMENT_REFUND_PENDING, PAYMENT_REFUNDED -> bookingDetails
                + "\nMonto: "
                + amountLabel(payload)
                + "\nMedio de pago: "
                + firstNonBlank(stringValue(payload.get("refundPaymentMethodLabel")), "No disponible")
                + "\nEstado: "
                + firstNonBlank(stringValue(payload.get("providerStatus")), "No disponible")
                + "\nAcreditación estimada: "
                + firstNonBlank(stringValue(payload.get("refundTimingHint")), "Según tiempos de Mercado Pago y del emisor.");
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
        String refundPaymentMethodLabel = stringValue(payload.get("refundPaymentMethodLabel"));
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
            case PAYMENT_APPROVED, PAYMENT_FAILED, PAYMENT_REFUND_PENDING, PAYMENT_REFUNDED ->
                "Reserva: " + bookingId
                    + professionalLine
                    + "\nMonto: " + amount
                    + "\nEstado proveedor: " + firstNonBlank(providerStatus, "No disponible")
                    + ((event.getEventType() == NotificationEventType.PAYMENT_REFUND_PENDING
                        || event.getEventType() == NotificationEventType.PAYMENT_REFUNDED)
                        && !isBlank(refundPaymentMethodLabel)
                        ? "\nMedio de pago: " + refundPaymentMethodLabel
                        : "")
                    + ((event.getEventType() == NotificationEventType.PAYMENT_REFUND_PENDING
                        || event.getEventType() == NotificationEventType.PAYMENT_REFUNDED)
                        ? "\nAcreditación: " + firstNonBlank(stringValue(payload.get("refundTimingHint")), "Según tiempos de Mercado Pago y del emisor.")
                        : "")
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
        if (event.getAggregateType() == NotificationAggregateType.BOOKING) {
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

    private String defaultSubject(NotificationEventType eventType, NotificationRecipientType recipientType) {
        if (recipientType == NotificationRecipientType.CLIENT) {
            return switch (eventType) {
                case BOOKING_CREATED -> "Confirmación de reserva";
                case BOOKING_CONFIRMED -> "Reserva confirmada";
                case BOOKING_CANCELLED -> "Cancelación de reserva";
                case BOOKING_RESCHEDULED -> "Reserva reprogramada";
                case BOOKING_COMPLETED -> "Reserva completada";
                case BOOKING_NO_SHOW -> "Actualización de tu reserva";
                case PAYMENT_APPROVED -> "Pago aprobado";
                case PAYMENT_FAILED -> "Pago pendiente";
                case PAYMENT_REFUND_PENDING -> "Devolución en proceso";
                case PAYMENT_REFUNDED -> "Devolución registrada";
                default -> throw unsupportedTemplate(eventType);
            };
        }
        return switch (eventType) {
            case BOOKING_CREATED -> "Nueva reserva en " + brandName;
            case BOOKING_CONFIRMED -> "Reserva confirmada";
            case BOOKING_CANCELLED -> "Reserva cancelada";
            case BOOKING_RESCHEDULED -> "Reserva reagendada";
            case BOOKING_COMPLETED -> "Reserva completada";
            case BOOKING_NO_SHOW -> "Reserva marcada como no-show";
            case PAYMENT_APPROVED -> "Pago aprobado";
            case PAYMENT_FAILED -> "Pago fallido";
            case PAYMENT_REFUND_PENDING -> "Reembolso en proceso";
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
                PAYMENT_REFUND_PENDING,
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

    private String actionButton(String actionUrl, String label) {
        if (isBlank(actionUrl)) {
            return "";
        }
        return """
            <div style="margin:0 0 8px 0;">
              <a href="%s" style="display:inline-block;background:#0f766e;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:999px;font-size:14px;font-weight:700;">%s</a>
            </div>
            """.formatted(escapeHtml(actionUrl), escapeHtml(firstNonBlank(label, "Ver detalle")));
    }

    private String optionalParagraph(String value) {
        if (isBlank(value)) {
            return "";
        }
        return "<p style=\"margin:14px 0 0 0;color:#475569;font-size:15px;line-height:1.6;\">"
            + escapeHtml(value)
            + "</p>";
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

    private BookingDateTimePresentation bookingDateTimePresentation(Map<String, Object> payload) {
        String startDateTime = stringValue(payload.get("startDateTime"));
        if (isBlank(startDateTime)) {
            return new BookingDateTimePresentation("No disponible", "No disponible");
        }
        try {
            LocalDateTime parsed = LocalDateTime.parse(startDateTime.trim());
            return new BookingDateTimePresentation(
                parsed.format(CLIENT_DATE_FORMATTER),
                parsed.format(CLIENT_TIME_FORMATTER) + " hs"
            );
        } catch (Exception ignored) {
            return new BookingDateTimePresentation("No disponible", startDateTime.trim());
        }
    }

    private boolean isPaymentEvent(NotificationEventType eventType) {
        return switch (eventType) {
            case PAYMENT_APPROVED, PAYMENT_FAILED, PAYMENT_REFUND_PENDING, PAYMENT_REFUNDED -> true;
            default -> false;
        };
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

    private record BookingDateTimePresentation(String dateLabel, String timeLabel) {
    }
}
