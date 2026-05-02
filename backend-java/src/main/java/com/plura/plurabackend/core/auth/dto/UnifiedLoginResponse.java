package com.plura.plurabackend.core.auth.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.plura.plurabackend.core.auth.context.AuthContextDescriptor;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class UnifiedLoginResponse {
    private String accessToken;
    private String refreshToken;
    private UserResponse user;
    private AuthSessionResponse session;
    private AuthContextDescriptor activeContext;
    private List<AuthContextDescriptor> contexts;
    private boolean contextSelectionRequired;
}
