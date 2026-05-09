package com.plura.plurabackend.core.booking.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * PublicBookingRequest es un DTO de entrada del modulo reservas / contratos DTO.
 * Responsabilidad: definir y validar los datos que llegan desde la API.
 * Validacion: sus anotaciones Bean Validation son parte del contrato publico del endpoint que lo recibe.
 * Foco funcional: reservas, superficie publica.
 */
@Data
public class PublicBookingRequest {

    @NotBlank
    @Size(max = 36)
    private String serviceId;

    @NotBlank
    @Pattern(regexp = "^\\d{4}-\\d{2}-\\d{2}T.*$")
    private String startDateTime;
}
