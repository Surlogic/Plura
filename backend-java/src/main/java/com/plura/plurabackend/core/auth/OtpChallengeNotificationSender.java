package com.plura.plurabackend.core.auth;

import com.plura.plurabackend.core.auth.model.OtpChallengeChannel;
import com.plura.plurabackend.core.auth.model.OtpChallengePurpose;
import com.plura.plurabackend.core.user.model.User;

/**
 * OtpChallengeNotificationSender es un contrato interno del modulo autenticacion.
 * Responsabilidad: definir una frontera estable para que otros modulos no dependan de detalles concretos.
 * Mantiene separada esta responsabilidad para que el resto del backend use una API clara.
 * Foco funcional: notificaciones, OTP.
 */
public interface OtpChallengeNotificationSender {

    void sendChallenge(OtpChallengeNotification notification);

    record OtpChallengeNotification(
        User user,
        OtpChallengePurpose purpose,
        OtpChallengeChannel channel,
        String destination,
        String code
    ) {}
}
