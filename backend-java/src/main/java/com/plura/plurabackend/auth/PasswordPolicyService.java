package com.plura.plurabackend.auth;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public class PasswordPolicyService {

    private static final int MIN_PASSWORD_LENGTH = 8;
    private static final int MAX_PASSWORD_LENGTH = 100;

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
