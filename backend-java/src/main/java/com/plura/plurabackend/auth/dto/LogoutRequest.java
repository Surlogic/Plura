package com.plura.plurabackend.auth.dto;

import lombok.Data;

/**
 * DTO de solicitud para cerrar sesion.
 * Contiene el refresh token que sera revocado para invalidar la sesion.
 */
@Data
public class LogoutRequest {
    /** Refresh token de la sesion que se desea cerrar. */
    private String refreshToken;
}
