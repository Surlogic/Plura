package com.plura.plurabackend.professional.worker.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;
import lombok.Data;

/**
 * ProfessionalWorkerServicesUpdateRequest es un DTO de entrada del modulo profesionales / trabajadores / contratos DTO.
 * Responsabilidad: definir y validar los datos que llegan desde la API.
 * Validacion: sus anotaciones Bean Validation son parte del contrato publico del endpoint que lo recibe.
 * Foco funcional: profesionales, servicios, trabajadores.
 */
@Data
public class ProfessionalWorkerServicesUpdateRequest {

    @NotNull
    private List<@Size(max = 36) String> serviceIds;
}
