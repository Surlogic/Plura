package com.plura.plurabackend.core.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class PasswordRecoveryConfirmRequest {

    @NotBlank
    @Email
    @Size(max = 255)
    private String email;

    @NotBlank
    @Size(max = 40)
    private String phoneNumber;

    @NotBlank
    @Size(max = 36)
    private String challengeId;

    @NotBlank
    @Size(max = 12)
    private String code;

    @NotBlank
    @Size(max = 255)
    private String newPassword;

    @NotBlank
    @Size(max = 255)
    private String confirmPassword;
}
