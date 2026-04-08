package com.plura.plurabackend.usuario.notification;

import com.plura.plurabackend.core.notification.model.NotificationEventType;
import com.plura.plurabackend.core.security.RoleGuard;
import com.plura.plurabackend.usuario.notification.dto.ClientNotificationDetailResponse;
import com.plura.plurabackend.usuario.notification.dto.ClientNotificationListResponse;
import com.plura.plurabackend.usuario.notification.dto.ClientNotificationTimelineResponse;
import com.plura.plurabackend.usuario.notification.dto.ClientNotificationUnreadCountResponse;
import com.plura.plurabackend.usuario.notification.dto.ClientPushTokenUpsertRequest;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/cliente")
public class ClientNotificationController {

    private final ClientNotificationService clientNotificationService;
    private final ClientPushTokenService clientPushTokenService;
    private final RoleGuard roleGuard;

    public ClientNotificationController(
        ClientNotificationService clientNotificationService,
        ClientPushTokenService clientPushTokenService,
        RoleGuard roleGuard
    ) {
        this.clientNotificationService = clientNotificationService;
        this.clientPushTokenService = clientPushTokenService;
        this.roleGuard = roleGuard;
    }

    @GetMapping("/notificaciones")
    public ClientNotificationListResponse listNotifications(
        @RequestParam(required = false) String status,
        @RequestParam(required = false) List<NotificationEventType> types,
        @RequestParam(required = false) Long bookingId,
        @RequestParam(required = false) String from,
        @RequestParam(required = false) String to,
        @RequestParam(required = false) Integer page,
        @RequestParam(required = false) Integer size
    ) {
        return clientNotificationService.listInbox(
            currentClientUserId(),
            status,
            types,
            bookingId,
            from,
            to,
            page,
            size
        );
    }

    @GetMapping("/notificaciones/unread-count")
    public ClientNotificationUnreadCountResponse unreadCount() {
        return clientNotificationService.unreadCount(currentClientUserId());
    }

    @GetMapping("/notificaciones/{id}")
    public ClientNotificationDetailResponse getNotification(@PathVariable("id") String notificationId) {
        return clientNotificationService.getDetail(currentClientUserId(), notificationId);
    }

    @PatchMapping("/notificaciones/{id}/read")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void markNotificationAsRead(@PathVariable("id") String notificationId) {
        clientNotificationService.markAsRead(currentClientUserId(), notificationId);
    }

    @PatchMapping("/notificaciones/read-all")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void markAllNotificationsAsRead() {
        clientNotificationService.markAllAsRead(currentClientUserId());
    }

    @PutMapping("/notificaciones/push-token")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void upsertPushToken(@RequestBody ClientPushTokenUpsertRequest request) {
        clientPushTokenService.sync(roleGuard.requireUser(), request);
    }

    @GetMapping("/reservas/{bookingId}/timeline")
    public ClientNotificationTimelineResponse getBookingTimeline(@PathVariable("bookingId") Long bookingId) {
        return clientNotificationService.getBookingTimeline(currentClientUserId(), bookingId);
    }

    private String currentClientUserId() {
        return String.valueOf(roleGuard.requireUser());
    }
}
