package com.plura.plurabackend.core.notification.email;

public interface NotificationEmailSender {

    NotificationEmailSendResult send(NotificationEmailMessage message);
}
