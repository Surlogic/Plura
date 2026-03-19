package com.plura.plurabackend.core.notification.integration.booking;

import com.plura.plurabackend.core.booking.event.model.BookingActorType;
import com.plura.plurabackend.core.booking.model.Booking;
import com.plura.plurabackend.core.notification.application.NotificationEmailProjectionCommand;
import com.plura.plurabackend.core.notification.application.NotificationInAppProjectionCommand;
import com.plura.plurabackend.core.notification.application.NotificationRecordCommand;
import com.plura.plurabackend.core.notification.model.NotificationActorType;
import com.plura.plurabackend.core.notification.model.NotificationAggregateType;
import com.plura.plurabackend.core.notification.model.NotificationEventType;
import com.plura.plurabackend.core.notification.model.NotificationRecipientType;
import com.plura.plurabackend.core.notification.model.NotificationSeverity;
import com.plura.plurabackend.core.professional.ProfessionalNotificationRecipient;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.stereotype.Component;

/**
 * Booking created and booking confirmed remain distinct canonical notification events.
 * The current professional v1 policy is to persist and expose both; any future visual collapsing
 * belongs in query/frontend policy, not in domain emission.
 */
@Component
public class BookingNotificationCommandFactory {

    public NotificationRecordCommand buildBookingCreated(
        Booking booking,
        ProfessionalNotificationRecipient recipient,
        BookingActorType actorType,
        Long actorUserId,
        String sourceAction
    ) {
        Map<String, Object> payload = basePayload(booking, sourceAction);
        return buildCommand(
            NotificationEventType.BOOKING_CREATED,
            booking,
            recipient,
            actorType,
            actorUserId,
            sourceAction,
            bookingDedupeKey(NotificationEventType.BOOKING_CREATED, booking, recipient, null),
            payload,
            new NotificationInAppProjectionCommand(
                "Nueva reserva",
                "Se creó una nueva reserva de " + serviceLabel(booking) + " para " + startLabel(booking) + ".",
                NotificationSeverity.INFO,
                "BOOKING",
                actionUrl(booking),
                "Ver reserva"
            ),
            emailProjection(recipient, "professional_booking_created", "Nueva reserva en Plura", payload)
        );
    }

    public NotificationRecordCommand buildBookingConfirmed(
        Booking booking,
        ProfessionalNotificationRecipient recipient,
        BookingActorType actorType,
        Long actorUserId,
        String sourceAction
    ) {
        Map<String, Object> payload = basePayload(booking, sourceAction);
        return buildCommand(
            NotificationEventType.BOOKING_CONFIRMED,
            booking,
            recipient,
            actorType,
            actorUserId,
            sourceAction,
            bookingDedupeKey(NotificationEventType.BOOKING_CONFIRMED, booking, recipient, null),
            payload,
            new NotificationInAppProjectionCommand(
                "Reserva confirmada",
                "La reserva de " + serviceLabel(booking) + " quedó confirmada.",
                NotificationSeverity.SUCCESS,
                "BOOKING",
                actionUrl(booking),
                "Ver reserva"
            ),
            emailProjection(recipient, "professional_booking_confirmed", "Reserva confirmada", payload)
        );
    }

    public NotificationRecordCommand buildBookingCancelled(
        Booking booking,
        ProfessionalNotificationRecipient recipient,
        BookingActorType actorType,
        Long actorUserId,
        String sourceAction
    ) {
        Map<String, Object> payload = basePayload(booking, sourceAction);
        return buildCommand(
            NotificationEventType.BOOKING_CANCELLED,
            booking,
            recipient,
            actorType,
            actorUserId,
            sourceAction,
            bookingDedupeKey(NotificationEventType.BOOKING_CANCELLED, booking, recipient, null),
            payload,
            new NotificationInAppProjectionCommand(
                "Reserva cancelada",
                "La reserva de " + serviceLabel(booking) + " fue cancelada.",
                NotificationSeverity.WARNING,
                "BOOKING",
                actionUrl(booking),
                "Ver reserva"
            ),
            emailProjection(recipient, "professional_booking_cancelled", "Reserva cancelada", payload)
        );
    }

