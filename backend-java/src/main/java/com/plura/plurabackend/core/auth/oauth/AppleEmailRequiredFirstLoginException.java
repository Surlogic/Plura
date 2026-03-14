package com.plura.plurabackend.core.auth.oauth;

/**
 * Excepcion que se lanza cuando Apple no proporciona el email del usuario
 * durante el primer inicio de sesion.
 *
 * <p>Apple solo envia el email en la primera autorizacion del usuario.
 * Si el usuario ya autorizo la aplicacion previamente y se intenta hacer
 * un primer login en el sistema, Apple no incluira el email en el token,
 * lo que impide crear la cuenta. En ese caso se lanza esta excepcion para
 * indicar que el usuario debe completar el flujo de Apple que incluye el email.</p>
 */
public class AppleEmailRequiredFirstLoginException extends RuntimeException {

    /**
     * Crea una nueva instancia de la excepcion con un mensaje predeterminado
     * indicando que Apple no proporciono el email y que el usuario debe
     * completar el flujo de primer login que incluye el email.
     */
    public AppleEmailRequiredFirstLoginException() {
        super("Apple did not provide email. Please complete first login from Apple flow that includes email.");
    }
}
