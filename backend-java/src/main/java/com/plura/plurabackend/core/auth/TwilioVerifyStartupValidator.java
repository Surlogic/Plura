package com.plura.plurabackend.core.auth;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

/**
 * Falla el arranque si producto exige verificacion telefonica real pero Twilio Verify no esta listo.
 */
@Component
public class TwilioVerifyStartupValidator implements ApplicationRunner {

    private final boolean registrationPhoneVerificationRequired;
    private final boolean twilioVerifyEnabled;
    private final String accountSid;
    private final String authToken;
    private final String serviceSid;

    public TwilioVerifyStartupValidator(
        @Value("${app.auth.registration-phone-verification.required:false}") boolean registrationPhoneVerificationRequired,
        @Value("${app.auth.twilio-verify.enabled:false}") boolean twilioVerifyEnabled,
        @Value("${app.auth.twilio-verify.account-sid:}") String accountSid,
        @Value("${app.auth.twilio-verify.auth-token:}") String authToken,
        @Value("${app.auth.twilio-verify.service-sid:}") String serviceSid
    ) {
        this.registrationPhoneVerificationRequired = registrationPhoneVerificationRequired;
        this.twilioVerifyEnabled = twilioVerifyEnabled;
        this.accountSid = accountSid;
        this.authToken = authToken;
        this.serviceSid = serviceSid;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!registrationPhoneVerificationRequired) {
            return;
        }
        if (!twilioVerifyEnabled || isBlank(accountSid) || isBlank(authToken) || isBlank(serviceSid)) {
            throw new IllegalStateException(
                "AUTH_REGISTRATION_PHONE_VERIFICATION_REQUIRED=true exige TWILIO_VERIFY_ENABLED=true, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN y TWILIO_VERIFY_SERVICE_SID"
            );
        }
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isBlank();
    }
}
