package com.plura.plurabackend.notification.integration;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.plura.plurabackend.core.booking.event.model.BookingActorType;
import com.plura.plurabackend.core.booking.model.Booking;
import com.plura.plurabackend.core.notification.application.NotificationRecordCommand;
import com.plura.plurabackend.core.notification.application.NotificationRegistrationResult;
import com.plura.plurabackend.core.notification.integration.booking.ClientBookingNotificationCommandFactory;
import com.plura.plurabackend.core.notification.application.NotificationService;
import com.plura.plurabackend.core.notification.integration.booking.BookingNotificationCommandFactory;
import com.plura.plurabackend.core.notification.integration.booking.BookingNotificationIntegrationService;
import com.plura.plurabackend.core.notification.model.NotificationEventType;
import com.plura.plurabackend.core.professional.ProfessionalNotificationRecipient;
import com.plura.plurabackend.core.professional.ProfessionalNotificationRecipientGateway;
import com.plura.plurabackend.core.user.ClientNotificationRecipient;
import com.plura.plurabackend.core.user.ClientNotificationRecipientGateway;
import com.plura.plurabackend.core.user.model.User;
import java.time.LocalDateTime;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;

class BookingNotificationIntegrationServiceTest {

    @Test
    void bookingConfirmedUsesSameDedupeKeyAcrossDifferentInternalOrigins() {
        NotificationService notificationService = Mockito.mock(NotificationService.class);
        ProfessionalNotificationRecipientGateway recipientGateway = Mockito.mock(ProfessionalNotificationRecipientGateway.class);
        ClientNotificationRecipientGateway clientRecipientGateway = Mockito.mock(ClientNotificationRecipientGateway.class);
        when(notificationService.record(any())).thenReturn(new NotificationRegistrationResult("evt-1", "uuid-1", true));
        when(recipientGateway.findNotificationRecipientByProfessionalId(30L)).thenReturn(
            Optional.of(new ProfessionalNotificationRecipient(30L, "pro@test.com", "Pro Uno"))
        );

        BookingNotificationIntegrationService service = new BookingNotificationIntegrationService(
            notificationService,
            new BookingNotificationCommandFactory(),
            new ClientBookingNotificationCommandFactory(),
            recipientGateway,
            clientRecipientGateway
        );

        Booking booking = booking();
        service.recordBookingConfirmed(booking, BookingActorType.PROFESSIONAL, 20L, "create_professional_booking");
        service.recordBookingConfirmed(booking, BookingActorType.SYSTEM, null, "payment_webhook_auto_confirm");

        ArgumentCaptor<NotificationRecordCommand> captor = ArgumentCaptor.forClass(NotificationRecordCommand.class);
        verify(notificationService, times(2)).record(captor.capture());
        NotificationRecordCommand first = captor.getAllValues().get(0);
        NotificationRecordCommand second = captor.getAllValues().get(1);

        assertEquals(NotificationEventType.BOOKING_CONFIRMED, first.eventType());
        assertEquals(NotificationEventType.BOOKING_CONFIRMED, second.eventType());
        assertEquals(first.dedupeKey(), second.dedupeKey());
        assertEquals("create_professional_booking", first.sourceAction());
        assertEquals("payment_webhook_auto_confirm", second.sourceAction());
        assertNotNull(first.emailProjection());
    }

    @Test
    void bookingNoShowMapsToCanonicalNotificationEvent() {
        NotificationService notificationService = Mockito.mock(NotificationService.class);
        ProfessionalNotificationRecipientGateway recipientGateway = Mockito.mock(ProfessionalNotificationRecipientGateway.class);
        ClientNotificationRecipientGateway clientRecipientGateway = Mockito.mock(ClientNotificationRecipientGateway.class);
        when(notificationService.record(any())).thenReturn(new NotificationRegistrationResult("evt-1", "uuid-1", true));
        when(recipientGateway.findNotificationRecipientByProfessionalId(30L)).thenReturn(
            Optional.of(new ProfessionalNotificationRecipient(30L, null, "Pro Uno"))
        );

        BookingNotificationIntegrationService service = new BookingNotificationIntegrationService(
            notificationService,
            new BookingNotificationCommandFactory(),
            new ClientBookingNotificationCommandFactory(),
            recipientGateway,
            clientRecipientGateway
        );

        service.recordBookingNoShow(booking(), BookingActorType.PROFESSIONAL, 20L, "mark_booking_no_show");

        ArgumentCaptor<NotificationRecordCommand> captor = ArgumentCaptor.forClass(NotificationRecordCommand.class);
        verify(notificationService).record(captor.capture());
        assertEquals(NotificationEventType.BOOKING_NO_SHOW, captor.getValue().eventType());
        assertEquals("BOOKING_NO_SHOW:booking:40:recipient:30", captor.getValue().dedupeKey());
    }

    @Test
    void bookingConfirmedAlsoEmitsClientNotificationWhenBookingHasClientUser() {
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

        BookingNotificationIntegrationService service = new BookingNotificationIntegrationService(
            notificationService,
            new BookingNotificationCommandFactory(),
            new ClientBookingNotificationCommandFactory(),
            professionalRecipientGateway,
            clientRecipientGateway
        );

        Booking booking = booking();
        User user = new User();
        user.setId(50L);
        booking.setUser(user);

        service.recordBookingConfirmed(booking, BookingActorType.PROFESSIONAL, 20L, "create_professional_booking");

        ArgumentCaptor<NotificationRecordCommand> captor = ArgumentCaptor.forClass(NotificationRecordCommand.class);
        verify(notificationService, times(2)).record(captor.capture());
        assertEquals("30", captor.getAllValues().get(0).recipientId());
        assertEquals("50", captor.getAllValues().get(1).recipientId());
        assertEquals(
            "/profesional/dashboard/reservas?bookingId=40",
            captor.getAllValues().get(0).inAppProjection().actionUrl()
        );
        assertEquals(NotificationEventType.BOOKING_CONFIRMED, captor.getAllValues().get(1).eventType());
        assertEquals("/cliente/reservas?bookingId=40", captor.getAllValues().get(1).inAppProjection().actionUrl());
    }

    private Booking booking() {
        Booking booking = new Booking();
        booking.setId(40L);
        booking.setProfessionalId(30L);
        booking.setServiceNameSnapshot("Corte");
        booking.setStartDateTime(LocalDateTime.of(2026, 3, 20, 10, 0));
        booking.setTimezone("America/Montevideo");
        booking.setRescheduleCount(1);
        return booking;
    }
}
