package com.plura.plurabackend.core.auth;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

import java.util.Optional;
import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.Test;
import org.springframework.mail.javamail.JavaMailSenderImpl;

class ResendSmtpSmokeTest {

    @Test
    void sendsRealEmailVerificationTemplateThroughConfiguredSmtpProvider() {
        Assumptions.assumeTrue(isEnabled("RUN_REAL_EMAIL_SMOKE_TEST"), "Manual SMTP smoke test disabled");

        String toAddress = requiredEnv("REAL_EMAIL_SMOKE_TEST_TO");
        String host = requiredEnv("EMAIL_SMTP_HOST");
        String fromAddress = requiredEnv("EMAIL_FROM_ADDRESS");

        JavaMailSenderImpl javaMailSender = new JavaMailSenderImpl();
        javaMailSender.setHost(host);
        javaMailSender.setPort(Integer.parseInt(optionalEnv("EMAIL_SMTP_PORT").orElse("587")));
        javaMailSender.setUsername(requiredEnv("EMAIL_SMTP_USERNAME"));
        javaMailSender.setPassword(requiredEnv("EMAIL_SMTP_PASSWORD"));
        javaMailSender.setDefaultEncoding("UTF-8");

        javaMailSender.getJavaMailProperties().put("mail.smtp.auth", optionalEnv("EMAIL_SMTP_AUTH").orElse("true"));
        javaMailSender.getJavaMailProperties().put(
            "mail.smtp.starttls.enable",
            optionalEnv("EMAIL_SMTP_STARTTLS_ENABLE").orElse("true")
        );
        javaMailSender.getJavaMailProperties().put(
            "mail.smtp.connectiontimeout",
            optionalEnv("EMAIL_SMTP_CONNECTION_TIMEOUT_MS").orElse("5000")
        );
        javaMailSender.getJavaMailProperties().put(
            "mail.smtp.timeout",
            optionalEnv("EMAIL_SMTP_TIMEOUT_MS").orElse("10000")
        );
        javaMailSender.getJavaMailProperties().put(
            "mail.smtp.writetimeout",
            optionalEnv("EMAIL_SMTP_WRITE_TIMEOUT_MS").orElse("10000")
        );

        String fromName = optionalEnv("EMAIL_FROM_NAME").orElse("Plura");
        String replyTo = optionalEnv("EMAIL_REPLY_TO").orElse("");
        boolean deliveryEnabled = Boolean.parseBoolean(optionalEnv("EMAIL_DELIVERY_ENABLED").orElse("false"));

        SmtpTransactionalEmailService emailService = new SmtpTransactionalEmailService(
            javaMailSender,
            deliveryEnabled,
            host,
            Boolean.parseBoolean(optionalEnv("EMAIL_SMTP_AUTH").orElse("true")),
            requiredEnv("EMAIL_SMTP_USERNAME"),
            requiredEnv("EMAIL_SMTP_PASSWORD"),
            fromAddress,
            fromName,
            replyTo
        );

        PluraEmailTemplateService templateService = new PluraEmailTemplateService(
            optionalEnv("APP_BRAND_NAME").orElse("Plura"),
            optionalEnv("APP_PUBLIC_WEB_URL").orElse("http://localhost:3002")
        );

        TransactionalEmailService.TransactionalEmailMessage message = templateService.buildEmailVerificationEmail(
            toAddress,
            "German",
            "482731",
            15
        );

        assertNotNull(message);
        assertEquals("email_verification", message.templateKey());
        assertEquals(
            TransactionalEmailService.DeliveryStatus.SENT,
            emailService.send(message),
            "SMTP provider did not accept the email"
        );
    }

    private static String requiredEnv(String key) {
        return optionalEnv(key)
            .filter(value -> !value.isBlank())
            .orElseThrow(() -> new IllegalStateException("Missing required environment variable: " + key));
    }

    private static Optional<String> optionalEnv(String key) {
        return Optional.ofNullable(System.getenv(key)).map(String::trim);
    }

    private static boolean isEnabled(String key) {
        return optionalEnv(key).map("true"::equalsIgnoreCase).orElse(false);
    }
}
