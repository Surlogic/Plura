package com.plura.plurabackend.core.notification.query;

import com.plura.plurabackend.core.notification.model.NotificationRecipientType;
import com.plura.plurabackend.core.notification.model.AppNotification;
import com.plura.plurabackend.core.notification.repository.AppNotificationRepository;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class NotificationQueryService {

    private static final int DEFAULT_PAGE = 0;
    private static final int DEFAULT_SIZE = 20;
    private static final int MAX_SIZE = 100;

    private final AppNotificationRepository appNotificationRepository;
    private final NotificationViewAssembler notificationViewAssembler;
    private final MeterRegistry meterRegistry;

    public NotificationQueryService(
        AppNotificationRepository appNotificationRepository,
        NotificationViewAssembler notificationViewAssembler,
        MeterRegistry meterRegistry
    ) {
        this.appNotificationRepository = appNotificationRepository;
        this.notificationViewAssembler = notificationViewAssembler;
        this.meterRegistry = meterRegistry;
    }

    @Transactional(readOnly = true)
    public NotificationInboxPageView listInbox(NotificationInboxQuery query) {
        Timer.Sample sample = Timer.start(meterRegistry);
        try {
            NotificationInboxQuery normalized = normalize(query);
            Page<AppNotification> page = appNotificationRepository.findAll(
                NotificationInboxSpecifications.forInbox(normalized),
                PageRequest.of(
                    normalized.page(),
                    normalized.size(),
                    Sort.by(Sort.Direction.DESC, "createdAt")
                )
            );
            return new NotificationInboxPageView(
                normalized.page(),
                normalized.size(),
                page.getTotalElements(),
                page.map(notificationViewAssembler::toInboxItem).getContent()
            );
        } finally {
            sample.stop(
                Timer.builder("plura.notifications.inbox.duration")
                    .description("Notification inbox response duration")
                    .publishPercentileHistogram()
                    .register(meterRegistry)
            );
        }
    }

    @Transactional(readOnly = true)
    public long unreadCount(NotificationRecipientType recipientType, String recipientId) {
        Timer.Sample sample = Timer.start(meterRegistry);
        try {
            return appNotificationRepository.countByRecipientTypeAndRecipientIdAndReadAtIsNull(
                recipientType,
                requireRecipientId(recipientId)
            );
        } finally {
            sample.stop(
                Timer.builder("plura.notifications.unread.duration")
                    .description("Notification unread count duration")
                    .publishPercentileHistogram()
                    .register(meterRegistry)
            );
        }
    }

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

    private String requireRecipientId(String recipientId) {
        if (recipientId == null || recipientId.trim().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "recipientId es obligatorio");
        }
        return recipientId.trim();
    }

    private int normalizeSize(int size) {
        if (size <= 0) {
            return DEFAULT_SIZE;
        }
        return Math.min(size, MAX_SIZE);
    }
}
