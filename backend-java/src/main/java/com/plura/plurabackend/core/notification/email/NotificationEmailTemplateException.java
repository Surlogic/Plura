package com.plura.plurabackend.core.notification.email;

public class NotificationEmailTemplateException extends RuntimeException {

    public NotificationEmailTemplateException(String message) {
        super(message);
    }

    public NotificationEmailTemplateException(String message, Throwable cause) {
        super(message, cause);
    }
}
