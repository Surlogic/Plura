package com.plura.plurabackend.auth.dto;

import com.plura.plurabackend.users.model.TipoCliente;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class RegisterProfesionalRequest {

    @NotBlank
    @Size(min = 3)
    private String fullName;

    @NotBlank
    private String rubro;

    @NotBlank
    @Email
    private String email;

    @NotBlank
    private String phoneNumber;

    private String location;

    @NotNull
    private TipoCliente tipoCliente;

    @NotBlank
    @Size(min = 6)
    private String password;
}
