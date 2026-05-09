package com.plura.plurabackend.core.feedback.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * CreateAppFeedbackRequest es un DTO de entrada del modulo feedback / contratos DTO.
 * Responsabilidad: definir y validar los datos que llegan desde la API.
 * Validacion: sus anotaciones Bean Validation son parte del contrato publico del endpoint que lo recibe.
 * Foco funcional: feedback.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateAppFeedbackRequest {

    @NotNull
    @Min(1)
    @Max(5)
    private Integer rating;

    @Size(max = 2000)
    private String text;

    private String category;

    @Size(max = 100)
    private String contextSource;
}
