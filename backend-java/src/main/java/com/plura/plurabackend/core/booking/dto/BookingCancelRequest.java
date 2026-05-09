package com.plura.plurabackend.core.booking.dto;

import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * BookingCancelRequest es un DTO de entrada del modulo reservas / contratos DTO.
 * Responsabilidad: definir y validar los datos que llegan desde la API.
 * Validacion: sus anotaciones Bean Validation son parte del contrato publico del endpoint que lo recibe.
 * Foco funcional: reservas.
 */
@Data
public class BookingCancelRequest {

    @Size(max = 500)
    private String reason;
}
