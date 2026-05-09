package com.plura.plurabackend.core.auth.dto;

import com.plura.plurabackend.core.auth.context.AuthContextType;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * SelectContextRequest es un DTO de entrada del modulo autenticacion / contratos DTO.
 * Responsabilidad: definir y validar los datos que llegan desde la API.
 * Validacion: sus anotaciones Bean Validation son parte del contrato publico del endpoint que lo recibe.
 * Foco funcional: la responsabilidad indicada por su paquete y nombre.
 */
@Data
public class SelectContextRequest {

    @NotNull
    private AuthContextType type;

    private String workerId;

    private String professionalId;
}
