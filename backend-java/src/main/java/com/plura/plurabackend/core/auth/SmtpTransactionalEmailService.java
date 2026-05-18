package com.plura.plurabackend.core.auth;

import com.plura.plurabackend.core.observability.AppErrorRecorder;
import jakarta.mail.internet.MimeMessage;
import java.nio.charset.StandardCharsets;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

/**
 * SmtpTransactionalEmailService es un servicio de negocio del modulo autenticacion.
 * Responsabilidad: coordinar reglas de negocio, validaciones, persistencia e integraciones del caso de uso.
 * Colabora con: javaMailSender, deliveryEnabled, mailHost, smtpAuthEnabled, entre otros.
 * Foco funcional: servicios, email transaccional.
 */
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
    private final AppErrorRecorder appErrorRecorder;

    @Autowired
    public SmtpTransactionalEmailService(
        JavaMailSender javaMailSender,
        @Value("${app.email.delivery-enabled:false}") boolean deliveryEnabled,
        @Value("${spring.mail.host:}") String mailHost,
        @Value("${spring.mail.properties.mail.smtp.auth:true}") boolean smtpAuthEnabled,
        @Value("${spring.mail.username:}") String mailUsername,
        @Value("${spring.mail.password:}") String mailPassword,
        @Value("${app.email.from-address:}") String fromAddress,
        @Value("${app.email.from-name:Plura}") String fromName,
        @Value("${app.email.reply-to:}") String replyTo,
        AppErrorRecorder appErrorRecorder
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
        this.appErrorRecorder = appErrorRecorder;
    }

    public SmtpTransactionalEmailService(
        JavaMailSender javaMailSender,
        boolean deliveryEnabled,
        String mailHost,
        boolean smtpAuthEnabled,
        String mailUsername,
        String mailPassword,
        String fromAddress,
        String fromName,
        String replyTo
    ) {
        this(
            javaMailSender,
            deliveryEnabled,
            mailHost,
            smtpAuthEnabled,
            mailUsername,
            mailPassword,
            fromAddress,
            fromName,
            replyTo,
            null
        );
    }

    /**
     * Envia send mediante el canal configurado.
     */
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
            if (appErrorRecorder != null) {
                appErrorRecorder.recordBackgroundException(
                    exception,
                    "auth.transactional-email.send",
                    java.util.Map.of(
                        "templateKey", defaultString(message.templateKey(), "unknown"),
                        "recipient", maskEmail(message.toAddress())
                    )
                );
            }
            return DeliveryStatus.FAILED;
        }
    }

    /**
     * Evalua is configured for delivery y devuelve una decision booleana para el llamador.
     */
    private boolean isConfiguredForDelivery() {
        return deliveryEnabled
            && !isBlank(mailHost)
            && !isBlank(fromAddress)
            && (!smtpAuthEnabled || (!isBlank(mailUsername) && !isBlank(mailPassword)));
    }

    /**
     * Ejecuta la logica de log fallback manteniendola encapsulada en este componente.
     */
    private void logFallback(TransactionalEmailMessage message) {
        LOGGER.info(
            "Email transaccional {} hacia {} omitido. Delivery SMTP deshabilitado o incompleto; fallback local activo.",
            defaultString(message.templateKey(), "unknown"),
            maskEmail(message.toAddress())
        );
    }

    /**
     * Ejecuta la logica de mask email manteniendola encapsulada en este componente.
     */
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

    /**
     * Evalua is blank y devuelve una decision booleana para el llamador.
     */
    private boolean isBlank(String value) {
        return value == null || value.trim().isBlank();
    }

    /**
     * Ejecuta la logica de default string manteniendola encapsulada en este componente.
     */
    private String defaultString(String value, String fallback) {
        return value == null ? fallback : value;
    }
}
