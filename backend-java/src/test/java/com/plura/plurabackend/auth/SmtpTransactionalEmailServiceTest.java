package com.plura.plurabackend.core.auth;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import java.util.Properties;
import org.junit.jupiter.api.Test;
import org.springframework.mail.javamail.JavaMailSender;

/**
 * Tests de autenticacion, sesiones, OTP y recuperacion de cuenta.
 * Cubren escenarios de SMTP transactional email servicio para documentar el comportamiento esperado y evitar regresiones.
 * Mantener estos casos alineados con los contratos reales del backend cuando cambie la logica productiva.
 */
class SmtpTransactionalEmailServiceTest {

    /**
     * Escenario: fallback is used cuando delivery is disabled.
     * El objetivo es dejar explicita la regla que protege este test.
     */
    @Test
    void fallbackIsUsedWhenDeliveryIsDisabled() {
        JavaMailSender javaMailSender = mock(JavaMailSender.class);
        SmtpTransactionalEmailService service = new SmtpTransactionalEmailService(
            javaMailSender,
            false,
            "",
            true,
            "",
            "",
            "",
            "Plura",
            ""
        );

        TransactionalEmailService.DeliveryStatus result = service.send(
            new TransactionalEmailService.TransactionalEmailMessage(
                "password_reset",
                "user@plura.com",
                "German",
                "Subject",
                "<html>Hi</html>",
                "Hi"
            )
        );

        assertEquals(TransactionalEmailService.DeliveryStatus.SKIPPED_FALLBACK, result);
        verify(javaMailSender, never()).send(org.mockito.ArgumentMatchers.any(MimeMessage.class));
    }

    /**
     * Escenario: SMTP delivery usa real mail sender cuando configured.
     * El objetivo es dejar explicita la regla que protege este test.
     */
    @Test
    void smtpDeliveryUsesRealMailSenderWhenConfigured() throws Exception {
        JavaMailSender javaMailSender = mock(JavaMailSender.class);
        MimeMessage mimeMessage = new MimeMessage(Session.getInstance(new Properties()));
        when(javaMailSender.createMimeMessage()).thenReturn(mimeMessage);

        SmtpTransactionalEmailService service = new SmtpTransactionalEmailService(
            javaMailSender,
            true,
            "smtp.example.com",
            true,
            "smtp-user",
            "smtp-pass",
            "noreply@plura.com",
            "Plura",
            "support@plura.com"
        );

        TransactionalEmailService.DeliveryStatus result = service.send(
            new TransactionalEmailService.TransactionalEmailMessage(
                "email_verification",
                "user@plura.com",
                "German",
                "Verification subject",
                "<html><body>Hello</body></html>",
                "Hello"
            )
        );

        assertEquals(TransactionalEmailService.DeliveryStatus.SENT, result);
        assertEquals("Verification subject", mimeMessage.getSubject());
        assertNotNull(mimeMessage.getAllRecipients());
        assertEquals("user@plura.com", mimeMessage.getAllRecipients()[0].toString());
        verify(javaMailSender).send(mimeMessage);
    }

    /**
     * Escenario: fallback is used cuando SMTP auth is enabled but credentials are faltante.
     * El objetivo es dejar explicita la regla que protege este test.
     */
    @Test
    void fallbackIsUsedWhenSmtpAuthIsEnabledButCredentialsAreMissing() {
        JavaMailSender javaMailSender = mock(JavaMailSender.class);
        SmtpTransactionalEmailService service = new SmtpTransactionalEmailService(
            javaMailSender,
            true,
            "smtp.example.com",
            true,
            "smtp-user",
            "",
            "noreply@plura.com",
            "Plura",
            ""
        );

        TransactionalEmailService.DeliveryStatus result = service.send(
            new TransactionalEmailService.TransactionalEmailMessage(
                "email_verification",
                "user@plura.com",
                "German",
                "Subject",
                "<html>Hi</html>",
                "Hi"
            )
        );

        assertEquals(TransactionalEmailService.DeliveryStatus.SKIPPED_FALLBACK, result);
        verify(javaMailSender, never()).send(org.mockito.ArgumentMatchers.any(MimeMessage.class));
    }
}
