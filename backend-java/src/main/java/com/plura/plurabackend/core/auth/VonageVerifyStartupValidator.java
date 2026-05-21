package com.plura.plurabackend.core.auth;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

/**
 * Falla el arranque si producto exige verificacion telefonica real pero el proveedor OTP no esta listo.
 */
@Component
public class VonageVerifyStartupValidator implements ApplicationRunner {

    private final boolean registrationPhoneVerificationRequired;
    private final String provider;
    private final boolean vonageVerifyEnabled;
    private final String vonageApiKey;
    private final String vonageApiSecret;
    private final boolean firebasePhoneVerificationEnabled;
    private final String firebaseApiKey;
    private final String firebaseRecaptchaToken;
    private final String firebasePlayIntegrityToken;
    private final String firebaseCaptchaResponse;

    public VonageVerifyStartupValidator(
        @Value("${app.auth.registration-phone-verification.required:false}") boolean registrationPhoneVerificationRequired,
        @Value("${app.auth.phone-verification.provider:vonage}") String provider,
        @Value("${app.auth.vonage-verify.enabled:false}") boolean vonageVerifyEnabled,
        @Value("${app.auth.vonage-verify.api-key:}") String vonageApiKey,
        @Value("${app.auth.vonage-verify.api-secret:}") String vonageApiSecret,
        @Value("${app.auth.firebase-phone-verification.enabled:false}") boolean firebasePhoneVerificationEnabled,
        @Value("${app.auth.firebase-phone-verification.api-key:}") String firebaseApiKey,
        @Value("${app.auth.firebase-phone-verification.recaptcha-token:}") String firebaseRecaptchaToken,
        @Value("${app.auth.firebase-phone-verification.play-integrity-token:}") String firebasePlayIntegrityToken,
        @Value("${app.auth.firebase-phone-verification.captcha-response:}") String firebaseCaptchaResponse
    ) {
        this.registrationPhoneVerificationRequired = registrationPhoneVerificationRequired;
        this.provider = provider == null || provider.isBlank() ? "vonage" : provider.trim().toLowerCase();
        this.vonageVerifyEnabled = vonageVerifyEnabled;
        this.vonageApiKey = vonageApiKey;
        this.vonageApiSecret = vonageApiSecret;
        this.firebasePhoneVerificationEnabled = firebasePhoneVerificationEnabled;
        this.firebaseApiKey = firebaseApiKey;
        this.firebaseRecaptchaToken = firebaseRecaptchaToken;
        this.firebasePlayIntegrityToken = firebasePlayIntegrityToken;
        this.firebaseCaptchaResponse = firebaseCaptchaResponse;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!registrationPhoneVerificationRequired) {
            return;
        }
        switch (provider) {
            case "vonage" -> validateVonage();
            case "firebase" -> validateFirebase();
            default -> throw new IllegalStateException(
                "AUTH_PHONE_VERIFICATION_PROVIDER debe ser 'vonage' o 'firebase'"
            );
        }
    }

    private void validateVonage() {
        if (!vonageVerifyEnabled || isBlank(vonageApiKey) || isBlank(vonageApiSecret)) {
            throw new IllegalStateException(
                "AUTH_PHONE_VERIFICATION_PROVIDER=vonage exige VONAGE_VERIFY_ENABLED=true, VONAGE_API_KEY y VONAGE_API_SECRET"
            );
        }
    }

    private void validateFirebase() {
        if (!firebasePhoneVerificationEnabled || isBlank(firebaseApiKey)) {
            throw new IllegalStateException(
                "AUTH_PHONE_VERIFICATION_PROVIDER=firebase exige FIREBASE_PHONE_VERIFICATION_ENABLED=true y FIREBASE_PHONE_VERIFICATION_API_KEY"
            );
        }
        if (isBlank(firebaseRecaptchaToken) && isBlank(firebasePlayIntegrityToken) && isBlank(firebaseCaptchaResponse)) {
            throw new IllegalStateException(
                "AUTH_PHONE_VERIFICATION_PROVIDER=firebase exige FIREBASE_PHONE_VERIFICATION_RECAPTCHA_TOKEN, FIREBASE_PHONE_VERIFICATION_PLAY_INTEGRITY_TOKEN o FIREBASE_PHONE_VERIFICATION_CAPTCHA_RESPONSE"
            );
        }
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isBlank();
    }
}
