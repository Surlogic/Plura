package com.plura.plurabackend.auth.dto;

import lombok.Data;

/**
 * DTO de solicitud para restablecer la contrasena usando un token de recuperacion.
 * Se utiliza despues de que el usuario haya solicitado recuperar su contrasena via email.
 */
@Data
public class ResetPasswordRequest {

    /** Token de restablecimiento recibido por email. */
    private String token;

    /** Nueva contrasena que reemplazara a la anterior. */
    private String newPassword;
}
