package com.plura.plurabackend.auth.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class RegisterResponse {
    private String accessToken;
    private UserResponse user;
}
