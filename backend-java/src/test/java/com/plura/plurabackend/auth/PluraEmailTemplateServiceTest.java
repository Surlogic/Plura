package com.plura.plurabackend.core.auth;

import static org.junit.jupiter.api.Assertions.assertTrue;

import com.plura.plurabackend.core.auth.model.OtpChallengePurpose;
import org.junit.jupiter.api.Test;

class PluraEmailTemplateServiceTest {

    private final PluraEmailTemplateService templateService =
        new PluraEmailTemplateService("Plura", "https://plura.app");

    @Test
    void passwordResetTemplateIncludesResetCallToActionAndLink() {
        TransactionalEmailService.TransactionalEmailMessage email = templateService.buildPasswordResetEmail(
            "user@plura.com",
            "German",
            "https://plura.app/auth/reset-password?token=abc123",
            30
        );

        assertTrue(email.subject().contains("Restablece tu contraseña"));
        assertTrue(email.htmlBody().contains("Restablecer contraseña"));
        assertTrue(email.htmlBody().contains("https://plura.app/auth/reset-password?token=abc123"));
        assertTrue(email.textBody().contains("https://plura.app/auth/reset-password?token=abc123"));
        assertTrue(email.textBody().contains("30 minutos"));
    }

    @Test
    void emailVerificationTemplateHighlightsCodeAndExpiry() {
        TransactionalEmailService.TransactionalEmailMessage email = templateService.buildEmailVerificationEmail(
            "user@plura.com",
            "German",
            "123456",
            15
        );

        assertTrue(email.subject().contains("código de verificación"));
        assertTrue(email.htmlBody().contains("123456"));
        assertTrue(email.htmlBody().contains("15 minutos"));
        assertTrue(email.textBody().contains("123456"));
    }

    @Test
    void otpTemplateIncludesPurposeCodeAndSecurityNote() {
        TransactionalEmailService.TransactionalEmailMessage email = templateService.buildOtpChallengeEmail(
            "user@plura.com",
            "German",
            OtpChallengePurpose.ACCOUNT_DELETION,
            "654321",
            10
        );

        assertTrue(email.subject().contains("Código de seguridad"));
        assertTrue(email.htmlBody().contains("eliminación de tu cuenta"));
        assertTrue(email.htmlBody().contains("654321"));
        assertTrue(email.textBody().contains("654321"));
        assertTrue(email.textBody().contains("10 minutos"));
    }
}
