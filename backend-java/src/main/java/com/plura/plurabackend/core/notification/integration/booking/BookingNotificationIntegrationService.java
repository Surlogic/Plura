package com.plura.plurabackend.core.notification.integration.booking;

import com.plura.plurabackend.core.booking.event.model.BookingActorType;
import com.plura.plurabackend.core.booking.model.Booking;
import com.plura.plurabackend.core.notification.application.NotificationRecordCommand;
import com.plura.plurabackend.core.notification.application.NotificationService;
import com.plura.plurabackend.core.professional.ProfessionalNotificationRecipient;
import com.plura.plurabackend.core.professional.ProfessionalNotificationRecipientGateway;
import com.plura.plurabackend.core.user.ClientNotificationRecipient;
import com.plura.plurabackend.core.user.ClientNotificationRecipientGateway;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * BookingNotificationIntegrationService es un servicio de negocio del modulo notificaciones / integraciones / reservas.
 * Responsabilidad: coordinar reglas de negocio, validaciones, persistencia e integraciones del caso de uso.
 * Colabora con: notificationService, bookingNotificationCommandFactory, clientBookingNotificationCommandFactory, professionalNotificationRecipientGateway, entre otros.
 * Foco funcional: notificaciones, reservas, servicios.
 */
@Service
public class BookingNotificationIntegrationService {

    private static final Logger LOGGER = LoggerFactory.getLogger(BookingNotificationIntegrationService.class);

    private final NotificationService notificationService;
    private final BookingNotificationCommandFactory bookingNotificationCommandFactory;
    private final ClientBookingNotificationCommandFactory clientBookingNotificationCommandFactory;
    private final ProfessionalNotificationRecipientGateway professionalNotificationRecipientGateway;
    private final ClientNotificationRecipientGateway clientNotificationRecipientGateway;

    public BookingNotificationIntegrationService(
        NotificationService notificationService,
        BookingNotificationCommandFactory bookingNotificationCommandFactory,
        ClientBookingNotificationCommandFactory clientBookingNotificationCommandFactory,
        ProfessionalNotificationRecipientGateway professionalNotificationRecipientGateway,
        ClientNotificationRecipientGateway clientNotificationRecipientGateway
    ) {
        this.notificationService = notificationService;
        this.bookingNotificationCommandFactory = bookingNotificationCommandFactory;
        this.clientBookingNotificationCommandFactory = clientBookingNotificationCommandFactory;
        this.professionalNotificationRecipientGateway = professionalNotificationRecipientGateway;
        this.clientNotificationRecipientGateway = clientNotificationRecipientGateway;
    }

    /**
     * Registra reserva created para auditoria, historial o notificaciones.
     */
    public void recordBookingCreated(Booking booking, BookingActorType actorType, Long actorUserId, String sourceAction) {
        recordProfessional(bookingNotificationCommandFactory.buildBookingCreated(
            booking,
            resolveProfessionalRecipient(booking),
            actorType,
            actorUserId,
            sourceAction
        ));
        ClientNotificationRecipient clientRecipient = resolveClientRecipient(booking);
        if (clientRecipient != null) {
            recordClient(clientBookingNotificationCommandFactory.buildBookingCreated(
                booking,
                clientRecipient,
                actorType,
                actorUserId,
                sourceAction
            ));
        }
    }

    /**
     * Registra reserva confirmed para auditoria, historial o notificaciones.
     */
    public void recordBookingConfirmed(Booking booking, BookingActorType actorType, Long actorUserId, String sourceAction) {
        recordProfessional(bookingNotificationCommandFactory.buildBookingConfirmed(
            booking,
            resolveProfessionalRecipient(booking),
            actorType,
            actorUserId,
            sourceAction
        ));
        ClientNotificationRecipient clientRecipient = resolveClientRecipient(booking);
        if (clientRecipient != null) {
            recordClient(clientBookingNotificationCommandFactory.buildBookingConfirmed(
                booking,
                clientRecipient,
                actorType,
                actorUserId,
                sourceAction
            ));
        }
    }

