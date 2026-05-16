package com.plura.plurabackend.core.auth;

/**
 * Frontera minima contra Twilio Verify para no acoplar el dominio auth al cliente HTTP concreto.
 */
public interface TwilioVerifyClient {

    void startSmsVerification(String phoneNumber);

    boolean checkSmsVerification(String phoneNumber, String code);
}
