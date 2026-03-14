package com.plura.plurabackend.core.auth;

import jakarta.mail.internet.MimeMessage;
import java.nio.charset.StandardCharsets;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
public class SmtpTransactionalEmailService implements TransactionalEmailService {

    private static final Logger LOGGER = LoggerFactory.getLogger(SmtpTransactionalEmailService.class);

    private final JavaMailSender javaMailSender;
    private final boolean deliveryEnabled;
    private final String mailHost;
    private final boolean smtpAuthEnabled;
    private final String mailUsername;
    private final String mailPassword;
    private final String fromAddress;
    private final String fromName;
    private final String replyTo;

    public SmtpTransactionalEmailService(
        JavaMailSender javaMailSender,
        @Value("${app.email.delivery-enabled:false}") boolean deliveryEnabled,
        @Value("${spring.mail.host:}") String mailHost,
        @Value("${spring.mail.properties.mail.smtp.auth:true}") boolean smtpAuthEnabled,
        @Value("${spring.mail.username:}") String mailUsername,
        @Value("${spring.mail.password:}") String mailPassword,
        @Value("${app.email.from-address:}") String fromAddress,
        @Value("${app.email.from-name:Plura}") String fromName,
        @Value("${app.email.reply-to:}") String replyTo
    ) {
        this.javaMailSender = javaMailSender;
        this.deliveryEnabled = deliveryEnabled;
        this.mailHost = mailHost;
        this.smtpAuthEnabled = smtpAuthEnabled;
        this.mailUsername = mailUsername;
        this.mailPassword = mailPassword;
        this.fromAddress = fromAddress;
        this.fromName = fromName;
        this.replyTo = replyTo;
    }

    @Override
    public DeliveryStatus send(TransactionalEmailMessage message) {
        if (message == null || isBlank(message.toAddress()) || isBlank(message.subject())) {
            return DeliveryStatus.FAILED;
        }
        if (!isConfiguredForDelivery()) {
            logFallback(message);
            return DeliveryStatus.SKIPPED_FALLBACK;
        }

        try {
            MimeMessage mimeMessage = javaMailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(
                mimeMessage,
                MimeMessageHelper.MULTIPART_MODE_MIXED_RELATED,
                StandardCharsets.UTF_8.name()
            );
            helper.setTo(message.toAddress().trim());
            helper.setSubject(message.subject().trim());
            helper.setFrom(fromAddress.trim(), defaultString(fromName, "Plura").trim());
            if (!isBlank(replyTo)) {
                helper.setReplyTo(replyTo.trim());
            }
            helper.setText(defaultString(message.textBody(), ""), defaultString(message.htmlBody(), ""));
            javaMailSender.send(mimeMessage);
            return DeliveryStatus.SENT;
        } catch (MailException | jakarta.mail.MessagingException | java.io.UnsupportedEncodingException exception) {
            LOGGER.error(
                "Fallo el envio de email transaccional {} hacia {}: {}",
                defaultString(message.templateKey(), "unknown"),
                maskEmail(message.toAddress()),
                exception.getMessage()
            );
            return DeliveryStatus.FAILED;
        }
    }

    private boolean isConfiguredForDelivery() {
        return deliveryEnabled
            && !isBlank(mailHost)
            && !isBlank(fromAddress)
            && (!smtpAuthEnabled || (!isBlank(mailUsername) && !isBlank(mailPassword)));
    }

    private void logFallback(TransactionalEmailMessage message) {
        LOGGER.info(
            "Email transaccional {} hacia {} omitido. Delivery SMTP deshabilitado o incompleto; fallback local activo.",
            defaultString(message.templateKey(), "unknown"),
            maskEmail(message.toAddress())
        );
    }

    private String maskEmail(String email) {
        if (isBlank(email)) {
            return "desconocido";
        }
        int atIndex = email.indexOf('@');
        if (atIndex <= 1) {
            return "***" + email.substring(Math.max(atIndex, 0));
        }
        return email.substring(0, 1) + "***" + email.substring(atIndex);
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isBlank();
    }

    private String defaultString(String value, String fallback) {
        return value == null ? fallback : value;
    }
}
