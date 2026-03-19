package com.plura.plurabackend.core.notification.email;

public record NotificationEmailSendResult(
    NotificationEmailSendStatus status,
    String providerMessageId,
    String errorCode,
    String errorMessage
) {

    public static NotificationEmailSendResult sent(String providerMessageId) {
        return new NotificationEmailSendResult(NotificationEmailSendStatus.SENT, providerMessageId, null, null);
    }

    public static NotificationEmailSendResult retryableFailure(String errorCode, String errorMessage) {
        return new NotificationEmailSendResult(NotificationEmailSendStatus.FAILED_RETRYABLE, null, errorCode, errorMessage);
    }

    public static NotificationEmailSendResult permanentFailure(String errorCode, String errorMessage) {
        return new NotificationEmailSendResult(NotificationEmailSendStatus.FAILED_PERMANENT, null, errorCode, errorMessage);
    }
}
