package com.plura.plurabackend.core.notification.dispatch;

import com.plura.plurabackend.core.notification.application.NotificationRecordCommand;
import com.plura.plurabackend.core.notification.email.EmailDispatchProjectionService;
import com.plura.plurabackend.core.notification.inapp.AppNotificationProjectionService;
import com.plura.plurabackend.core.notification.model.NotificationEvent;
import org.springframework.stereotype.Component;

@Component
public class NotificationProjectionDispatcher {

    private final AppNotificationProjectionService appNotificationProjectionService;
    private final EmailDispatchProjectionService emailDispatchProjectionService;

    public NotificationProjectionDispatcher(
        AppNotificationProjectionService appNotificationProjectionService,
        EmailDispatchProjectionService emailDispatchProjectionService
    ) {
        this.appNotificationProjectionService = appNotificationProjectionService;
        this.emailDispatchProjectionService = emailDispatchProjectionService;
    }

    public void dispatch(NotificationEvent event, NotificationRecordCommand command) {
        if (command.inAppProjection() != null) {
            appNotificationProjectionService.project(event, command.inAppProjection());
        }
        if (command.emailProjection() != null) {
            emailDispatchProjectionService.projectPending(event, command.emailProjection());
        }
    }
}
