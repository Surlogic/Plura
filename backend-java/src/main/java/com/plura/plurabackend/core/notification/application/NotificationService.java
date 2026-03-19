package com.plura.plurabackend.core.notification.application;

import com.plura.plurabackend.core.notification.dispatch.NotificationProjectionDispatcher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class NotificationService {

    private final NotificationEventService notificationEventService;
    private final NotificationProjectionDispatcher notificationProjectionDispatcher;

    public NotificationService(
        NotificationEventService notificationEventService,
        NotificationProjectionDispatcher notificationProjectionDispatcher
    ) {
        this.notificationEventService = notificationEventService;
        this.notificationProjectionDispatcher = notificationProjectionDispatcher;
    }

    @Transactional
    public NotificationRegistrationResult record(NotificationRecordCommand command) {
        NotificationEventService.NotificationEventRegistration registration =
            notificationEventService.recordCanonicalEvent(command);

        if (registration.created()) {
            notificationProjectionDispatcher.dispatch(registration.event(), command);
        }

        return new NotificationRegistrationResult(
            registration.event().getId(),
            registration.event().getEventUuid(),
            registration.created()
        );
    }
}
