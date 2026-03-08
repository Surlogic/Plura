package com.plura.plurabackend.auth;

import com.plura.plurabackend.user.model.User;

public interface PhoneVerificationNotificationSender {
    void sendVerificationCode(PhoneVerificationNotification notification);

    record PhoneVerificationNotification(
        User user,
        String phoneNumber,
        String code
    ) {}
}
