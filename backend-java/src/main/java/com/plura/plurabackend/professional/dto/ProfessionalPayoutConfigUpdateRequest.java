package com.plura.plurabackend.professional.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ProfessionalPayoutConfigUpdateRequest {

    @Size(max = 120)
    @Pattern(regexp = "^(|[\\p{L} .'-]{2,120})$")
    private String firstName;

    @Size(max = 120)
    @Pattern(regexp = "^(|[\\p{L} .'-]{2,120})$")
    private String lastName;

    @Size(max = 2)
    @Pattern(regexp = "^(|[A-Za-z]{2})$")
    private String country;

    @Size(max = 30)
    @Pattern(regexp = "^(|[A-Za-z0-9_\\- ]{2,30})$")
    private String documentType;

    @Size(max = 64)
    @Pattern(regexp = "^(|[A-Za-z0-9./\\-\\s]{3,64})$")
    private String documentNumber;

    @Size(max = 30)
    @Pattern(regexp = "^(|[+0-9()\\-\\s]{3,30})$")
    private String phone;

    @Size(max = 20)
    @Pattern(regexp = "^(|[A-Za-z0-9._\\-/\\s]{2,20})$")
    private String bank;

    @Size(max = 64)
    @Pattern(regexp = "^(|[A-Za-z0-9\\-\\s]{4,64})$")
    private String accountNumber;

    @Size(max = 20)
    @Pattern(regexp = "^(|[A-Za-z0-9_\\-\\s]{2,20})$")
    private String accountType;

    @Size(max = 20)
    @Pattern(regexp = "^(|[A-Za-z0-9._\\-/\\s]{2,20})$")
    private String branch;
}
