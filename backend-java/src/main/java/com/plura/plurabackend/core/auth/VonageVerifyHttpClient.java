package com.plura.plurabackend.core.auth;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.server.ResponseStatusException;

/**
 * Cliente HTTP real para Vonage Verify v2 usando workflow SMS.
 */
@Component
public class VonageVerifyHttpClient implements VonageVerifyClient {

    private final RestClient restClient;
    private final boolean enabled;
    private final String apiKey;
    private final String apiSecret;
    private final String brand;
    private final int codeLength;

    public VonageVerifyHttpClient(
        @Value("${app.auth.vonage-verify.enabled:false}") boolean enabled,
        @Value("${app.auth.vonage-verify.base-url:https://api.nexmo.com}") String baseUrl,
        @Value("${app.auth.vonage-verify.api-key:}") String apiKey,
        @Value("${app.auth.vonage-verify.api-secret:}") String apiSecret,
        @Value("${app.auth.vonage-verify.brand:Plura}") String brand,
        @Value("${app.auth.vonage-verify.code-length:6}") int codeLength
    ) {
        this.enabled = enabled;
        this.apiKey = apiKey == null ? "" : apiKey.trim();
        this.apiSecret = apiSecret == null ? "" : apiSecret.trim();
        this.brand = brand == null || brand.isBlank() ? "Plura" : brand.trim();
        this.codeLength = codeLength;
        this.restClient = RestClient.builder()
            .baseUrl(baseUrl == null || baseUrl.isBlank() ? "https://api.nexmo.com" : baseUrl.trim())
            .build();
    }

    @Override
    public String startSmsVerification(String phoneNumber) {
        ensureConfigured();
        VonageVerificationStartResponse response = restClient.post()
            .uri("/v2/verify")
            .header("Authorization", basicAuthorization())
            .contentType(MediaType.APPLICATION_JSON)
            .body(new VonageVerificationStartRequest(
                brand,
                normalizeCodeLength(),
                List.of(new VonageWorkflowStep("sms", phoneNumber))
            ))
            .retrieve()
            .onStatus(HttpStatusCode::isError, (request, httpResponse) -> {
                throw new ResponseStatusException(
                    httpResponse.getStatusCode(),
                    "No se pudo iniciar la verificacion telefonica."
                );
            })
            .body(VonageVerificationStartResponse.class);
        if (response == null || response.requestId() == null || response.requestId().isBlank()) {
            throw new ResponseStatusException(
                HttpStatus.BAD_GATEWAY,
                "Vonage no devolvio un identificador de verificacion."
            );
        }
        return response.requestId();
    }

    @Override
    public boolean checkSmsVerification(String requestId, String code) {
        ensureConfigured();
        try {
            VonageVerificationCheckResponse response = restClient.post()
                .uri("/v2/verify/{requestId}", requestId)
                .header("Authorization", basicAuthorization())
                .contentType(MediaType.APPLICATION_JSON)
                .body(new VonageVerificationCheckRequest(code))
                .retrieve()
                .onStatus(HttpStatusCode::is5xxServerError, (request, httpResponse) -> {
                    throw new ResponseStatusException(
                        httpResponse.getStatusCode(),
                        "No se pudo confirmar la verificacion telefonica."
                    );
                })
                .body(VonageVerificationCheckResponse.class);
            return response != null && "completed".equalsIgnoreCase(response.status());
        } catch (RestClientResponseException exception) {
            if (exception.getStatusCode().is4xxClientError()) {
                return false;
            }
            throw exception;
        }
    }

    private void ensureConfigured() {
        if (!enabled || apiKey.isBlank() || apiSecret.isBlank()) {
            throw new ResponseStatusException(
                HttpStatus.SERVICE_UNAVAILABLE,
                "La verificacion telefonica no esta configurada."
            );
        }
    }

    private int normalizeCodeLength() {
        if (codeLength < 4 || codeLength > 10) {
            return 6;
        }
        return codeLength;
    }

    private String basicAuthorization() {
        String raw = apiKey + ":" + apiSecret;
        return "Basic " + Base64.getEncoder().encodeToString(raw.getBytes(StandardCharsets.UTF_8));
    }

    private record VonageVerificationStartRequest(
        String brand,
        @JsonProperty("code_length") int codeLength,
        List<VonageWorkflowStep> workflow
    ) {}

    private record VonageWorkflowStep(String channel, String to) {}

    private record VonageVerificationStartResponse(@JsonProperty("request_id") String requestId) {}

    private record VonageVerificationCheckRequest(String code) {}

    private record VonageVerificationCheckResponse(
        @JsonProperty("request_id") String requestId,
        String status
    ) {}
}
