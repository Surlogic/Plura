package com.plura.plurabackend.auth.oauth;

public class OAuthProviderMismatchException extends RuntimeException {

    public OAuthProviderMismatchException() {
        super("Email already linked to a different provider");
    }
}
