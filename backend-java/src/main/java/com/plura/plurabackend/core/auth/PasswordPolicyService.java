package com.plura.plurabackend.core.auth;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

/**
 * PasswordPolicyService es un servicio de negocio del modulo autenticacion.
 * Responsabilidad: coordinar reglas de negocio, validaciones, persistencia e integraciones del caso de uso.
 * Mantiene separada esta responsabilidad para que el resto del backend use una API clara.
 * Foco funcional: contrasenas, servicios.
 */
@Service
public class PasswordPolicyService {

    private static final int MIN_PASSWORD_LENGTH = 8;
    private static final int MAX_PASSWORD_LENGTH = 100;

    /**
     * Valida new contrasena y lanza un error controlado si no cumple el contrato.
     * Esta separacion hace explicita la regla de seguridad o negocio que protege el flujo.
     */
    public void validateNewPassword(String rawPassword) {
        if (rawPassword == null) {
            throw new AuthApiException(HttpStatus.BAD_REQUEST, "POLICY_INVALID", "La contraseña es obligatoria.");
        }
        if (rawPassword.length() < MIN_PASSWORD_LENGTH) {
            throw new AuthApiException(
                HttpStatus.BAD_REQUEST,
                "POLICY_INVALID",
                "La contraseña debe tener al menos 8 caracteres."
            );
        }
        if (rawPassword.length() > MAX_PASSWORD_LENGTH) {
            throw new AuthApiException(
                HttpStatus.BAD_REQUEST,
                "POLICY_INVALID",
                "La contraseña no puede superar los 100 caracteres."
            );
        }
    }
}
