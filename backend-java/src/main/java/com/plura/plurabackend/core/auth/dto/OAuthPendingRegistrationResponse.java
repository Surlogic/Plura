package com.plura.plurabackend.core.auth.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

/**
 * Respuesta para OAuth usado como verificacion de identidad antes de terminar un registro.
 */
@Data
@AllArgsConstructor
public class OAuthPendingRegistrationResponse {
    private boolean oauthRegistrationPending;
    private String oauthRegistrationToken;
    private UserResponse user;
}
