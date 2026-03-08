package com.plura.plurabackend.auth;

import org.springframework.http.HttpStatus;

public class AuthApiException extends RuntimeException {

    private final HttpStatus status;
    private final String errorCode;

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
