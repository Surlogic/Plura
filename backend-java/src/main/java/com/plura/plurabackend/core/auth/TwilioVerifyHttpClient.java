package com.plura.plurabackend.core.auth;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

/**
 * Cliente HTTP real para Twilio Verify v2.
 */
@Component
public class TwilioVerifyHttpClient implements TwilioVerifyClient {

    private final RestClient restClient;
    private final boolean enabled;
    private final String accountSid;
    private final String authToken;
    private final String serviceSid;

    public TwilioVerifyHttpClient(
        @Value("${app.auth.twilio-verify.enabled:false}") boolean enabled,
        @Value("${app.auth.twilio-verify.base-url:https://verify.twilio.com}") String baseUrl,
        @Value("${app.auth.twilio-verify.account-sid:}") String accountSid,
        @Value("${app.auth.twilio-verify.auth-token:}") String authToken,
        @Value("${app.auth.twilio-verify.service-sid:}") String serviceSid
    ) {
        this.enabled = enabled;
        this.accountSid = accountSid == null ? "" : accountSid.trim();
        this.authToken = authToken == null ? "" : authToken.trim();
        this.serviceSid = serviceSid == null ? "" : serviceSid.trim();
        this.restClient = RestClient.builder()
            .baseUrl(baseUrl == null || baseUrl.isBlank() ? "https://verify.twilio.com" : baseUrl.trim())
            .build();
    }

    @Override
    public void startSmsVerification(String phoneNumber) {
        ensureConfigured();
        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        body.add("To", phoneNumber);
        body.add("Channel", "sms");
        restClient.post()
            .uri("/v2/Services/{serviceSid}/Verifications", serviceSid)
            .header("Authorization", basicAuthorization())
            .contentType(MediaType.APPLICATION_FORM_URLENCODED)
            .body(body)
            .retrieve()
            .onStatus(HttpStatusCode::isError, (request, response) -> {
                throw new ResponseStatusException(
                    response.getStatusCode(),
                    "No se pudo iniciar la verificacion telefonica."
                );
            })
            .toBodilessEntity();
    }

    @Override
    public boolean checkSmsVerification(String phoneNumber, String code) {
        ensureConfigured();
        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        body.add("To", phoneNumber);
        body.add("Code", code);
        TwilioVerificationCheckResponse response = restClient.post()
            .uri("/v2/Services/{serviceSid}/VerificationCheck", serviceSid)
            .header("Authorization", basicAuthorization())
            .contentType(MediaType.APPLICATION_FORM_URLENCODED)
            .body(body)
            .retrieve()
            .onStatus(HttpStatusCode::isError, (request, httpResponse) -> {
                throw new ResponseStatusException(
                    httpResponse.getStatusCode(),
                    "No se pudo confirmar la verificacion telefonica."
                );
            })
            .body(TwilioVerificationCheckResponse.class);
        return response != null && "approved".equalsIgnoreCase(response.status());
    }

    private void ensureConfigured() {
        if (!enabled || accountSid.isBlank() || authToken.isBlank() || serviceSid.isBlank()) {
            throw new ResponseStatusException(
                org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE,
                "La verificacion telefonica no esta configurada."
            );
        }
    }

    private String basicAuthorization() {
        String raw = accountSid + ":" + authToken;
        return "Basic " + Base64.getEncoder().encodeToString(raw.getBytes(StandardCharsets.UTF_8));
    }

    private record TwilioVerificationCheckResponse(String status) {}
}
