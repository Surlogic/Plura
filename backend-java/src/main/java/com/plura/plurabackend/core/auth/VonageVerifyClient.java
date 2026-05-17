package com.plura.plurabackend.core.auth;

/**
 * Frontera minima contra Vonage Verify para no acoplar el dominio auth al cliente HTTP concreto.
 */
public interface VonageVerifyClient {

    String startSmsVerification(String phoneNumber);

    boolean checkSmsVerification(String requestId, String code);
}
