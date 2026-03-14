package com.plura.plurabackend.core.auth;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.plura.plurabackend.core.auth.model.OtpChallengeChannel;
import com.plura.plurabackend.core.auth.model.OtpChallengePurpose;
import com.plura.plurabackend.core.user.model.User;
import org.junit.jupiter.api.Test;

class NotificationSenderWiringTest {

    @Test
    void passwordResetSenderBuildsPasswordResetEmail() {
        CapturingTransactionalEmailService delivery = new CapturingTransactionalEmailService();
        PasswordResetEmailNotificationSender sender = new PasswordResetEmailNotificationSender(
            delivery,
            new PluraEmailTemplateService("Plura", "https://plura.app"),
            30
        );

        sender.sendPasswordReset(new PasswordResetNotificationSender.PasswordResetNotification(
            user("German", "user@plura.com"),
            "https://plura.app/auth/reset-password?token=abc123",
            "abc123"
        ));

        assertNotNull(delivery.lastMessage);
        assertEquals("password_reset", delivery.lastMessage.templateKey());
        assertEquals("user@plura.com", delivery.lastMessage.toAddress());
    }

    @Test
    void emailVerificationSenderBuildsVerificationEmail() {
        CapturingTransactionalEmailService delivery = new CapturingTransactionalEmailService();
        EmailVerificationEmailNotificationSender sender = new EmailVerificationEmailNotificationSender(
            delivery,
            new PluraEmailTemplateService("Plura", "https://plura.app"),
            15
        );

        sender.sendVerificationCode(new EmailVerificationNotificationSender.EmailVerificationNotification(
            user("German", "user@plura.com"),
            "user@plura.com",
            "123456"
        ));

        assertNotNull(delivery.lastMessage);
        assertEquals("email_verification", delivery.lastMessage.templateKey());
        assertEquals("user@plura.com", delivery.lastMessage.toAddress());
    }

    @Test
    void emailVerificationSenderFailsWhenDeliveryDoesNotSend() {
        EmailVerificationEmailNotificationSender sender = new EmailVerificationEmailNotificationSender(
            new FailingTransactionalEmailService(TransactionalEmailService.DeliveryStatus.FAILED),
            new PluraEmailTemplateService("Plura", "https://plura.app"),
            15
        );

        AuthApiException exception = assertThrows(
            AuthApiException.class,
            () -> sender.sendVerificationCode(new EmailVerificationNotificationSender.EmailVerificationNotification(
                user("German", "user@plura.com"),
                "user@plura.com",
                "123456"
            ))
        );

        assertEquals("EMAIL_DELIVERY_UNAVAILABLE", exception.getErrorCode());
    }

    @Test
    void emailVerificationSenderAllowsSkippedFallbackWhenSmtpIsDisabled() {
        EmailVerificationEmailNotificationSender sender = new EmailVerificationEmailNotificationSender(
            new FailingTransactionalEmailService(TransactionalEmailService.DeliveryStatus.SKIPPED_FALLBACK),
            new PluraEmailTemplateService("Plura", "https://plura.app"),
            15
        );

        sender.sendVerificationCode(new EmailVerificationNotificationSender.EmailVerificationNotification(
            user("German", "user@plura.com"),
            "user@plura.com",
            "123456"
        ));
    }

    @Test
    void otpChallengeSenderOnlyUsesEmailDeliveryForEmailChannel() {
        CapturingTransactionalEmailService delivery = new CapturingTransactionalEmailService();
        OtpChallengeEmailNotificationSender sender = new OtpChallengeEmailNotificationSender(
            delivery,
            new PluraEmailTemplateService("Plura", "https://plura.app"),
            10
        );

        sender.sendChallenge(new OtpChallengeNotificationSender.OtpChallengeNotification(
            user("German", "user@plura.com"),
            OtpChallengePurpose.ACCOUNT_DELETION,
            OtpChallengeChannel.SMS,
            "+5491111111111",
            "654321"
        ));
        assertNull(delivery.lastMessage);

        sender.sendChallenge(new OtpChallengeNotificationSender.OtpChallengeNotification(
            user("German", "user@plura.com"),
            OtpChallengePurpose.ACCOUNT_DELETION,
            OtpChallengeChannel.EMAIL,
            "user@plura.com",
            "654321"
        ));
        assertNotNull(delivery.lastMessage);
        assertEquals("otp_challenge", delivery.lastMessage.templateKey());
        assertEquals("user@plura.com", delivery.lastMessage.toAddress());
    }

    private User user(String fullName, String email) {
        User user = new User();
        user.setFullName(fullName);
        user.setEmail(email);
        return user;
    }

    private static final class CapturingTransactionalEmailService implements TransactionalEmailService {
        private TransactionalEmailMessage lastMessage;

        @Override
        public DeliveryStatus send(TransactionalEmailMessage message) {
            this.lastMessage = message;
            return DeliveryStatus.SENT;
        }
    }

    private record FailingTransactionalEmailService(DeliveryStatus status) implements TransactionalEmailService {
        @Override
        public DeliveryStatus send(TransactionalEmailMessage message) {
            return status;
        }
    }
}
