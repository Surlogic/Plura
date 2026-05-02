package com.plura.plurabackend.professional.worker.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ProfessionalWorkerInvitationAcceptRequest {

    @Size(max = 255)
    private String token;

    @Size(min = 2, max = 120)
    private String fullName;

    @Size(max = 30)
    @Pattern(regexp = "^[+0-9()\\-\\s]{3,30}$")
    private String phoneNumber;

    @Size(min = 8, max = 100)
    private String password;
}
