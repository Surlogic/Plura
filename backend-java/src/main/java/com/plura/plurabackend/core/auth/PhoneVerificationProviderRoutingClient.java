package com.plura.plurabackend.core.auth;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Router de proveedor OTP SMS. Mantiene Vonage como opcion y permite cambiar por env.
 */
@Component
public class PhoneVerificationProviderRoutingClient implements VonageVerifyClient {

    private final VonageVerifyHttpClient vonageVerifyHttpClient;
    private final FirebasePhoneVerificationClient firebasePhoneVerificationClient;
    private final String provider;

    public PhoneVerificationProviderRoutingClient(
        VonageVerifyHttpClient vonageVerifyHttpClient,
        FirebasePhoneVerificationClient firebasePhoneVerificationClient,
        @Value("${app.auth.phone-verification.provider:vonage}") String provider
    ) {
        this.vonageVerifyHttpClient = vonageVerifyHttpClient;
        this.firebasePhoneVerificationClient = firebasePhoneVerificationClient;
        this.provider = provider == null || provider.isBlank() ? "vonage" : provider.trim().toLowerCase();
    }

    @Override
    public String startSmsVerification(String phoneNumber) {
        return switch (provider) {
            case "firebase" -> firebasePhoneVerificationClient.startSmsVerification(phoneNumber);
            case "vonage" -> vonageVerifyHttpClient.startSmsVerification(phoneNumber);
            default -> throw new IllegalStateException(
                "Proveedor OTP telefonico no soportado: " + provider + ". Usar 'vonage' o 'firebase'."
            );
        };
    }

    @Override
    public boolean checkSmsVerification(String requestId, String code) {
        return switch (provider) {
            case "firebase" -> firebasePhoneVerificationClient.checkSmsVerification(requestId, code);
            case "vonage" -> vonageVerifyHttpClient.checkSmsVerification(requestId, code);
            default -> throw new IllegalStateException(
                "Proveedor OTP telefonico no soportado: " + provider + ". Usar 'vonage' o 'firebase'."
            );
        };
    }
}
