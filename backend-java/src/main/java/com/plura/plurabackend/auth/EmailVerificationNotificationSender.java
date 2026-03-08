package com.plura.plurabackend.auth;

import com.plura.plurabackend.user.model.User;

public interface EmailVerificationNotificationSender {

    void sendVerificationCode(EmailVerificationNotification notification);

    record EmailVerificationNotification(
        User user,
        String email,
        String code
    ) {}
}
