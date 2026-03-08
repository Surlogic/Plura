package com.plura.plurabackend.auth.dto;

import lombok.Data;

@Data
public class RefreshSessionRequest {
    private String refreshToken;
}
