package com.plura.plurabackend.core.auth;

import com.plura.plurabackend.core.user.model.User;

/**
 * Interfaz que define el contrato para enviar notificaciones de verificacion
 * de numero de telefono.
 *
 * <p>Las implementaciones concretas pueden enviar el codigo por SMS real
 * o simplemente registrarlo en logs con fines de desarrollo
 * (ver {@link LoggingPhoneVerificationNotificationSender}).</p>
 */
public interface PhoneVerificationNotificationSender {

    /**
     * Envia el codigo de verificacion de telefono al usuario.
     *
     * @param notification objeto que contiene el usuario, el numero de telefono y el codigo de verificacion
     */
    void sendVerificationCode(PhoneVerificationNotification notification);

    /**
     * Record inmutable que encapsula los datos necesarios para enviar
     * una notificacion de verificacion de telefono.
     *
     * @param user        el usuario al que se le enviara la verificacion
     * @param phoneNumber el numero de telefono destino
     * @param code        el codigo de verificacion generado
     */
    record PhoneVerificationNotification(
        User user,
        String phoneNumber,
        String code
    ) {}
}
