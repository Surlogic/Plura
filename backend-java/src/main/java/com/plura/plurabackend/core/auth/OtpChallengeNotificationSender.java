package com.plura.plurabackend.core.auth;

import com.plura.plurabackend.core.auth.model.OtpChallengeChannel;
import com.plura.plurabackend.core.auth.model.OtpChallengePurpose;
import com.plura.plurabackend.core.user.model.User;

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
