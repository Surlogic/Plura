package com.plura.plurabackend.core.auth.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.plura.plurabackend.core.auth.context.AuthContextDescriptor;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class SelectContextResponse {
    private String accessToken;
    private AuthContextDescriptor activeContext;
}
