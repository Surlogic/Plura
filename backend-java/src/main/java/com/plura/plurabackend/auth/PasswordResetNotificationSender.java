package com.plura.plurabackend.auth;

import com.plura.plurabackend.user.model.User;

public interface PasswordResetNotificationSender {
    void sendPasswordReset(PasswordResetNotification notification);

    record PasswordResetNotification(
        User user,
        String resetUrl,
        String rawToken
    ) {}
}
