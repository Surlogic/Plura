package com.plura.plurabackend.auth;

import org.springframework.http.HttpStatus;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Implementacion concreta que envia el codigo de verificacion de email
 * mediante el servicio de correo transaccional.
 *
 * <p>Utiliza {@link TransactionalEmailService} para el envio real del correo
 * y {@link PluraEmailTemplateService} para construir el contenido del mensaje
 * a partir de una plantilla predefinida.</p>
 */
@Component
public class EmailVerificationEmailNotificationSender implements EmailVerificationNotificationSender {

    private final TransactionalEmailService transactionalEmailService;
    private final PluraEmailTemplateService templateService;

    /** Tiempo de vida del codigo de verificacion en minutos (configurable, por defecto 15). */
    private final long ttlMinutes;

    /**
     * Constructor con inyeccion de dependencias.
     *
     * @param transactionalEmailService servicio encargado del envio de correos transaccionales
     * @param templateService           servicio que construye las plantillas de correo de Plura
     * @param ttlMinutes                minutos de validez del codigo, leido desde la propiedad
     *                                  {@code app.auth.email-verification.ttl-minutes} (por defecto 15)
     */
    public EmailVerificationEmailNotificationSender(
        TransactionalEmailService transactionalEmailService,
        PluraEmailTemplateService templateService,
        @Value("${app.auth.email-verification.ttl-minutes:15}") long ttlMinutes
    ) {
        this.transactionalEmailService = transactionalEmailService;
        this.templateService = templateService;
        this.ttlMinutes = ttlMinutes;
    }

    /**
     * Envia el codigo de verificacion de email al usuario.
     *
     * <p>Si la notificacion, el usuario o el email son nulos, el metodo retorna
     * sin hacer nada. En caso de que el servicio de correo no pueda entregar
     * el mensaje, se lanza una {@link AuthApiException} con estado 503.</p>
     *
     * @param notification datos de la notificacion que incluyen usuario, email y codigo
     * @throws AuthApiException si el correo no pudo ser entregado
     */
    @Override
    public void sendVerificationCode(EmailVerificationNotification notification) {
        // Validacion de parametros: se omite el envio si faltan datos esenciales
        if (notification == null || notification.user() == null || notification.email() == null) {
            return;
        }
        // Construye el correo a partir de la plantilla y lo envia
        TransactionalEmailService.DeliveryStatus deliveryStatus = transactionalEmailService.send(
            templateService.buildEmailVerificationEmail(
                notification.email(),
                notification.user().getFullName(),
                notification.code(),
                ttlMinutes
            )
        );
        // Con SMTP deshabilitado permitimos fallback local; solo fallas reales deben cortar el flujo.
        if (deliveryStatus == TransactionalEmailService.DeliveryStatus.FAILED) {
            throw new AuthApiException(
                HttpStatus.SERVICE_UNAVAILABLE,
                "EMAIL_DELIVERY_UNAVAILABLE",
                "No pudimos enviar el código de verificación por email. Intentá de nuevo más tarde."
            );
        }
    }
}
