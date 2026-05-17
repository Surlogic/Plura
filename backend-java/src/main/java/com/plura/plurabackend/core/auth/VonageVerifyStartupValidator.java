package com.plura.plurabackend.core.auth;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

/**
 * Falla el arranque si producto exige verificacion telefonica real pero Vonage Verify no esta listo.
 */
@Component
public class VonageVerifyStartupValidator implements ApplicationRunner {

    private final boolean registrationPhoneVerificationRequired;
    private final boolean vonageVerifyEnabled;
    private final String apiKey;
    private final String apiSecret;

    public VonageVerifyStartupValidator(
        @Value("${app.auth.registration-phone-verification.required:false}") boolean registrationPhoneVerificationRequired,
        @Value("${app.auth.vonage-verify.enabled:false}") boolean vonageVerifyEnabled,
        @Value("${app.auth.vonage-verify.api-key:}") String apiKey,
        @Value("${app.auth.vonage-verify.api-secret:}") String apiSecret
    ) {
        this.registrationPhoneVerificationRequired = registrationPhoneVerificationRequired;
        this.vonageVerifyEnabled = vonageVerifyEnabled;
        this.apiKey = apiKey;
        this.apiSecret = apiSecret;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!registrationPhoneVerificationRequired) {
            return;
        }
        if (!vonageVerifyEnabled || isBlank(apiKey) || isBlank(apiSecret)) {
            throw new IllegalStateException(
                "AUTH_REGISTRATION_PHONE_VERIFICATION_REQUIRED=true exige VONAGE_VERIFY_ENABLED=true, VONAGE_API_KEY y VONAGE_API_SECRET"
            );
        }
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isBlank();
    }
}
