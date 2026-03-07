package com.plura.plurabackend.auth.oauth.dto;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class OAuthLoginRequest {

    @NotBlank
    @Size(max = 20)
    private String provider;

    @Size(max = 8192)
    private String token;

    @Size(max = 8192)
    private String authorizationCode;

    @Size(max = 1024)
    private String codeVerifier;

    @Size(max = 2048)
    private String redirectUri;

    @Pattern(regexp = "^(USER|PROFESSIONAL)$", message = "desiredRole inválido")
    private String desiredRole;

    @Pattern(regexp = "^(LOGIN|REGISTER)$", message = "authAction inválido")
    private String authAction;

    @AssertTrue(message = "Debe enviar token o authorizationCode")
    public boolean isTokenOrCodePresent() {
        return hasText(token) || hasText(authorizationCode);
    }

    private boolean hasText(String value) {
        return value != null && !value.trim().isEmpty();
    }
}
