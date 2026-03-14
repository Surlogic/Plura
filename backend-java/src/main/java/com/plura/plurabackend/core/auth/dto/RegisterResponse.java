package com.plura.plurabackend.core.auth.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Data;

/**
 * DTO de respuesta tras un registro exitoso de usuario.
 * Contiene los tokens de autenticacion y los datos del usuario creado.
 * Los campos nulos se omiten en la serializacion JSON.
 */
@Data
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class RegisterResponse {
    /** JWT de acceso (puede ser null si se entrega via cookie HttpOnly). */
    private String accessToken;
    /** Refresh token expuesto solo para clientes que lo requieren en el cuerpo (ej: mobile). */
    private String refreshToken;
    /** Datos publicos del usuario recien creado. */
    private UserResponse user;
    /** Informacion de la sesion creada automaticamente tras el registro. */
    private AuthSessionResponse session;
}
