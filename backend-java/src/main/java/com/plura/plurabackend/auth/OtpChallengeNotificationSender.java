package com.plura.plurabackend.auth;

import com.plura.plurabackend.auth.model.OtpChallengeChannel;
import com.plura.plurabackend.auth.model.OtpChallengePurpose;
import com.plura.plurabackend.user.model.User;

public interface OtpChallengeNotificationSender {

    void sendChallenge(OtpChallengeNotification notification);

    record OtpChallengeNotification(
        User user,
        OtpChallengePurpose purpose,
        OtpChallengeChannel channel,
        String destination,
        String code
    ) {}
}
