package com.plura.plurabackend.professional.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.List;
import lombok.Data;

/**
 * ProfesionalPublicPageUpdateRequest es un DTO de entrada del modulo profesionales / contratos DTO.
 * Responsabilidad: definir y validar los datos que llegan desde la API.
 * Validacion: sus anotaciones Bean Validation son parte del contrato publico del endpoint que lo recibe.
 * Foco funcional: superficie publica.
 */
@Data
public class ProfesionalPublicPageUpdateRequest {
    @Size(max = 160)
    private String headline;

    @Size(max = 3000)
    private String about;

    @Size(max = 10)
    private List<@Pattern(regexp = "^(https?://.+|/uploads/.+|r2://.+|r2:.+)$") String> photos;
}