    /**
     * Registra reserva cancelled para auditoria, historial o notificaciones.
     */
    public void recordBookingCancelled(Booking booking, BookingActorType actorType, Long actorUserId, String sourceAction) {
        recordProfessional(bookingNotificationCommandFactory.buildBookingCancelled(
            booking,
            resolveProfessionalRecipient(booking),
            actorType,
            actorUserId,
            sourceAction
        ));
        ClientNotificationRecipient clientRecipient = resolveClientRecipient(booking);
        if (clientRecipient != null) {
            recordClient(clientBookingNotificationCommandFactory.buildBookingCancelled(
                booking,
                clientRecipient,
                actorType,
                actorUserId,
                sourceAction
            ));
        }
    }

    /**
     * Registra reserva rescheduled para auditoria, historial o notificaciones.
     */
    public void recordBookingRescheduled(Booking booking, BookingActorType actorType, Long actorUserId, String sourceAction) {
        recordProfessional(bookingNotificationCommandFactory.buildBookingRescheduled(
            booking,
            resolveProfessionalRecipient(booking),
            actorType,
            actorUserId,
            sourceAction
        ));
        ClientNotificationRecipient clientRecipient = resolveClientRecipient(booking);
        if (clientRecipient != null) {
            recordClient(clientBookingNotificationCommandFactory.buildBookingRescheduled(
                booking,
                clientRecipient,
                actorType,
                actorUserId,
                sourceAction
            ));
        }
    }

    /**
     * Registra reserva completed para auditoria, historial o notificaciones.
     */
    public void recordBookingCompleted(Booking booking, BookingActorType actorType, Long actorUserId, String sourceAction) {
        recordProfessional(bookingNotificationCommandFactory.buildBookingCompleted(
            booking,
            resolveProfessionalRecipient(booking),
            actorType,
            actorUserId,
            sourceAction
        ));
    }

    /**
     * Registra reserva no show para auditoria, historial o notificaciones.
     */
    public void recordBookingNoShow(Booking booking, BookingActorType actorType, Long actorUserId, String sourceAction) {
        recordProfessional(bookingNotificationCommandFactory.buildBookingNoShow(
            booking,
            resolveProfessionalRecipient(booking),
            actorType,
            actorUserId,
            sourceAction
        ));
    }

    /**
     * Resuelve profesional destinatario normalizando entradas, defaults y casos borde.
     */
    private ProfessionalNotificationRecipient resolveProfessionalRecipient(Booking booking) {
        if (booking == null || booking.getProfessionalId() == null) {
            throw new IllegalArgumentException("La reserva debe tener professionalId para emitir notificacion");
        }
        return professionalNotificationRecipientGateway.findNotificationRecipientByProfessionalId(booking.getProfessionalId())
            .orElseGet(() -> {
                LOGGER.warn(
                    "Professional notification recipient no encontrado para bookingId={} professionalId={}",
                    booking.getId(),
                    booking.getProfessionalId()
                );
                return new ProfessionalNotificationRecipient(booking.getProfessionalId(), null, null);
            });
    }

    /**
     * Resuelve cliente destinatario normalizando entradas, defaults y casos borde.
     */
    private ClientNotificationRecipient resolveClientRecipient(Booking booking) {
        if (booking == null || booking.getUser() == null || booking.getUser().getId() == null) {
            LOGGER.warn(
                "Client notification recipient no disponible para bookingId={} por ausencia de user asociado",
                booking == null ? null : booking.getId()
            );
            return null;
        }
        Long userId = booking.getUser().getId();
        return clientNotificationRecipientGateway.findNotificationRecipientByUserId(userId)
            .orElseGet(() -> {
                LOGGER.warn(
                    "Client notification recipient no encontrado para bookingId={} userId={}",
                    booking.getId(),
                    userId
                );
                return new ClientNotificationRecipient(userId, null, null);
            });
    }

    /**
     * Registra profesional para auditoria, historial o notificaciones.
     */
    private void recordProfessional(NotificationRecordCommand command) {
        notificationService.record(command);
    }

    /**
     * Registra cliente para auditoria, historial o notificaciones.
     */
    private void recordClient(NotificationRecordCommand command) {
        notificationService.record(command);
    }
}
