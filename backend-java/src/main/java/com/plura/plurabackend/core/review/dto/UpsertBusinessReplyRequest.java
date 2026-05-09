package com.plura.plurabackend.core.review.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * UpsertBusinessReplyRequest es un DTO de entrada del modulo resenas / contratos DTO.
 * Responsabilidad: definir y validar los datos que llegan desde la API.
 * Validacion: sus anotaciones Bean Validation son parte del contrato publico del endpoint que lo recibe.
 * Foco funcional: la responsabilidad indicada por su paquete y nombre.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UpsertBusinessReplyRequest {

    @NotBlank
    @Size(max = 2000)
    private String text;
}
