package com.plura.plurabackend.auth.dto;

import lombok.Data;

/**
 * DTO de solicitud para renovar una sesion usando un refresh token.
 * Permite obtener un nuevo access token sin requerir que el usuario inicie sesion nuevamente.
 */
@Data
public class RefreshSessionRequest {
    /** Refresh token valido que sera intercambiado por nuevos tokens. */
    private String refreshToken;
}
