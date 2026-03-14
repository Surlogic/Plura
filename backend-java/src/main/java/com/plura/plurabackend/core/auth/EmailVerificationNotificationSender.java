package com.plura.plurabackend.core.auth;

import com.plura.plurabackend.core.user.model.User;

/**
 * Interfaz que define el contrato para enviar notificaciones de verificacion de email.
 *
 * <p>Las implementaciones concretas pueden enviar el codigo por correo electronico real
 * (ver {@link EmailVerificationEmailNotificationSender}) o simplemente registrarlo
 * en logs con fines de desarrollo (ver {@link LoggingEmailVerificationNotificationSender}).</p>
 */
public interface EmailVerificationNotificationSender {

    /**
     * Envia el codigo de verificacion de email al usuario indicado en la notificacion.
     *
     * @param notification objeto que contiene el usuario, el email destino y el codigo de verificacion
     */
    void sendVerificationCode(EmailVerificationNotification notification);

    /**
     * Record inmutable que encapsula los datos necesarios para enviar
     * una notificacion de verificacion de email.
     *
     * @param user  el usuario al que se le enviara la verificacion
     * @param email la direccion de correo electronico destino
     * @param code  el codigo de verificacion generado
     */
    record EmailVerificationNotification(
        User user,
        String email,
        String code
    ) {}
}
