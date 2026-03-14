package com.plura.plurabackend.core.auth;

import com.plura.plurabackend.core.user.model.User;

/**
 * Interfaz que define el contrato para enviar notificaciones de restablecimiento de contrasena.
 *
 * <p>Las implementaciones concretas pueden enviar el enlace por correo electronico real
 * (ver {@link PasswordResetEmailNotificationSender}) o simplemente registrarlo
 * en logs con fines de desarrollo (ver {@link LoggingPasswordResetNotificationSender}).</p>
 */
public interface PasswordResetNotificationSender {

    /**
     * Envia la notificacion de restablecimiento de contrasena al usuario.
     *
     * @param notification objeto que contiene el usuario, la URL de restablecimiento y el token
     */
    void sendPasswordReset(PasswordResetNotification notification);

    /**
     * Record inmutable que encapsula los datos necesarios para enviar
     * una notificacion de restablecimiento de contrasena.
     *
     * @param user     el usuario que solicito el restablecimiento
     * @param resetUrl la URL completa que el usuario debe visitar para restablecer su contrasena
     * @param rawToken el token en texto plano incluido en la URL (se usa para redaccion en logs)
     */
    record PasswordResetNotification(
        User user,
        String resetUrl,
        String rawToken
    ) {}
}
