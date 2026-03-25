package com.plura.plurabackend.core.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CompleteOAuthPhoneRequest {

    @NotBlank
    @Size(max = 40)
    private String phoneNumber;
}
