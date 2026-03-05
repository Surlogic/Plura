package com.plura.plurabackend.auth.oauth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class OAuthLoginRequest {

    @NotBlank
    @Size(max = 20)
    private String provider;

    @NotBlank
    @Size(max = 8192)
    private String token;
}
