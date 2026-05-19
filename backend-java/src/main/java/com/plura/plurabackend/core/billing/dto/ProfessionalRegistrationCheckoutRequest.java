package com.plura.plurabackend.core.billing.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ProfessionalRegistrationCheckoutRequest {

    @NotBlank
    private String planCode;

    @NotBlank
    @Email
    @Size(max = 255)
    private String email;

    @Size(max = 1024)
    private String returnUrl;
}
