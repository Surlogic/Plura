package com.plura.plurabackend.core.notification.query;

import com.plura.plurabackend.core.notification.model.NotificationAggregateType;
import com.plura.plurabackend.core.notification.model.NotificationRecipientType;
import com.plura.plurabackend.core.notification.repository.NotificationEventRepository;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * BookingNotificationTimelineQueryService es un servicio de negocio del modulo notificaciones / consultas.
 * Responsabilidad: coordinar reglas de negocio, validaciones, persistencia e integraciones del caso de uso.
 * Colabora con: notificationEventRepository, notificationViewAssembler.
 * Foco funcional: notificaciones, reservas, servicios.
 */
@Service
public class BookingNotificationTimelineQueryService {

    private final NotificationEventRepository notificationEventRepository;
    private final NotificationViewAssembler notificationViewAssembler;

    public BookingNotificationTimelineQueryService(
        NotificationEventRepository notificationEventRepository,
        NotificationViewAssembler notificationViewAssembler
    ) {
        this.notificationEventRepository = notificationEventRepository;
        this.notificationViewAssembler = notificationViewAssembler;
    }

    /**
     * Devuelve el listado de timeline aplicando permisos y filtros del caso de uso.
     */
    @Transactional(readOnly = true)
    public List<BookingNotificationTimelineItemView> listTimeline(
        NotificationRecipientType recipientType,
        String recipientId,
        Long bookingId
    ) {
        if (recipientType == null) {
            throw new IllegalArgumentException("recipientType es obligatorio");
        }
        if (recipientId == null || recipientId.trim().isBlank()) {
            throw new IllegalArgumentException("recipientId es obligatorio");
        }
        if (bookingId == null) {
            throw new IllegalArgumentException("bookingId es obligatorio");
        }
        return notificationEventRepository.findTimelineEventsForBooking(
            recipientType,
            recipientId.trim(),
            bookingId,
            NotificationAggregateType.BOOKING,
            String.valueOf(bookingId),
            "%\"bookingId\":" + bookingId + "%"
        ).stream().map(notificationViewAssembler::toTimelineItem).toList();
    }
}
