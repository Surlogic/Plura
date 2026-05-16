package com.plura.plurabackend.core.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class RegistrationPhoneVerificationConfirmRequest {

    @NotBlank
    @Size(max = 40)
    private String phoneNumber;

    @NotBlank
    @Pattern(regexp = "^\\d{4,10}$")
    private String code;
}
