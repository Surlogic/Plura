package com.plura.plurabackend.core.auth;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.util.UriComponentsBuilder;

/**
 * Cliente HTTP para Firebase/Identity Platform Phone Auth via REST.
 */
@Component
public class FirebasePhoneVerificationClient {

    private final RestClient restClient;
    private final boolean enabled;
    private final String apiKey;
    private final String recaptchaToken;
    private final String playIntegrityToken;
    private final String captchaResponse;
    private final String tenantId;
    private final String locale;

    public FirebasePhoneVerificationClient(
        @Value("${app.auth.firebase-phone-verification.enabled:false}") boolean enabled,
        @Value("${app.auth.firebase-phone-verification.base-url:https://identitytoolkit.googleapis.com}") String baseUrl,
        @Value("${app.auth.firebase-phone-verification.api-key:}") String apiKey,
        @Value("${app.auth.firebase-phone-verification.recaptcha-token:}") String recaptchaToken,
        @Value("${app.auth.firebase-phone-verification.play-integrity-token:}") String playIntegrityToken,
        @Value("${app.auth.firebase-phone-verification.captcha-response:}") String captchaResponse,
        @Value("${app.auth.firebase-phone-verification.tenant-id:}") String tenantId,
        @Value("${app.auth.firebase-phone-verification.locale:es-419}") String locale
    ) {
        this.enabled = enabled;
        this.apiKey = normalizeBlank(apiKey);
        this.recaptchaToken = normalizeBlank(recaptchaToken);
        this.playIntegrityToken = normalizeBlank(playIntegrityToken);
        this.captchaResponse = normalizeBlank(captchaResponse);
        this.tenantId = normalizeBlank(tenantId);
        this.locale = normalizeBlank(locale) == null ? "es-419" : normalizeBlank(locale);
        this.restClient = RestClient.builder()
            .baseUrl(baseUrl == null || baseUrl.isBlank() ? "https://identitytoolkit.googleapis.com" : baseUrl.trim())
            .build();
    }

    public String startSmsVerification(String phoneNumber) {
        ensureConfigured();
        FirebaseSendCodeResponse response = restClient.post()
            .uri(uri("/v1/accounts:sendVerificationCode"))
            .header("X-Firebase-Locale", locale)
            .contentType(MediaType.APPLICATION_JSON)
            .body(new FirebaseSendCodeRequest(
                phoneNumber,
                recaptchaToken,
                playIntegrityToken,
                captchaResponse,
                tenantId
            ))
            .retrieve()
            .onStatus(HttpStatusCode::isError, (request, httpResponse) -> {
                throw new ResponseStatusException(
                    httpResponse.getStatusCode(),
                    "No se pudo iniciar la verificacion telefonica con Firebase."
                );
            })
            .body(FirebaseSendCodeResponse.class);
        if (response == null || response.sessionInfo() == null || response.sessionInfo().isBlank()) {
            throw new ResponseStatusException(
                HttpStatus.BAD_GATEWAY,
                "Firebase no devolvio una sesion de verificacion."
            );
        }
        return response.sessionInfo();
    }

    public boolean checkSmsVerification(String sessionInfo, String code) {
        ensureConfigured();
        try {
            FirebaseSignInWithPhoneResponse response = restClient.post()
                .uri(uri("/v1/accounts:signInWithPhoneNumber"))
                .header("X-Firebase-Locale", locale)
                .contentType(MediaType.APPLICATION_JSON)
                .body(new FirebaseSignInWithPhoneRequest(sessionInfo, code, tenantId))
                .retrieve()
                .onStatus(HttpStatusCode::is5xxServerError, (request, httpResponse) -> {
                    throw new ResponseStatusException(
                        httpResponse.getStatusCode(),
                        "No se pudo confirmar la verificacion telefonica con Firebase."
                    );
                })
                .body(FirebaseSignInWithPhoneResponse.class);
            return response != null && response.phoneNumber() != null && !response.phoneNumber().isBlank();
        } catch (RestClientResponseException exception) {
            if (exception.getStatusCode().is4xxClientError()) {
                return false;
            }
            throw exception;
        }
    }

    private void ensureConfigured() {
        if (!enabled || apiKey == null) {
            throw new ResponseStatusException(
                HttpStatus.SERVICE_UNAVAILABLE,
                "Firebase Phone Verification no esta configurado."
            );
        }
        if (recaptchaToken == null && playIntegrityToken == null && captchaResponse == null) {
            throw new ResponseStatusException(
                HttpStatus.SERVICE_UNAVAILABLE,
                "Firebase Phone Verification requiere recaptchaToken, playIntegrityToken o captchaResponse."
            );
        }
    }

    private String uri(String path) {
        return UriComponentsBuilder
            .fromPath(path)
            .queryParam("key", apiKey)
            .build()
            .toUriString();
    }

    private String normalizeBlank(String value) {
        if (value == null || value.trim().isBlank()) {
            return null;
        }
        return value.trim();
    }

    private record FirebaseSendCodeRequest(
        String phoneNumber,
        @JsonInclude(JsonInclude.Include.NON_NULL) String recaptchaToken,
        @JsonInclude(JsonInclude.Include.NON_NULL) String playIntegrityToken,
        @JsonInclude(JsonInclude.Include.NON_NULL) String captchaResponse,
        @JsonInclude(JsonInclude.Include.NON_NULL) String tenantId
    ) {}

    private record FirebaseSendCodeResponse(@JsonProperty("sessionInfo") String sessionInfo) {}

    private record FirebaseSignInWithPhoneRequest(
        String sessionInfo,
        String code,
        @JsonInclude(JsonInclude.Include.NON_NULL) String tenantId
    ) {}

    private record FirebaseSignInWithPhoneResponse(@JsonProperty("phoneNumber") String phoneNumber) {}
}
