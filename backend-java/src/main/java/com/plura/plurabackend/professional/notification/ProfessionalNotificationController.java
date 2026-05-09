package com.plura.plurabackend.professional.notification;

import com.plura.plurabackend.core.notification.model.NotificationEventType;
import com.plura.plurabackend.core.security.RoleGuard;
import com.plura.plurabackend.professional.notification.dto.ProfessionalNotificationDetailResponse;
import com.plura.plurabackend.professional.notification.dto.ProfessionalNotificationListResponse;
import com.plura.plurabackend.professional.notification.dto.ProfessionalNotificationTimelineResponse;
import com.plura.plurabackend.professional.notification.dto.ProfessionalNotificationUnreadCountResponse;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * ProfessionalNotificationController es un controlador REST del modulo profesionales / notificaciones.
 * Responsabilidad: recibir requests HTTP, validar acceso basico y delegar la operacion al servicio de aplicacion o dominio.
 * Superficie HTTP: atiende rutas bajo /profesional y deja la logica pesada en servicios.
 * Foco funcional: profesionales, notificaciones.
 */
@RestController
@RequestMapping("/profesional")
public class ProfessionalNotificationController {

    private final ProfessionalNotificationService professionalNotificationService;
    private final RoleGuard roleGuard;

    public ProfessionalNotificationController(
        ProfessionalNotificationService professionalNotificationService,
        RoleGuard roleGuard
    ) {
        this.professionalNotificationService = professionalNotificationService;
        this.roleGuard = roleGuard;
    }

    /**
     * Devuelve el listado de notificaciones aplicando permisos y filtros del caso de uso.
     */
    @GetMapping("/notificaciones")
    public ProfessionalNotificationListResponse listNotifications(
        @RequestParam(required = false) String status,
        @RequestParam(required = false) List<NotificationEventType> types,
        @RequestParam(required = false) Long bookingId,
        @RequestParam(required = false) String from,
        @RequestParam(required = false) String to,
        @RequestParam(required = false) Integer page,
        @RequestParam(required = false) Integer size
    ) {
        return professionalNotificationService.listInbox(
            currentProfessionalUserId(),
            status,
            types,
            bookingId,
            from,
            to,
            page,
            size
        );
    }

    /**
     * Ejecuta la logica de no leidas conteo manteniendola encapsulada en este componente.
     */
    @GetMapping("/notificaciones/unread-count")
    public ProfessionalNotificationUnreadCountResponse unreadCount() {
        return professionalNotificationService.unreadCount(currentProfessionalUserId());
    }

    @GetMapping("/notificaciones/{id}")
    public ProfessionalNotificationDetailResponse getNotification(@PathVariable("id") String notificationId) {
        return professionalNotificationService.getDetail(currentProfessionalUserId(), notificationId);
    }

    /**
     * Marca notificacion como leida y actualiza los indicadores relacionados.
     */
    @PatchMapping("/notificaciones/{id}/read")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void markNotificationAsRead(@PathVariable("id") String notificationId) {
        professionalNotificationService.markAsRead(currentProfessionalUserId(), notificationId);
    }

    /**
     * Marca todos notificaciones como leida y actualiza los indicadores relacionados.
     */
    @PatchMapping("/notificaciones/read-all")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void markAllNotificationsAsRead() {
        professionalNotificationService.markAllAsRead(currentProfessionalUserId());
    }

    @GetMapping("/reservas/{bookingId}/timeline")
    public ProfessionalNotificationTimelineResponse getBookingTimeline(@PathVariable("bookingId") Long bookingId) {
        return professionalNotificationService.getBookingTimeline(currentProfessionalUserId(), bookingId);
    }

    /**
     * Obtiene el usuario profesional autenticado desde el contexto de seguridad actual.
     */
    private String currentProfessionalUserId() {
        return String.valueOf(roleGuard.requireProfessional());
    }
}
