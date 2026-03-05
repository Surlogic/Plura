package com.plura.plurabackend.auth.oauth;

public class AppleEmailRequiredFirstLoginException extends RuntimeException {

    public AppleEmailRequiredFirstLoginException() {
        super("Apple did not provide email. Please complete first login from Apple flow that includes email.");
    }
}
