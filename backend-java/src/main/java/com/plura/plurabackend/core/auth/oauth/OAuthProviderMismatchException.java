package com.plura.plurabackend.core.auth.oauth;

/**
 * Excepcion que se lanza cuando un usuario intenta autenticarse con un proveedor
 * OAuth diferente al que uso originalmente para registrarse.
 *
 * <p>Por ejemplo, si un usuario se registro con Google y luego intenta iniciar
 * sesion con Apple usando el mismo email, se lanza esta excepcion para evitar
 * conflictos de identidad y mantener la integridad de las cuentas.</p>
 */
public class OAuthProviderMismatchException extends RuntimeException {

    /**
     * Crea una nueva instancia de la excepcion con un mensaje predeterminado
     * indicando que el email ya esta vinculado a un proveedor diferente.
     */
    public OAuthProviderMismatchException() {
        super("Email already linked to a different provider");
    }
}
