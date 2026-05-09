package com.plura.plurabackend.core.notification.query;

import com.plura.plurabackend.core.notification.model.NotificationRecipientType;
import com.plura.plurabackend.core.notification.repository.AppNotificationRepository;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * NotificationQueryService es un servicio de negocio del modulo notificaciones / consultas.
 * Responsabilidad: coordinar reglas de negocio, validaciones, persistencia e integraciones del caso de uso.
 * Colabora con: appNotificationRepository, notificationInboxReadRepository, meterRegistry, inboxTimer, entre otros.
 * Foco funcional: notificaciones, servicios.
 */
@Service
public class NotificationQueryService {

    private static final int DEFAULT_PAGE = 0;
    private static final int DEFAULT_SIZE = 20;
    private static final int MAX_SIZE = 100;

    private final AppNotificationRepository appNotificationRepository;
    private final NotificationInboxReadRepository notificationInboxReadRepository;
    private final MeterRegistry meterRegistry;
    private final Timer inboxTimer;
    private final Timer unreadTimer;

    public NotificationQueryService(
        AppNotificationRepository appNotificationRepository,
        NotificationInboxReadRepository notificationInboxReadRepository,
        MeterRegistry meterRegistry
    ) {
        this.appNotificationRepository = appNotificationRepository;
        this.notificationInboxReadRepository = notificationInboxReadRepository;
        this.meterRegistry = meterRegistry;
        this.inboxTimer = Timer.builder("plura.notifications.inbox.duration")
            .description("Notification inbox response duration")
            .publishPercentileHistogram()
            .register(meterRegistry);
        this.unreadTimer = Timer.builder("plura.notifications.unread.duration")
            .description("Notification unread count duration")
            .publishPercentileHistogram()
            .register(meterRegistry);
    }

    /**
     * Devuelve el listado de bandeja aplicando permisos y filtros del caso de uso.
     */
    @Transactional(readOnly = true)
    public NotificationInboxPageView listInbox(NotificationInboxQuery query) {
        Timer.Sample sample = Timer.start(meterRegistry);
        try {
            NotificationInboxQuery normalized = normalize(query);
            return notificationInboxReadRepository.listInbox(normalized);
        } finally {
            sample.stop(inboxTimer);
        }
    }

    /**
     * Ejecuta la logica de no leidas conteo manteniendola encapsulada en este componente.
     */
    @Transactional(readOnly = true)
    public long unreadCount(NotificationRecipientType recipientType, String recipientId) {
        Timer.Sample sample = Timer.start(meterRegistry);
        try {
            return appNotificationRepository.countByRecipientTypeAndRecipientIdAndReadAtIsNull(
                recipientType,
                requireRecipientId(recipientId)
            );
        } finally {
            sample.stop(unreadTimer);
        }
    }

    /**
     * Normaliza normalizar para evitar variantes vacias, invalidas o inconsistentes.
     */
    private NotificationInboxQuery normalize(NotificationInboxQuery query) {
        if (query == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Query inválida");
        }
        if (query.recipientType() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "recipientType es obligatorio");
        }
        if (query.from() != null && query.to() != null && query.from().isAfter(query.to())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "from no puede ser mayor que to");
        }
        return new NotificationInboxQuery(
            query.recipientType(),
            requireRecipientId(query.recipientId()),
            query.status() == null ? NotificationInboxStatus.ALL : query.status(),
            query.types() == null ? java.util.Set.of() : java.util.Set.copyOf(query.types()),
            query.bookingId(),
            query.from(),
            query.to(),
            Math.max(DEFAULT_PAGE, query.page()),
            normalizeSize(query.size())
        );
    }

    /**
     * Exige destinatario ID y corta la ejecucion si falta autorizacion o contexto.
     * Esta separacion hace explicita la regla de seguridad o negocio que protege el flujo.
     */
    private String requireRecipientId(String recipientId) {
        if (recipientId == null || recipientId.trim().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "recipientId es obligatorio");
        }
        return recipientId.trim();
    }

    /**
     * Normaliza size para evitar variantes vacias, invalidas o inconsistentes.
     */
    private int normalizeSize(int size) {
        if (size <= 0) {
            return DEFAULT_SIZE;
        }
        return Math.min(size, MAX_SIZE);
    }
}
