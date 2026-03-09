package com.plura.plurabackend.auth;

import org.springframework.http.HttpStatus;

/**
 * Excepción personalizada para errores de autenticación/autorización.
 * Encapsula un código HTTP, un código de error interno y un mensaje descriptivo.
 * Se usa para devolver respuestas de error estructuradas desde los servicios de auth.
 */
public class AuthApiException extends RuntimeException {

    /** Código de estado HTTP que se devolverá al cliente (ej: 401, 403, 409) */
    private final HttpStatus status;

    /** Código de error interno para identificar el tipo de fallo (ej: "CHALLENGE_REQUIRED") */
    private final String errorCode;

    /**
     * Crea una nueva excepción de autenticación.
     * @param status código HTTP de la respuesta
     * @param errorCode código de error interno para el frontend
     * @param message mensaje descriptivo del error
     */
    public AuthApiException(HttpStatus status, String errorCode, String message) {
        super(message);
        this.status = status;
        this.errorCode = errorCode;
    }

    public HttpStatus getStatus() {
        return status;
    }

    public String getErrorCode() {
        return errorCode;
    }
}