    public NotificationRecordCommand buildBookingRescheduled(
        Booking booking,
        ProfessionalNotificationRecipient recipient,
        BookingActorType actorType,
        Long actorUserId,
        String sourceAction
    ) {
        Map<String, Object> payload = basePayload(booking, sourceAction);
        payload.put("rescheduleCount", safeRescheduleCount(booking));
        return buildCommand(
            NotificationEventType.BOOKING_RESCHEDULED,
            booking,
            recipient,
            actorType,
            actorUserId,
            sourceAction,
            bookingDedupeKey(
                NotificationEventType.BOOKING_RESCHEDULED,
                booking,
                recipient,
                String.valueOf(safeRescheduleCount(booking))
            ),
            payload,
            new NotificationInAppProjectionCommand(
                "Reserva reagendada",
                "La reserva de " + serviceLabel(booking) + " cambió de horario.",
                NotificationSeverity.INFO,
                "BOOKING",
                actionUrl(booking),
                "Ver reserva"
            ),
            emailProjection(recipient, "professional_booking_rescheduled", "Reserva reagendada", payload)
        );
    }

    public NotificationRecordCommand buildBookingCompleted(
        Booking booking,
        ProfessionalNotificationRecipient recipient,
        BookingActorType actorType,
        Long actorUserId,
        String sourceAction
    ) {
        Map<String, Object> payload = basePayload(booking, sourceAction);
        return buildCommand(
            NotificationEventType.BOOKING_COMPLETED,
            booking,
            recipient,
            actorType,
            actorUserId,
            sourceAction,
            bookingDedupeKey(NotificationEventType.BOOKING_COMPLETED, booking, recipient, null),
            payload,
            new NotificationInAppProjectionCommand(
                "Reserva completada",
                "La reserva de " + serviceLabel(booking) + " fue marcada como completada.",
                NotificationSeverity.SUCCESS,
                "BOOKING",
                actionUrl(booking),
                "Ver reserva"
            ),
            emailProjection(recipient, "professional_booking_completed", "Reserva completada", payload)
        );
    }

    public NotificationRecordCommand buildBookingNoShow(
        Booking booking,
        ProfessionalNotificationRecipient recipient,
        BookingActorType actorType,
        Long actorUserId,
        String sourceAction
    ) {
        Map<String, Object> payload = basePayload(booking, sourceAction);
        return buildCommand(
            NotificationEventType.BOOKING_NO_SHOW,
            booking,
            recipient,
            actorType,
            actorUserId,
            sourceAction,
            bookingDedupeKey(NotificationEventType.BOOKING_NO_SHOW, booking, recipient, null),
            payload,
            new NotificationInAppProjectionCommand(
                "Reserva marcada como no-show",
                "La reserva de " + serviceLabel(booking) + " fue marcada como no-show.",
                NotificationSeverity.WARNING,
                "BOOKING",
                actionUrl(booking),
                "Ver reserva"
            ),
            emailProjection(recipient, "professional_booking_no_show", "Reserva marcada como no-show", payload)
        );
    }

    private NotificationRecordCommand buildCommand(
        NotificationEventType eventType,
        Booking booking,
        ProfessionalNotificationRecipient recipient,
        BookingActorType actorType,
        Long actorUserId,
        String sourceAction,
        String dedupeKey,
        Map<String, Object> payload,
        NotificationInAppProjectionCommand inAppProjection,
        NotificationEmailProjectionCommand emailProjection
    ) {
        return new NotificationRecordCommand(
            eventType,
            NotificationAggregateType.BOOKING,
            String.valueOf(booking.getId()),
            "booking",
            sourceAction,
            NotificationRecipientType.PROFESSIONAL,
            String.valueOf(recipient.professionalId()),
            mapActorType(actorType),
            actorUserId == null ? null : String.valueOf(actorUserId),
            booking == null ? null : booking.getId(),
            payload,
            dedupeKey,
            resolveOccurredAt(eventType, booking),
            inAppProjection,
            emailProjection
        );
    }

