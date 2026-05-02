package com.plura.plurabackend.core.auth.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.plura.plurabackend.core.auth.context.AuthContextDescriptor;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class AuthMeResponse {
    private UserResponse user;
    private AuthContextDescriptor activeContext;
    private List<AuthContextDescriptor> contexts;
}
