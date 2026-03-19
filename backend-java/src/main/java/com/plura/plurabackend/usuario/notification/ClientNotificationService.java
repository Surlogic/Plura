package com.plura.plurabackend.usuario.notification;

import com.plura.plurabackend.core.booking.BookingCommandStateSupport;
import com.plura.plurabackend.core.booking.model.Booking;
import com.plura.plurabackend.core.booking.repository.BookingRepository;
import com.plura.plurabackend.core.notification.model.NotificationEventType;
import com.plura.plurabackend.core.notification.model.NotificationRecipientType;
import com.plura.plurabackend.core.notification.query.BookingNotificationTimelineQueryService;
import com.plura.plurabackend.core.notification.query.NotificationInboxQuery;
import com.plura.plurabackend.core.notification.query.NotificationQueryService;
import com.plura.plurabackend.core.notification.query.NotificationReadService;
import com.plura.plurabackend.core.user.model.User;
import com.plura.plurabackend.core.user.model.UserRole;
import com.plura.plurabackend.core.user.repository.UserRepository;
import com.plura.plurabackend.usuario.notification.dto.ClientNotificationDetailResponse;
import com.plura.plurabackend.usuario.notification.dto.ClientNotificationListResponse;
import com.plura.plurabackend.usuario.notification.dto.ClientNotificationStatusParam;
import com.plura.plurabackend.usuario.notification.dto.ClientNotificationTimelineResponse;
import com.plura.plurabackend.usuario.notification.dto.ClientNotificationUnreadCountResponse;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ClientNotificationService {

    private final UserRepository userRepository;
    private final BookingRepository bookingRepository;
    private final BookingCommandStateSupport bookingCommandStateSupport;
    private final NotificationQueryService notificationQueryService;
    private final NotificationReadService notificationReadService;
    private final BookingNotificationTimelineQueryService bookingNotificationTimelineQueryService;
    private final ClientNotificationResponseMapper responseMapper;

    public ClientNotificationService(
        UserRepository userRepository,
        BookingRepository bookingRepository,
        BookingCommandStateSupport bookingCommandStateSupport,
        NotificationQueryService notificationQueryService,
        NotificationReadService notificationReadService,
        BookingNotificationTimelineQueryService bookingNotificationTimelineQueryService,
        ClientNotificationResponseMapper responseMapper
    ) {
        this.userRepository = userRepository;
        this.bookingRepository = bookingRepository;
        this.bookingCommandStateSupport = bookingCommandStateSupport;
        this.notificationQueryService = notificationQueryService;
        this.notificationReadService = notificationReadService;
        this.bookingNotificationTimelineQueryService = bookingNotificationTimelineQueryService;
        this.responseMapper = responseMapper;
    }

    public ClientNotificationListResponse listInbox(
        String rawUserId,
        String rawStatus,
        List<NotificationEventType> types,
        Long bookingId,
        String rawFrom,
        String rawTo,
        Integer page,
        Integer size
    ) {
        User user = loadClient(rawUserId);
        return responseMapper.toListResponse(notificationQueryService.listInbox(
            new NotificationInboxQuery(
                NotificationRecipientType.CLIENT,
                String.valueOf(user.getId()),
                ClientNotificationStatusParam.toInboxStatus(rawStatus),
                types == null ? Set.of() : Set.copyOf(types),
                bookingId,
                parseDateTime(rawFrom, true),
                parseDateTime(rawTo, false),
                page == null ? 0 : page,
                size == null ? 20 : size
            )
        ));
    }

    public ClientNotificationUnreadCountResponse unreadCount(String rawUserId) {
        User user = loadClient(rawUserId);
        return new ClientNotificationUnreadCountResponse(
            notificationQueryService.unreadCount(NotificationRecipientType.CLIENT, String.valueOf(user.getId()))
        );
    }

    public ClientNotificationDetailResponse getDetail(String rawUserId, String notificationId) {
        User user = loadClient(rawUserId);
        return responseMapper.toDetailResponse(
            notificationReadService.getDetail(
                NotificationRecipientType.CLIENT,
                String.valueOf(user.getId()),
                notificationId
            )
        );
    }

    public void markAsRead(String rawUserId, String notificationId) {
        User user = loadClient(rawUserId);
        notificationReadService.markAsRead(
            NotificationRecipientType.CLIENT,
            String.valueOf(user.getId()),
            notificationId
        );
    }

    public void markAllAsRead(String rawUserId) {
        User user = loadClient(rawUserId);
        notificationReadService.markAllAsRead(
            NotificationRecipientType.CLIENT,
            String.valueOf(user.getId())
        );
    }

    public ClientNotificationTimelineResponse getBookingTimeline(String rawUserId, Long bookingId) {
        User user = loadClient(rawUserId);
        Booking booking = bookingRepository.findDetailedById(bookingId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Reserva no encontrada"));
        bookingCommandStateSupport.ensureClientOwnsBooking(user.getId(), booking);
        return responseMapper.toTimelineResponse(
            bookingId,
            bookingNotificationTimelineQueryService.listTimeline(
                NotificationRecipientType.CLIENT,
                String.valueOf(user.getId()),
                bookingId
            )
        );
    }

    private User loadClient(String rawUserId) {
        Long userId = parseUserId(rawUserId);
        User user = userRepository.findByIdAndDeletedAtIsNull(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Cliente no encontrado"));
        if (user.getRole() != UserRole.USER) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Solo clientes");
        }
        return user;
    }

    private Long parseUserId(String rawUserId) {
        if (rawUserId == null || rawUserId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "No autenticado");
        }
        try {
            return Long.parseLong(rawUserId.trim());
        } catch (NumberFormatException exception) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sesión inválida");
        }
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