    private Map<String, Object> basePayload(Booking booking, String sourceAction) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("bookingId", booking.getId());
        payload.put("serviceName", booking.getServiceNameSnapshot());
        payload.put("startDateTime", booking.getStartDateTime() == null ? null : booking.getStartDateTime().toString());
        payload.put("timezone", booking.getTimezone());
        payload.put("servicePrice", booking.getServicePriceSnapshot());
        payload.put("serviceCurrency", booking.getServiceCurrencySnapshot());
        payload.put("professionalDisplayName", booking.getProfessionalDisplayNameSnapshot());
        payload.put("status", booking.getOperationalStatus() == null ? null : booking.getOperationalStatus().name());
        payload.put("sourceAction", sourceAction);
        return payload;
    }

    private NotificationEmailProjectionCommand emailProjection(
        ProfessionalNotificationRecipient recipient,
        String templateKey,
        String subject,
        Map<String, Object> payload
    ) {
        if (recipient == null || recipient.email() == null || recipient.email().isBlank()) {
            return null;
        }
        return new NotificationEmailProjectionCommand(recipient.email(), templateKey, subject, payload);
    }

    private String bookingDedupeKey(
        NotificationEventType eventType,
        Booking booking,
        ProfessionalNotificationRecipient recipient,
        String extraDimension
    ) {
        StringBuilder dedupeKey = new StringBuilder()
            .append(eventType.name())
            .append(":booking:")
            .append(booking.getId())
            .append(":recipient:")
            .append(recipient.professionalId());
        if (extraDimension != null && !extraDimension.isBlank()) {
            dedupeKey.append(":").append(extraDimension);
        }
        return dedupeKey.toString();
    }

    private NotificationActorType mapActorType(BookingActorType actorType) {
        if (actorType == null) {
            return null;
        }
        return switch (actorType) {
            case CLIENT -> NotificationActorType.CLIENT;
            case PROFESSIONAL -> NotificationActorType.PROFESSIONAL;
            case SYSTEM -> NotificationActorType.SYSTEM;
        };
    }

    private LocalDateTime resolveOccurredAt(NotificationEventType eventType, Booking booking) {
        if (booking == null) {
            return LocalDateTime.now();
        }
        return switch (eventType) {
            case BOOKING_CREATED -> firstNonNull(booking.getCreatedAt(), LocalDateTime.now());
            case BOOKING_CANCELLED -> firstNonNull(booking.getCancelledAt(), booking.getCreatedAt(), LocalDateTime.now());
            case BOOKING_COMPLETED -> firstNonNull(booking.getCompletedAt(), booking.getCreatedAt(), LocalDateTime.now());
            case BOOKING_NO_SHOW -> firstNonNull(booking.getNoShowMarkedAt(), booking.getCreatedAt(), LocalDateTime.now());
            case BOOKING_CONFIRMED, BOOKING_RESCHEDULED -> LocalDateTime.now();
            default -> LocalDateTime.now();
        };
    }

    private int safeRescheduleCount(Booking booking) {
        return booking.getRescheduleCount() == null ? 0 : booking.getRescheduleCount();
    }

    private String actionUrl(Booking booking) {
        return booking.getId() == null ? null : "/profesional/dashboard/reservas?bookingId=" + booking.getId();
    }

    private String serviceLabel(Booking booking) {
        if (booking == null || booking.getServiceNameSnapshot() == null || booking.getServiceNameSnapshot().isBlank()) {
            return "la reserva";
        }
        return booking.getServiceNameSnapshot().trim();
    }

    private String startLabel(Booking booking) {
        return booking == null || booking.getStartDateTime() == null ? "la fecha indicada" : booking.getStartDateTime().toString();
    }

    private LocalDateTime firstNonNull(LocalDateTime... values) {
        for (LocalDateTime value : values) {
            if (value != null) {
                return value;
            }
        }
        return LocalDateTime.now();
    }
}
