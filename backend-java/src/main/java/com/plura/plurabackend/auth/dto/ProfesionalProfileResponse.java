package com.plura.plurabackend.auth.dto;

import com.plura.plurabackend.users.model.TipoCliente;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class ProfesionalProfileResponse {
    private String id;
    private String fullName;
    private String email;
    private String phoneNumber;
    private String rubro;
    private String location;
    private TipoCliente tipoCliente;
    private LocalDateTime createdAt;
}
