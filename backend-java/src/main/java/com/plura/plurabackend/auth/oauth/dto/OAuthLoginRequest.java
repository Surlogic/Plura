package com.plura.plurabackend.auth.oauth.dto;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * DTO (Data Transfer Object) que representa la solicitud de login o registro
 * mediante un proveedor OAuth (Google o Apple).
 *
 * <p>Contiene el proveedor, el token o codigo de autorizacion, y datos
 * opcionales como el rol deseado y la accion de autenticacion. La validacion
 * asegura que se envie al menos un token o un codigo de autorizacion.</p>
 */
@Data
public class OAuthLoginRequest {

    /** Nombre del proveedor OAuth (ej: "google", "apple"). Obligatorio, maximo 20 caracteres. */
    @NotBlank
    @Size(max = 20)
    private String provider;

    /** Token de identidad (id_token) o de acceso proporcionado por el proveedor. Maximo 8192 caracteres. */
    @Size(max = 8192)
    private String token;

    /** Codigo de autorizacion obtenido del flujo OAuth con PKCE. Maximo 8192 caracteres. */
    @Size(max = 8192)
    private String authorizationCode;

    /** Verificador PKCE utilizado para intercambiar el codigo de autorizacion. Maximo 1024 caracteres. */
    @Size(max = 1024)
    private String codeVerifier;

    /** URI de redireccion utilizada en el flujo OAuth. Maximo 2048 caracteres. */
    @Size(max = 2048)
    private String redirectUri;

    /** Rol deseado por el usuario al registrarse: "USER" o "PROFESSIONAL". */
    @Pattern(regexp = "^(USER|PROFESSIONAL)$", message = "desiredRole inválido")
    private String desiredRole;

    /** Accion de autenticacion: "LOGIN" para iniciar sesion, "REGISTER" para registrarse. */
    @Pattern(regexp = "^(LOGIN|REGISTER)$", message = "authAction inválido")
    private String authAction;

    /**
     * Validacion personalizada que verifica que se haya proporcionado
     * al menos un token o un codigo de autorizacion.
     *
     * @return true si se proporciono token o authorizationCode; false en caso contrario
     */
    @AssertTrue(message = "Debe enviar token o authorizationCode")
    public boolean isTokenOrCodePresent() {
        return hasText(token) || hasText(authorizationCode);
    }

    private boolean hasText(String value) {
        return value != null && !value.trim().isEmpty();
    }
}
