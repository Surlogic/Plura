package com.plura.plurabackend.professional.worker.dto;

import com.plura.plurabackend.professional.worker.model.ProfessionalWorkerStatus;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * ProfessionalWorkerUpdateRequest es un DTO de entrada del modulo profesionales / trabajadores / contratos DTO.
 * Responsabilidad: definir y validar los datos que llegan desde la API.
 * Validacion: sus anotaciones Bean Validation son parte del contrato publico del endpoint que lo recibe.
 * Foco funcional: profesionales, trabajadores.
 */
@Data
public class ProfessionalWorkerUpdateRequest {

    @Size(max = 255)
    private String displayName;

    private ProfessionalWorkerStatus status;
}
