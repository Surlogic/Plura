package com.plura.plurabackend.professional.worker.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * ProfessionalWorkerInvitationAcceptRequest es un DTO de entrada del modulo profesionales / trabajadores / contratos DTO.
 * Responsabilidad: definir y validar los datos que llegan desde la API.
 * Validacion: sus anotaciones Bean Validation son parte del contrato publico del endpoint que lo recibe.
 * Foco funcional: profesionales, trabajadores.
 */
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
