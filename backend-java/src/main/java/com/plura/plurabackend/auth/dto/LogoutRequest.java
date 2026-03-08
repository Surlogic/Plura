package com.plura.plurabackend.auth.dto;

import lombok.Data;

@Data
public class LogoutRequest {
    private String refreshToken;
}
