package com.plura.plurabackend.professional.notification;

import com.plura.plurabackend.core.booking.BookingCommandStateSupport;
import com.plura.plurabackend.core.booking.model.Booking;
import com.plura.plurabackend.core.booking.repository.BookingRepository;
import com.plura.plurabackend.core.notification.model.NotificationEventType;
import com.plura.plurabackend.core.notification.model.NotificationRecipientType;
import com.plura.plurabackend.core.notification.query.BookingNotificationTimelineQueryService;
import com.plura.plurabackend.core.notification.query.NotificationInboxQuery;
import com.plura.plurabackend.core.notification.query.NotificationQueryService;
import com.plura.plurabackend.core.notification.query.NotificationReadService;
import com.plura.plurabackend.professional.application.ProfessionalAccessSupport;
import com.plura.plurabackend.professional.model.ProfessionalProfile;
import com.plura.plurabackend.professional.notification.dto.ProfessionalNotificationDetailResponse;
import com.plura.plurabackend.professional.notification.dto.ProfessionalNotificationListResponse;
import com.plura.plurabackend.professional.notification.dto.ProfessionalNotificationStatusParam;
import com.plura.plurabackend.professional.notification.dto.ProfessionalNotificationTimelineResponse;
import com.plura.plurabackend.professional.notification.dto.ProfessionalNotificationUnreadCountResponse;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ProfessionalNotificationService {

    private final ProfessionalAccessSupport professionalAccessSupport;
    private final BookingRepository bookingRepository;
    private final BookingCommandStateSupport bookingCommandStateSupport;
    private final NotificationQueryService notificationQueryService;
    private final NotificationReadService notificationReadService;
    private final BookingNotificationTimelineQueryService bookingNotificationTimelineQueryService;
    private final ProfessionalNotificationResponseMapper responseMapper;

    public ProfessionalNotificationService(
        ProfessionalAccessSupport professionalAccessSupport,
        BookingRepository bookingRepository,
        BookingCommandStateSupport bookingCommandStateSupport,
        NotificationQueryService notificationQueryService,
        NotificationReadService notificationReadService,
        BookingNotificationTimelineQueryService bookingNotificationTimelineQueryService,
        ProfessionalNotificationResponseMapper responseMapper
    ) {
        this.professionalAccessSupport = professionalAccessSupport;
        this.bookingRepository = bookingRepository;
        this.bookingCommandStateSupport = bookingCommandStateSupport;
        this.notificationQueryService = notificationQueryService;
        this.notificationReadService = notificationReadService;
        this.bookingNotificationTimelineQueryService = bookingNotificationTimelineQueryService;
        this.responseMapper = responseMapper;
    }

    public ProfessionalNotificationListResponse listInbox(
        String rawUserId,
        String rawStatus,
        List<NotificationEventType> types,
        Long bookingId,
        String rawFrom,
        String rawTo,
        Integer page,
        Integer size
    ) {
        ProfessionalProfile profile = professionalAccessSupport.loadProfessionalByUserId(rawUserId);
        return responseMapper.toListResponse(notificationQueryService.listInbox(
            new NotificationInboxQuery(
                NotificationRecipientType.PROFESSIONAL,
                String.valueOf(profile.getId()),
                ProfessionalNotificationStatusParam.toInboxStatus(rawStatus),
                types == null ? Set.of() : Set.copyOf(types),
                bookingId,
                parseDateTime(rawFrom, true),
                parseDateTime(rawTo, false),
                page == null ? 0 : page,
                size == null ? 20 : size
            )
        ));
    }

    public ProfessionalNotificationUnreadCountResponse unreadCount(String rawUserId) {
        ProfessionalProfile profile = professionalAccessSupport.loadProfessionalByUserId(rawUserId);
        return new ProfessionalNotificationUnreadCountResponse(
            notificationQueryService.unreadCount(NotificationRecipientType.PROFESSIONAL, String.valueOf(profile.getId()))
        );
    }

    public ProfessionalNotificationDetailResponse getDetail(String rawUserId, String notificationId) {
        ProfessionalProfile profile = professionalAccessSupport.loadProfessionalByUserId(rawUserId);
        return responseMapper.toDetailResponse(
            notificationReadService.getDetail(
                NotificationRecipientType.PROFESSIONAL,
                String.valueOf(profile.getId()),
                notificationId
            )
        );
    }

    public void markAsRead(String rawUserId, String notificationId) {
        ProfessionalProfile profile = professionalAccessSupport.loadProfessionalByUserId(rawUserId);
        notificationReadService.markAsRead(
            NotificationRecipientType.PROFESSIONAL,
            String.valueOf(profile.getId()),
            notificationId
        );
    }

    public void markAllAsRead(String rawUserId) {
        ProfessionalProfile profile = professionalAccessSupport.loadProfessionalByUserId(rawUserId);
        notificationReadService.markAllAsRead(
            NotificationRecipientType.PROFESSIONAL,
            String.valueOf(profile.getId())
        );
    }

    public ProfessionalNotificationTimelineResponse getBookingTimeline(String rawUserId, Long bookingId) {
        ProfessionalProfile profile = professionalAccessSupport.loadProfessionalByUserId(rawUserId);
        Booking booking = bookingRepository.findDetailedById(bookingId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Reserva no encontrada"));
        bookingCommandStateSupport.ensureProfessionalOwnsBooking(profile.getId(), booking);
        return responseMapper.toTimelineResponse(
            bookingId,
            bookingNotificationTimelineQueryService.listTimeline(
                NotificationRecipientType.PROFESSIONAL,
                String.valueOf(profile.getId()),
                bookingId
            )
        );
    }

    private LocalDateTime parseDateTime(String rawValue, boolean startOfDay) {
        if (rawValue == null || rawValue.isBlank()) {
            return null;
        }
        try {
            if (rawValue.contains("T")) {
                return LocalDateTime.parse(rawValue.trim());
            }
            LocalDate date = LocalDate.parse(rawValue.trim());
            return startOfDay
                ? date.atStartOfDay()
                : date.plusDays(1).atStartOfDay().minusNanos(1);
        } catch (DateTimeParseException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Formato de fecha inválido");
        }
    }
}
