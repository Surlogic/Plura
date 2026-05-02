package com.plura.plurabackend.core.auth.dto;

import com.plura.plurabackend.core.auth.context.AuthContextType;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class SelectContextRequest {

    @NotNull
    private AuthContextType type;

    private String workerId;

    private String professionalId;
}
